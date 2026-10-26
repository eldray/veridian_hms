import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Static regression guard for route registration. It does not replace testing
// allowed/denied roles against a running API, but it fails when a new module
// forgets to authenticate its routes or lets every signed-in role mutate data.

const modulesDir = path.resolve(process.cwd(), 'src', 'modules');

const routeFiles = (): string[] =>
  fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
      fs
        .readdirSync(path.join(modulesDir, dir.name))
        .filter((file) => /(Routes|Router)\.ts$/.test(file))
        .map((file) => path.join(modulesDir, dir.name, file)),
    );

const relative = (file: string) => path.relative(process.cwd(), file).replace(/\\/g, '/');
const read = (file: string) => fs.readFileSync(file, 'utf8');

const PUBLIC_AUTH_ENDPOINTS = new Set(['/login', '/refresh-token', '/forgot-password']);

describe('route authorization coverage', () => {
  it('authenticates every module except the auth endpoints', () => {
    const unprotected = routeFiles()
      .filter((file) => !file.endsWith(`auth${path.sep}AuthRoutes.ts`))
      .filter((file) => !/\bprotect\b/.test(read(file)))
      .map(relative);

    expect(unprotected, 'route files must apply protect').toEqual([]);
  });

  it('never allows every authenticated role to mutate data', () => {
    const unguarded = routeFiles()
      .filter((file) => /router\.(post|put|patch|delete)\(/.test(read(file)))
      .filter((file) => !/require[A-Z]/.test(read(file)))
      .map(relative);

    expect(unguarded, 'mutating routes need a role or permission guard').toEqual([]);
  });

  it('keeps only login, refresh and password reset public in the auth router', () => {
    const controller = read(path.join(modulesDir, 'auth', 'AuthController.ts'));
    const registrations = [
      ...controller.matchAll(/this\.router\.(get|post|put|patch|delete)\(\s*'([^']+)'([\s\S]*?)\);/g),
    ];

    expect(registrations.length).toBeGreaterThan(0);

    const publicEndpoints = new Set<string>();
    const unprotected = [] as string[];

    for (const [, method, routePath, body] of registrations) {
      if (PUBLIC_AUTH_ENDPOINTS.has(routePath)) {
        publicEndpoints.add(routePath);
      } else if (!/\bprotect\b/.test(body)) {
        unprotected.push(`${method.toUpperCase()} ${routePath}`);
      }
    }

    expect([...publicEndpoints].sort()).toEqual([...PUBLIC_AUTH_ENDPOINTS].sort());
    expect(unprotected).toEqual([]);
  });
});
