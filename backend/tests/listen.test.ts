// utils/listen.ts decides where the API listens and whether it speaks TLS. The rules that matter most are the ones
// that stop patient data going out in clear text: half a TLS setup is an error, never a silent downgrade, and the
// desktop app never serves plain HTTP on anything but loopback.
import { createRequire } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import express from 'express';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { parseListenConfig, startListeners, type Listeners } from '../src/utils/listen';

const pki = createRequire(import.meta.url)('../../pki.cjs');
let ca: { certPem: string; keyPem: string };
let leaf: { certPem: string; keyPem: string };
beforeAll(() => {
  ca = pki.createCa();
  leaf = pki.issueServerCert({ caCertPem: ca.certPem, caKeyPem: ca.keyPem, ipAddresses: ['127.0.0.1', '127.0.0.2'], dnsNames: ['localhost'] });
});

const freePort = () => new Promise<number>((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); }); });
const app = express();
app.get('/ping', (_q, r) => r.send('pong'));

describe('parseListenConfig', () => {
  it('uses the defaults in development (nothing set): all interfaces, plain HTTP, port 5000', () => {
    expect(parseListenConfig({})).toEqual({ port: 5000, hosts: undefined, tls: undefined });
  });
  it('reads PORT, a LISTEN_HOSTS list (trimmed, de-duplicated) and the TLS pair', () => {
    const c = parseListenConfig({ PORT: '5600', LISTEN_HOSTS: ' 127.0.0.1 , 192.168.1.10,127.0.0.1', TLS_CERT_PEM: 'C', TLS_KEY_PEM: 'K', ELECTRON: 'true' });
    expect(c).toEqual({ port: 5600, hosts: ['127.0.0.1', '192.168.1.10'], tls: { cert: 'C', key: 'K' } });
  });
  it('falls back to HOST when LISTEN_HOSTS is not set', () => {
    expect(parseListenConfig({ HOST: '127.0.0.1' }).hosts).toEqual(['127.0.0.1']);
  });
  it('rejects a host that is not an IP address (a typo must not become "listen everywhere")', () => {
    expect(() => parseListenConfig({ LISTEN_HOSTS: '127.0.0.1,hospital-pc' })).toThrow(/not an IP address/);
  });
  it('treats half a TLS configuration as an error, never as "no TLS"', () => {
    expect(() => parseListenConfig({ TLS_CERT_PEM: 'C' })).toThrow(/half configured/);
    expect(() => parseListenConfig({ TLS_KEY_PEM: 'K' })).toThrow(/half configured/);
  });
  describe('the desktop app (ELECTRON=true)', () => {
    const desktop = { ELECTRON: 'true' };
    it('may serve plain HTTP on loopback only', () => {
      expect(parseListenConfig({ ...desktop, LISTEN_HOSTS: '127.0.0.1' }).tls).toBeUndefined();
      expect(parseListenConfig({ ...desktop, HOST: '127.0.0.1' }).hosts).toEqual(['127.0.0.1']);
    });
    it('refuses plain HTTP on a network address', () => {
      expect(() => parseListenConfig({ ...desktop, LISTEN_HOSTS: '127.0.0.1,192.168.1.10' })).toThrow(/Refusing to serve plain HTTP on 192\.168\.1\.10/);
    });
    it('refuses plain HTTP on "all interfaces", set explicitly or by leaving the hosts out', () => {
      expect(() => parseListenConfig({ ...desktop, HOST: '0.0.0.0' })).toThrow(/Refusing/);
      expect(() => parseListenConfig(desktop)).toThrow(/all network interfaces/);
    });
    it('serves a network address once TLS is configured', () => {
      expect(() => parseListenConfig({ ...desktop, LISTEN_HOSTS: '127.0.0.1,192.168.1.10', TLS_CERT_PEM: 'C', TLS_KEY_PEM: 'K' })).not.toThrow();
    });
  });
});

describe('startListeners', () => {
  let listeners: Listeners | undefined;
  afterEach(async () => { await listeners?.close(); listeners = undefined; });

  const request = (lib: typeof http | typeof https, opts: https.RequestOptions) => new Promise<string>((resolve, reject) => {
    lib.get({ path: '/ping', agent: false, timeout: 3000, ...opts }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => resolve(d)); }).on('error', reject);
  });

  it('listens on several specific addresses at once, and not on others', async () => {
    const port = await freePort();
    listeners = startListeners(app, { port, hosts: ['127.0.0.1', '127.0.0.2'] });
    await listeners.ready;
    expect(await request(http, { host: '127.0.0.1', port })).toBe('pong');
    expect(await request(http, { host: '127.0.0.2', port })).toBe('pong');
    await expect(request(http, { host: '127.0.0.3', port })).rejects.toThrow(/ECONNREFUSED/);   // an adapter nobody chose
  });

  it('speaks TLS on every address when a certificate is given, and plain HTTP is no longer understood', async () => {
    const port = await freePort();
    listeners = startListeners(app, { port, hosts: ['127.0.0.1', '127.0.0.2'], tls: { cert: leaf.certPem + ca.certPem, key: leaf.keyPem } });
    await listeners.ready;
    for (const host of ['127.0.0.1', '127.0.0.2']) expect(await request(https, { host, port, ca: ca.certPem })).toBe('pong');
    await expect(request(http, { host: '127.0.0.1', port })).rejects.toThrow();                  // clear-text client gets nothing
  });

  it('refuses TLS 1.1 and older', async () => {
    const port = await freePort();
    listeners = startListeners(app, { port, hosts: ['127.0.0.1'], tls: { cert: leaf.certPem + ca.certPem, key: leaf.keyPem } });
    await listeners.ready;
    await expect(request(https, { host: '127.0.0.1', port, ca: ca.certPem, maxVersion: 'TLSv1.1', minVersion: 'TLSv1' })).rejects.toThrow();
    expect(await request(https, { host: '127.0.0.1', port, ca: ca.certPem, maxVersion: 'TLSv1.2', minVersion: 'TLSv1.2' })).toBe('pong');
  });

  it('reports a busy port by name instead of starting half-way', async () => {
    const port = await freePort();
    const blocker = net.createServer(); await new Promise<void>((r) => blocker.listen(port, '127.0.0.1', r));
    try {
      const l = startListeners(app, { port, hosts: ['127.0.0.1'] });
      await expect(l.ready).rejects.toThrow(new RegExp(`127\\.0\\.0\\.1:${port}.*EADDRINUSE`));
      await l.close();
    } finally { blocker.close(); }
  });

  it('close() frees every port', async () => {
    const port = await freePort();
    const l = startListeners(app, { port, hosts: ['127.0.0.1', '127.0.0.2'] });
    await l.ready; await l.close();
    await expect(request(http, { host: '127.0.0.1', port })).rejects.toThrow(/ECONNREFUSED/);
  });

  it('with no hosts it uses the default bind (development)', async () => {
    const port = await freePort();
    listeners = startListeners(app, { port });
    await listeners.ready;
    expect(await request(http, { host: '127.0.0.1', port })).toBe('pong');
  });
});
