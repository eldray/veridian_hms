// main.cjs loads other files of the shell at start-up. An installer whose `files:` list leaves one out builds fine and
// then crashes on launch, and nothing in the backend test-suite would notice. This reads what main.cjs asks for and
// checks each of the three installer configs ships it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd(), '..');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const configs = ['electron-builder.yml', 'electron-builder.server.yml', 'electron-builder.client.yml'];

function shippedFiles(config: string): string[] {
  const lines = fs.readFileSync(path.join(root, config), 'utf8').split(/\r?\n/);
  const out: string[] = [];
  let inFiles = false;
  for (const line of lines) {
    if (/^files:/.test(line)) { inFiles = true; continue; }
    if (inFiles && /^\S/.test(line)) break;
    const m = inFiles && line.match(/^\s+-\s+(.+?)\s*$/);
    if (m) out.push(m[1].replace(/^['"]|['"]$/g, ''));
  }
  return out;
}
const ships = (files: string[], name: string) => files.some((f) => f === name || (f.endsWith('/**') && name.startsWith(f.slice(0, -2))));

const required = [...main.matchAll(/require\('\.\/([^']+)'\)/g)].map((m) => m[1]).filter((n) => /\.(cjs|js)$/.test(n));
// Any quoted page or preload name: some are chosen through a variable (client or server page), so a path.join pattern misses them.
const assets = [...new Set([...main.matchAll(/'([A-Za-z0-9_.-]+(?:\.html|-preload\.cjs)|preload\.js)'/g)].map((m) => m[1]))];

describe('the installers ship every file main.cjs loads', () => {
  it('finds what to check (guards against the patterns silently matching nothing)', () => {
    expect(required).toContain('pki.cjs');
    expect(assets).toContain('status.html');
    expect(assets).toContain('client-setup.html');
  });

  for (const config of configs) {
    it(`${config}: every module main.cjs require()s is in files:`, () => {
      const files = shippedFiles(config);
      expect(files.length).toBeGreaterThan(3);
      expect(required.filter((n) => !ships(files, n)), `main.cjs requires these but ${config} does not ship them`).toEqual([]);
    });
  }

  it('the full (standalone) installer ships every page and preload main.cjs can open, apart from the client-only ones', () => {
    const files = shippedFiles('electron-builder.yml');
    const missing = assets.filter((n) => !ships(files, n) && !/^client-setup/.test(n) && !/icon|png|ico/.test(n));
    expect(missing).toEqual([]);
  });

  it('the client installer ships the client pages and the status page', () => {
    const files = shippedFiles('electron-builder.client.yml');
    for (const n of ['client-setup.html', 'client-setup-preload.cjs', 'status.html', 'preload.js']) expect(ships(files, n), n).toBe(true);
  });
});
