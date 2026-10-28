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

  // Per-route check for the files that move money or record care. The module-wide
  // check above only proves requireRole appears somewhere in the file, which is how
  // an unguarded "accept estimate" route survived: one guarded route in the file
  // was enough to pass it.
  const FINANCE_AND_CARE_ROUTE_FILES = [
    'bill/BillRoutes.ts',
    'billing/BillingRoutes.ts',
    'nursing/NursingRoutes.ts',
    'proformaInvoice/ProformaInvoiceRoutes.ts',
    'waiver/WaiverRoutes.ts',
  ];

  // Bill generation is a side effect of documenting clinical work (the attendance
  // store regenerates after a lab result or procedure entry, including by lab techs),
  // so it is authenticated rather than finance-role restricted.
  const UNGUARDED_BY_DESIGN = new Set(['POST /generate/:encounterId']);

  it('guards every mutating route in the money and care modules', () => {
    const unguarded: string[] = [];

    for (const relativeFile of FINANCE_AND_CARE_ROUTE_FILES) {
      const source = read(path.join(modulesDir, relativeFile));
      for (const [, method, args] of source.matchAll(/router\.(post|put|patch|delete)\(\s*(['"][^'"]*['"][\s\S]*?)\);/g)) {
        const routePath = (args.match(/'([^']+)'/) || ['', ''])[1];
        if (UNGUARDED_BY_DESIGN.has(`${method.toUpperCase()} ${routePath}`)) continue;
        if (!/require(Role|Permission)/.test(args)) unguarded.push(`${relativeFile}: ${method.toUpperCase()} ${routePath}`);
      }
    }

    expect(unguarded, 'mutating money and care routes need a role guard on the route itself').toEqual([]);
  });

  // The administrator password reset is the only way a locked-out account gets back
  // in, so it must never be reachable by a role that merely reads the staff register.
  it('guards the administrator password reset with a role and a body check', () => {
    const source = read(path.join(modulesDir, 'user', 'UserRoutes.ts'));
    const route = source.match(/router\.patch\(\s*'\/:id\/password'([\s\S]*?)\);/);

    expect(route, 'PATCH /users/:id/password must be registered').toBeTruthy();
    expect(route![1]).toMatch(/requireRole/);
    expect(route![1]).toMatch(/validateBody/);
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
