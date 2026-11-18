// pki.cjs makes the private certificate authority that protects LAN mode. A certificate mistake must FAIL CLOSED, so
// this tests the attack cases as hard as the happy path, and checks the encoder against independent implementations:
// OpenSSL, Node's X509 parser and a real TLS handshake.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const pki = createRequire(import.meta.url)('../../pki.cjs');

const NAMES = { dnsNames: ['localhost', 'HOSPITAL-PC'], ipAddresses: ['127.0.0.1', '192.168.1.10'] };
const DAY = 86_400_000;
let ca: { certPem: string; keyPem: string };
let leaf: { certPem: string; keyPem: string };
let evil: { certPem: string; keyPem: string };   // another CA that has the SAME name as the real one

beforeAll(() => {
  ca = pki.createCa();
  leaf = pki.issueServerCert({ caCertPem: ca.certPem, caKeyPem: ca.keyPem, ...NAMES });
  evil = pki.createCa();                           // same default commonName + organization: identical names, different key
});

const verify = (over: Record<string, unknown> = {}) =>
  pki.verifyServerCertificate({ leafPem: leaf.certPem, caPem: ca.certPem, host: '192.168.1.10', ...over });

describe('the certificate authority', () => {
  it('is a self-signed CA that can only sign servers', () => {
    const info = pki.certInfo(ca.certPem);
    expect(info.isCa).toBe(true);
    const x = new (require('node:crypto').X509Certificate)(ca.certPem);
    expect(x.checkIssued(x)).toBe(true);
    expect(x.verify(x.publicKey)).toBe(true);
    expect(info.notAfter.getTime() - Date.now()).toBeGreaterThan(3600 * DAY);        // about 10 years
  });
  it('has a stable fingerprint in the readable form people compare', () => {
    const hex = pki.fingerprintSha256(ca.certPem);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
    expect(pki.formatFingerprint(hex)).toMatch(/^([0-9A-F]{4}-){5}[0-9A-F]{4}$/);
    expect(pki.fingerprintSha256(ca.certPem)).toBe(hex);
    expect(pki.fingerprintSha256(evil.certPem)).not.toBe(hex);
  });
});

describe('the server certificate', () => {
  it('lists exactly the names and addresses it was issued for, and is not a CA', () => {
    const info = pki.certInfo(leaf.certPem);
    expect(info.names).toEqual({ dns: ['HOSPITAL-PC', 'localhost'], ip: ['127.0.0.1', '192.168.1.10'] });
    expect(info.isCa).toBe(false);
    const days = (info.notAfter.getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(360); expect(days).toBeLessThan(366);
  });
  it('needs at least one name or address, and only IPv4 is supported', () => {
    expect(() => pki.issueServerCert({ caCertPem: ca.certPem, caKeyPem: ca.keyPem })).toThrow(/at least one/);
    expect(() => pki.issueServerCert({ caCertPem: ca.certPem, caKeyPem: ca.keyPem, ipAddresses: ['::1'] })).toThrow(/IPv4/);
  });
  it('gets a different serial number every time', () => {
    const a = new (require('node:crypto').X509Certificate)(leaf.certPem).serialNumber;
    const b = new (require('node:crypto').X509Certificate)(pki.issueServerCert({ caCertPem: ca.certPem, caKeyPem: ca.keyPem, ...NAMES }).certPem).serialNumber;
    expect(a).not.toBe(b);
  });
});

describe('verifyServerCertificate: accepts only the right server', () => {
  it('accepts the real certificate for each name and address it covers (case-insensitive for names)', () => {
    for (const host of ['192.168.1.10', '127.0.0.1', 'localhost', 'HOSPITAL-PC', 'hospital-pc']) expect(verify({ host })).toEqual({ ok: true });
  });
  it('rejects a host the certificate was not issued for', () => {
    expect(verify({ host: '192.168.1.99' }).ok).toBe(false);
    expect(verify({ host: 'other-pc' }).ok).toBe(false);
    expect(verify({ host: 'sub.localhost' }).ok).toBe(false);                          // no wildcard guessing
  });
  it('rejects a certificate issued by a DIFFERENT authority', () => {
    const r = verify({ caPem: evil.certPem });
    expect(r.ok).toBe(false);
  });
  it('rejects a look-alike authority with the SAME NAME (the signature, not the name, is what counts)', () => {
    const forged = pki.issueServerCert({ caCertPem: evil.certPem, caKeyPem: evil.keyPem, ...NAMES });
    const r = verify({ leafPem: forged.certPem });                                     // pinned CA is the real one
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not issued by|signature/i);
  });
  it('rejects a certificate with one byte changed', () => {
    const der = Buffer.from(pki.pemToDer(leaf.certPem));
    der[der.length - 5] ^= 0xff;                                                       // inside the signature
    expect(verify({ leafPem: pki.derToPem(der) }).ok).toBe(false);
    const der2 = Buffer.from(pki.pemToDer(leaf.certPem));
    der2[60] ^= 0x01;                                                                  // inside the signed body
    expect(verify({ leafPem: pki.derToPem(der2) }).ok).toBe(false);
  });
  it('rejects an expired certificate and one that is not valid yet', () => {
    expect(verify({ now: new Date(Date.now() + 400 * DAY) })).toMatchObject({ ok: false, reason: expect.stringMatching(/expired/) });
    expect(verify({ now: new Date(Date.now() - 2 * DAY) })).toMatchObject({ ok: false, reason: expect.stringMatching(/not valid yet/) });
  });
  it('rejects the CA certificate used as if it were the server, and a leaf pinned as if it were the CA', () => {
    expect(verify({ leafPem: ca.certPem }).ok).toBe(false);
    expect(verify({ caPem: leaf.certPem }).ok).toBe(false);
  });
  it('rejects garbage without throwing', () => {
    expect(verify({ leafPem: 'not a certificate' }).ok).toBe(false);
    expect(verify({ caPem: '' }).ok).toBe(false);
  });
});

describe('needsReissue', () => {
  const base = () => ({ certPem: leaf.certPem, ...NAMES });
  it('keeps a certificate whose names match, whatever their order', () => {
    expect(pki.needsReissue(base())).toBe(false);
    expect(pki.needsReissue({ ...base(), ipAddresses: ['192.168.1.10', '127.0.0.1'], dnsNames: ['HOSPITAL-PC', 'localhost'] })).toBe(false);
  });
  it('replaces it when the PC gets a new address (DHCP), loses one, or gains a name', () => {
    expect(pki.needsReissue({ ...base(), ipAddresses: ['127.0.0.1', '192.168.1.77'] })).toBe(true);
    expect(pki.needsReissue({ ...base(), ipAddresses: ['127.0.0.1'] })).toBe(true);
    expect(pki.needsReissue({ ...base(), dnsNames: ['localhost', 'HOSPITAL-PC', 'NEW-NAME'] })).toBe(true);
  });
  it('replaces it when it is about to expire, already expired, or unreadable', () => {
    expect(pki.needsReissue({ ...base(), now: new Date(Date.now() + 340 * DAY) })).toBe(true);   // under 30 days left
    expect(pki.needsReissue({ ...base(), now: new Date(Date.now() + 400 * DAY) })).toBe(true);
    expect(pki.needsReissue({ ...base(), certPem: 'garbage' })).toBe(true);
  });
});

describe('independent implementations agree', () => {
  const hasOpenssl = spawnSync('openssl', ['version']).status === 0;
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pki-'));
    fs.writeFileSync(path.join(dir, 'ca.pem'), ca.certPem);
    fs.writeFileSync(path.join(dir, 'evil.pem'), evil.certPem);
    fs.writeFileSync(path.join(dir, 'leaf.pem'), leaf.certPem);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  const openssl = (...a: string[]) => spawnSync('openssl', a, { cwd: dir, encoding: 'utf8' });

  it.skipIf(!hasOpenssl)('OpenSSL accepts the chain as a TLS server certificate for each address', () => {
    for (const ip of ['192.168.1.10', '127.0.0.1']) {
      const r = openssl('verify', '-CAfile', 'ca.pem', '-purpose', 'sslserver', '-verify_ip', ip, 'leaf.pem');
      expect(r.stdout + r.stderr).toMatch(/leaf.pem: OK/);
    }
  });
  it.skipIf(!hasOpenssl)('OpenSSL rejects the wrong address and the wrong authority', () => {
    expect(openssl('verify', '-CAfile', 'ca.pem', '-purpose', 'sslserver', '-verify_ip', '10.9.9.9', 'leaf.pem').status).not.toBe(0);
    expect(openssl('verify', '-CAfile', 'evil.pem', 'leaf.pem').status).not.toBe(0);
  });
  it.skipIf(!hasOpenssl)('OpenSSL reads the extensions we meant to write', () => {
    const text = openssl('x509', '-in', 'leaf.pem', '-noout', '-text').stdout;
    expect(text).toMatch(/ecdsa-with-SHA256/);
    expect(text).toMatch(/CA:FALSE/);
    expect(text).toMatch(/TLS Web Server Authentication/);
    expect(text).toMatch(/DNS:localhost, DNS:HOSPITAL-PC, IP Address:127\.0\.0\.1, IP Address:192\.168\.1\.10/);
    const caText = openssl('x509', '-in', 'ca.pem', '-noout', '-text').stdout;
    expect(caText).toMatch(/CA:TRUE, pathlen:0/);
    expect(caText).toMatch(/Certificate Sign, CRL Sign/);
  });
});

describe('a real TLS handshake', () => {
  let server: https.Server; let port: number;
  beforeAll(async () => {
    server = https.createServer({ key: leaf.keyPem, cert: leaf.certPem + ca.certPem, minVersion: 'TLSv1.2' }, (_q, r) => r.end('secure ok'));
    await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));
    port = (server.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((res) => { server.closeAllConnections(); server.close(() => res()); }));

  const get = (opts: https.RequestOptions) => new Promise<string>((resolve, reject) => {
    https.get({ host: '127.0.0.1', port, path: '/', agent: false, ...opts }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => resolve(d)); }).on('error', reject);
  });

  it('a client that pins the CA connects and reads the response', async () => {
    expect(await get({ ca: ca.certPem })).toBe('secure ok');
  });
  it('a client that pins a different authority is refused', async () => {
    await expect(get({ ca: evil.certPem })).rejects.toThrow(/self-signed|unable to (get|verify)|certificate/i);
  });
  it('a client with no pin at all is refused (the certificate is not publicly trusted)', async () => {
    await expect(get({})).rejects.toThrow(/self-signed|unable to (get|verify)|certificate/i);
  });
  it('the right authority still does not make the wrong NAME acceptable', async () => {
    await expect(get({ ca: ca.certPem, servername: 'other.example' })).rejects.toThrow(/altname|does not match|certificate/i);
  });
  it('pairing: fetchServerChain returns the server and its authority, and the CA is picked out of the chain', async () => {
    const chain = await pki.fetchServerChain({ host: '127.0.0.1', port });
    expect(chain.length).toBe(2);
    const picked = pki.selectCaFromChain(chain);
    expect(picked).not.toBeNull();
    expect(pki.fingerprintSha256(picked)).toBe(pki.fingerprintSha256(ca.certPem));
    expect(pki.verifyServerCertificate({ leafPem: chain[0], caPem: picked, host: '127.0.0.1' })).toEqual({ ok: true });
    expect(pki.selectCaFromChain([chain[0]])).toBeNull();                              // a server that sent no authority cannot be paired
  });
  it('fetchServerChain reports an unreachable server instead of hanging', async () => {
    await expect(pki.fetchServerChain({ host: '127.0.0.1', port: 1, timeoutMs: 1000 })).rejects.toThrow();
  });
});
