// src/utils/listen.ts
// Decides WHERE the API listens and WHETHER it speaks TLS, from the environment the desktop shell sets.
//
//   LISTEN_HOSTS   comma list of addresses to bind, e.g. "127.0.0.1,192.168.1.10" (the shell lists this PC plus the
//                  network adapter(s) the administrator chose). Not set: HOST, then Node's default bind (development).
//   TLS_CERT_PEM / TLS_KEY_PEM   the certificate chain (server first) and its private key. Set together or not at all.
//
// One rule is enforced HERE, not only in the shell, so that a bug elsewhere cannot expose patient data in clear text:
// the desktop app (ELECTRON=true) never serves plain HTTP on anything but this PC's loopback address.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { Application } from 'express';

export interface ListenConfig {
  port: number;
  /** Undefined = Node's default (all interfaces, dual-stack): development only. */
  hosts?: string[];
  tls?: { cert: string; key: string };
}

const isLoopback = (h: string) => h === 'localhost' || h === '::1' || /^127\./.test(h);

export function parseListenConfig(env: NodeJS.ProcessEnv): ListenConfig {
  const port = Number(env.PORT) || 5000;

  const raw = (env.LISTEN_HOSTS || env.HOST || '').split(',').map((h) => h.trim()).filter(Boolean);
  for (const h of raw) {
    if (net.isIP(h) === 0 && h !== 'localhost') throw new Error(`LISTEN_HOSTS contains "${h}", which is not an IP address.`);
  }
  const hosts = raw.length ? [...new Set(raw)] : undefined;

  const cert = env.TLS_CERT_PEM || '';
  const key = env.TLS_KEY_PEM || '';
  if (!!cert !== !!key) {
    // Half a configuration must never quietly become "no TLS".
    throw new Error('TLS is half configured: TLS_CERT_PEM and TLS_KEY_PEM must both be set.');
  }
  const tls = cert && key ? { cert, key } : undefined;

  if (env.ELECTRON === 'true' && !tls) {
    const exposed = hosts ? hosts.filter((h) => !isLoopback(h)) : ['all network interfaces'];
    if (exposed.length) {
      throw new Error(`Refusing to serve plain HTTP on ${exposed.join(', ')}: the desktop app only does that on this PC's own address. Network access needs TLS.`);
    }
  }
  return { port, hosts, tls };
}

export interface Listeners {
  servers: http.Server[];
  /** Resolves once every address is bound; rejects (naming the address) if one cannot be. */
  ready: Promise<void>;
  close(): Promise<void>;
}

export function startListeners(app: Application, cfg: ListenConfig): Listeners {
  const make = () => (cfg.tls
    ? https.createServer({ cert: cfg.tls.cert, key: cfg.tls.key, minVersion: 'TLSv1.2' }, app)
    : http.createServer(app));

  const targets: Array<string | undefined> = cfg.hosts ?? [undefined];
  const servers: http.Server[] = [];

  const ready = Promise.all(targets.map((host) => new Promise<void>((resolve, reject) => {
    const server = make();
    servers.push(server);
    const fail = (err: NodeJS.ErrnoException) => reject(Object.assign(new Error(`Could not listen on ${host ?? 'the default address'}:${cfg.port} (${err.code || err.message})`), { cause: err }));
    server.once('error', fail);
    server.once('listening', () => { server.off('error', fail); resolve(); });
    if (host) server.listen(cfg.port, host); else server.listen(cfg.port);
  }))).then(() => undefined);

  const close = () => Promise.all(servers.map((s) => new Promise<void>((resolve) => {
    if (!s.listening) return resolve();
    s.close(() => resolve());
    s.closeIdleConnections?.();
  }))).then(() => undefined);

  return { servers, ready, close };
}
