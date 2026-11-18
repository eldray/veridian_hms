'use strict';
// pki.cjs - a tiny private certificate authority for Veridian HMS.
//
// WHY: in LAN mode the server talks to other PCs over the hospital network. Without TLS, passwords, tokens and
// patient data cross it in clear text. A public certificate (Let's Encrypt) needs a domain and internet, which a
// hospital LAN does not have, so each installation makes its OWN certificate authority (CA). The server proves
// who it is with a certificate signed by that CA, and the client app pins that CA (see main.cjs), so a stranger
// on the network cannot pose as the server.
//
// DESIGN CHOICES
//  - No third-party package. This only ENCODES a certificate (standard DER); every key operation and signature is
//    done by Node's crypto, and every check is done by Node's X509Certificate or by Chromium. The shell's installer
//    config cannot be test-built here, so a new dependency would be an unverified risk. A bug in this encoder can
//    only make a certificate be REJECTED (fail closed); it cannot weaken a check. tests/pki.test.ts validates the
//    output against OpenSSL, Node and a real TLS handshake.
//  - ECDSA P-256 + SHA-256: fast to generate (RSA keys take seconds), small, accepted by every TLS stack.
//  - The CA lives for 10 years, a server certificate for 1 year and is re-issued automatically (needsReissue), for
//    example when the PC's address changes, without the clients having to pair again (they pin the CA).

const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

const OID = {
  ecdsaWithSha256: '1.2.840.10045.4.3.2',
  commonName: '2.5.4.3',
  organization: '2.5.4.10',
  subjectKeyIdentifier: '2.5.29.14',
  keyUsage: '2.5.29.15',
  subjectAltName: '2.5.29.17',
  basicConstraints: '2.5.29.19',
  authorityKeyIdentifier: '2.5.29.35',
  extendedKeyUsage: '2.5.29.37',
  serverAuth: '1.3.6.1.5.5.7.3.1',
};

// ---------------------------------------------------------------- DER encoding
function derLength(n) {
  if (n < 0x80) return Buffer.from([n]);
  const bytes = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) bytes.unshift(v & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
const tlv = (tag, body) => Buffer.concat([Buffer.from([tag]), derLength(body.length), body]);
const seq = (...parts) => tlv(0x30, Buffer.concat(parts));
const set = (...parts) => tlv(0x31, Buffer.concat(parts));
const explicit = (n, body) => tlv(0xa0 | n, body);
const octets = (buf) => tlv(0x04, buf);
const bool = (v) => tlv(0x01, Buffer.from([v ? 0xff : 0x00]));
const utf8 = (s) => tlv(0x0c, Buffer.from(String(s), 'utf8'));
const bitString = (buf, unused = 0) => tlv(0x03, Buffer.concat([Buffer.from([unused]), buf]));

function integer(buf) {
  let b = Buffer.from(buf);
  while (b.length > 1 && b[0] === 0) b = b.subarray(1);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]); // keep it positive
  return tlv(0x02, b);
}

function base128(n) {
  const out = [n & 0x7f];
  for (n = Math.floor(n / 128); n > 0; n = Math.floor(n / 128)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
function oid(dotted) {
  const arcs = dotted.split('.').map(Number);
  return tlv(0x06, Buffer.from([40 * arcs[0] + arcs[1], ...arcs.slice(2).flatMap(base128)]));
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
function time(date) {
  const y = date.getUTCFullYear();
  const rest = `${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  // RFC 5280: UTCTime up to 2049, GeneralizedTime from 2050
  return y < 2050 ? tlv(0x17, Buffer.from(`${pad(y % 100)}${rest}`)) : tlv(0x18, Buffer.from(`${y}${rest}`));
}

function name(commonName, organization) {
  const rdns = [];
  if (organization) rdns.push(set(seq(oid(OID.organization), utf8(organization))));
  rdns.push(set(seq(oid(OID.commonName), utf8(commonName))));
  return seq(...rdns);
}

function extension(oidStr, critical, valueDer) {
  return seq(oid(oidStr), ...(critical ? [bool(true)] : []), octets(valueDer));
}

// keyUsage bit positions (RFC 5280)
const KEY_USAGE = { digitalSignature: 0, keyCertSign: 5, cRLSign: 6 };
function keyUsageValue(...usages) {
  let byte = 0;
  let highest = 0;
  for (const u of usages) { byte |= 0x80 >> KEY_USAGE[u]; highest = Math.max(highest, KEY_USAGE[u]); }
  return bitString(Buffer.from([byte]), 7 - highest);
}

function ipv4Bytes(ip) {
  if (!net.isIPv4(ip)) throw new Error(`Only IPv4 addresses can be put in a certificate here: ${ip}`);
  return Buffer.from(ip.split('.').map(Number));
}
function subjectAltNameValue(dnsNames, ipAddresses) {
  const names = [
    ...dnsNames.map((d) => tlv(0x82, Buffer.from(d, 'ascii'))), // dNSName [2]
    ...ipAddresses.map((ip) => tlv(0x87, ipv4Bytes(ip))), // iPAddress [7]
  ];
  return seq(...names);
}

// ---------------------------------------------------------------- DER reading (just enough)
function readTlv(buf, offset = 0) {
  const tag = buf[offset];
  let len = buf[offset + 1];
  let p = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[p++];
  }
  return { tag, raw: buf.subarray(offset, p + len), body: buf.subarray(p, p + len), next: p + len };
}
function children(body) {
  const out = [];
  for (let o = 0; o < body.length;) { const t = readTlv(body, o); out.push(t); o = t.next; }
  return out;
}
// The parts of a certificate we copy into the next one. Our own certificates are always v3.
function certParts(certPem) {
  const der = pemToDer(certPem);
  const tbs = children(readTlv(der).body)[0];
  const f = children(tbs.body);
  if (f[0].tag !== 0xa0) throw new Error('Unsupported certificate (expected X.509 v3).');
  return { subject: f[5].raw, spki: f[6].raw };
}
function keyIdentifier(spkiDer) {
  const keyBits = children(readTlv(spkiDer).body)[1].body.subarray(1); // BIT STRING content without the unused-bits byte
  return crypto.createHash('sha1').update(keyBits).digest();
}

// ---------------------------------------------------------------- PEM
function derToPem(der, label = 'CERTIFICATE') {
  const b64 = Buffer.from(der).toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}
function pemToDer(pem) {
  const m = /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/.exec(String(pem));
  if (!m) throw new Error('Not a PEM certificate.');
  return Buffer.from(m[1].replace(/\s+/g, ''), 'base64');
}
function splitPem(bundle) {
  return (String(bundle).match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || []).map((p) => p + '\n');
}

// ---------------------------------------------------------------- certificate building
function buildCertificate({ issuer, subject, spki, notBefore, notAfter, extensions, signingKey }) {
  const serial = crypto.randomBytes(16);
  serial[0] &= 0x7f; // positive
  const sigAlg = seq(oid(OID.ecdsaWithSha256)); // no parameters for ECDSA
  const tbs = seq(
    explicit(0, integer(Buffer.from([2]))), // version: v3
    integer(serial),
    sigAlg,
    issuer,
    seq(time(notBefore), time(notAfter)),
    subject,
    spki,
    explicit(3, seq(...extensions)),
  );
  const signature = crypto.sign('sha256', tbs, { key: signingKey, dsaEncoding: 'der' });
  return seq(tbs, sigAlg, bitString(signature));
}

function newKeyPair() {
  return crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
}

/** A new private CA. Returns PEMs; keep keyPem secret (it can issue certificates that the clients will trust). */
function createCa({ commonName = 'Veridian HMS Private CA', organization = 'Veridian HMS', days = 3650, now = new Date() } = {}) {
  const { publicKey, privateKey } = newKeyPair();
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const subject = name(commonName, organization);
  const der = buildCertificate({
    issuer: subject,
    subject,
    spki,
    notBefore: new Date(now.getTime() - 5 * 60_000),
    notAfter: new Date(now.getTime() + days * 86_400_000),
    extensions: [
      extension(OID.basicConstraints, true, seq(bool(true), integer(Buffer.from([0])))), // CA, may sign servers only
      extension(OID.keyUsage, true, keyUsageValue('keyCertSign', 'cRLSign')),
      extension(OID.subjectKeyIdentifier, false, octets(keyIdentifier(spki))),
    ],
    signingKey: privateKey,
  });
  return { certPem: derToPem(der), keyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
}

/** A server certificate signed by the CA. dnsNames and ipAddresses become the names the certificate is valid for. */
function issueServerCert({ caCertPem, caKeyPem, dnsNames = [], ipAddresses = [], commonName, days = 365, now = new Date() }) {
  if (!dnsNames.length && !ipAddresses.length) throw new Error('A server certificate needs at least one name or address.');
  const ca = certParts(caCertPem);
  const { publicKey, privateKey } = newKeyPair();
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const der = buildCertificate({
    issuer: ca.subject, // byte-for-byte the CA's subject, so the names chain
    subject: name(commonName || dnsNames[0] || ipAddresses[0]),
    spki,
    notBefore: new Date(now.getTime() - 5 * 60_000),
    notAfter: new Date(now.getTime() + days * 86_400_000),
    extensions: [
      extension(OID.basicConstraints, true, seq()), // not a CA
      extension(OID.keyUsage, true, keyUsageValue('digitalSignature')),
      extension(OID.extendedKeyUsage, false, seq(oid(OID.serverAuth))),
      extension(OID.subjectAltName, false, subjectAltNameValue(dnsNames, ipAddresses)),
      extension(OID.subjectKeyIdentifier, false, octets(keyIdentifier(spki))),
      extension(OID.authorityKeyIdentifier, false, seq(tlv(0x80, keyIdentifier(ca.spki)))),
    ],
    signingKey: crypto.createPrivateKey(caKeyPem),
  });
  return { certPem: derToPem(der), keyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
}

// ---------------------------------------------------------------- inspecting and checking
/** Full SHA-256 of the certificate, lowercase hex. */
function fingerprintSha256(certPem) {
  return crypto.createHash('sha256').update(pemToDer(certPem)).digest('hex');
}
/** The short, readable form two people compare out loud: the first 96 bits as A1B2-C3D4-E5F6-0718-293A-4B5C. */
function formatFingerprint(hex) {
  return hex.slice(0, 24).toUpperCase().match(/.{4}/g).join('-');
}

function namesOf(x509) {
  const dns = [];
  const ip = [];
  for (const part of String(x509.subjectAltName || '').split(/,\s*/)) {
    if (part.startsWith('DNS:')) dns.push(part.slice(4));
    else if (part.startsWith('IP Address:')) ip.push(part.slice(11));
  }
  return { dns: dns.sort(), ip: ip.sort() };
}
function certInfo(certPem) {
  const x = new crypto.X509Certificate(certPem);
  return { notBefore: new Date(x.validFrom), notAfter: new Date(x.validTo), isCa: x.ca, names: namesOf(x), fingerprint: fingerprintSha256(certPem) };
}

/** True when the certificate has to be replaced: unreadable, wrong names, not valid now, or expiring soon. */
function needsReissue({ certPem, dnsNames = [], ipAddresses = [], now = new Date(), minDaysLeft = 30 }) {
  try {
    const info = certInfo(certPem);
    const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    if (!same(info.names.dns, dnsNames) || !same(info.names.ip, ipAddresses)) return true;
    if (now < info.notBefore) return true;
    return info.notAfter.getTime() - now.getTime() < minDaysLeft * 86_400_000;
  } catch {
    return true;
  }
}

/**
 * Is `leafPem` a currently valid server certificate for `host`, issued by exactly the pinned CA?
 * Every check is Node's own X509 implementation; nothing is trusted just because the server said so.
 */
function verifyServerCertificate({ leafPem, caPem, host, now = new Date() }) {
  const fail = (reason) => ({ ok: false, reason });
  try {
    const leaf = new crypto.X509Certificate(leafPem);
    const ca = new crypto.X509Certificate(caPem);
    if (!ca.ca) return fail('The pinned certificate is not a certificate authority.');
    if (leaf.ca) return fail('The server presented a certificate authority certificate instead of a server certificate.');
    if (!leaf.checkIssued(ca)) return fail('The server certificate was not issued by the pinned authority.');
    if (!leaf.verify(ca.publicKey)) return fail('The server certificate signature does not verify against the pinned authority.');
    for (const [label, c] of [['server', leaf], ['authority', ca]]) {
      if (now < new Date(c.validFrom)) return fail(`The ${label} certificate is not valid yet. Check this PC's clock.`);
      if (now > new Date(c.validTo)) return fail(`The ${label} certificate has expired.`);
    }
    if (!(leaf.keyUsage || []).includes(OID.serverAuth)) return fail('The certificate is not meant for a server.');
    const matches = net.isIP(host) ? leaf.checkIP(host) : leaf.checkHost(host, { subject: 'never', wildcards: false });
    if (!matches) return fail(`The certificate is not valid for "${host}".`);
    return { ok: true };
  } catch (e) {
    return fail(`The certificate could not be checked: ${e.message}`);
  }
}

/** From the chain a server sent, pick the self-signed CA (the one clients pin). Returns its PEM or null. */
function selectCaFromChain(chainPems) {
  for (const pem of chainPems) {
    try {
      const c = new crypto.X509Certificate(pem);
      if (c.ca && c.checkIssued(c) && c.verify(c.publicKey)) return pem;
    } catch { /* not a certificate */ }
  }
  return null;
}

/**
 * Connects to a server WITHOUT trusting anything and returns the certificates it presents (leaf first), as PEMs.
 * Used once, to pair a client: the person then confirms the authority's fingerprint against the one shown on the
 * server PC. Nothing sent over this connection is used; it only reads the certificates.
 */
function fetchServerChain({ host, port, timeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), servername: net.isIP(host) ? undefined : host, rejectUnauthorized: false }, () => {
      const chain = [];
      const seen = new Set();
      for (let c = socket.getPeerCertificate(true); c && c.raw && !seen.has(c.fingerprint256); c = c.issuerCertificate) {
        seen.add(c.fingerprint256);
        chain.push(derToPem(c.raw));
      }
      socket.end();
      resolve(chain);
    });
    socket.setTimeout(timeoutMs, () => socket.destroy(Object.assign(new Error('The server did not answer in time.'), { code: 'ETIMEDOUT' })));
    socket.on('error', reject);
  });
}

module.exports = {
  fetchServerChain,
  createCa, issueServerCert, needsReissue, verifyServerCertificate, selectCaFromChain,
  certInfo, fingerprintSha256, formatFingerprint, splitPem, derToPem, pemToDer, OID,
};
