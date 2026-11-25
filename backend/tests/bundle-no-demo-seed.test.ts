// The installed desktop app must ship reference data only. bundle.mjs stubs the demo seed out of the
// backend bundle and fails the build if demo-seed code or demo logins slip in; this test runs that same
// build so a regression is caught by `npm test`, not by a clinic finding fake patients.
import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const backendDir = path.resolve(__dirname, '..');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veridian-bundle-'));

afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }));

describe('packaged backend bundle', () => {
  it('builds without the demo seed', () => {
    execFileSync(process.execPath, [path.join('scripts', 'bundle.mjs'), outDir], { cwd: backendDir, stdio: 'pipe' });
    for (const file of ['server.mjs', 'bootstrap.mjs']) {
      const code = fs.readFileSync(path.join(outDir, file), 'utf8');
      for (const marker of ['seedpat-', 'seedmed-', 'generatePatients', 'seedTestData(', 'doctor123', 'nurse123']) {
        expect(code.includes(marker), `${file} contains "${marker}"`).toBe(false);
      }
    }
  });

  it('bootstraps with the production profile only', () => {
    const code = fs.readFileSync(path.join(outDir, 'bootstrap.mjs'), 'utf8');
    expect(code).toContain('profile: "production"');
  });
});
