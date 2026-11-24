// Per-route authorization guard. route-authorization.test.ts only proves that SOME role guard appears somewhere in a
// route file, so one guarded route lets a second, unguarded one through. This reads every route individually.
//
// A data-changing route (POST/PUT/PATCH/DELETE) must either carry a role/permission guard (route-level or from an
// earlier router.use) or be on SELF_SERVICE below, with the reason it is safe. New routes fail until someone decides.
// Static analysis only: it cannot tell whether a role list is the RIGHT one, nor test a running API.
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const modulesDir = path.resolve(process.cwd(), 'src', 'modules');
const GUARD = /\b(selfOrRoles|require[A-Z]\w*|authorize\w*|checkPermission\w*|restrictTo\w*|hasRole\w*|allowRoles\w*)\b/g;
const CALL = /\b(?:router|\w*[Rr]outer)\.(get|post|put|patch|delete|use|all)\s*\(/g;

/** Verified by hand: authenticated-only on purpose. "METHOD file path": why it is safe. */
const SELF_SERVICE: Record<string, string> = {
  'POST auth/AuthController.ts /change-password': 'needs the caller’s current password',
  'PUT auth/AuthController.ts /profile': 'service allow-lists name, email, phone, image',
  'PATCH notification/NotificationRoutes.ts /mark-all-read': 'updates only where userId = caller',
  'PATCH notification/NotificationRoutes.ts /:id/read': 'database where-clause includes the caller’s userId',
  'DELETE notification/NotificationRoutes.ts /:id': 'database where-clause includes the caller’s userId',
  'POST serviceCatalog/ServiceCatalogRoutes.ts /check-coverage': 'read-only calculation for clinicians',
  'POST serviceCatalog/ServiceCatalogRoutes.ts /calculate-cost': 'read-only calculation for clinicians',
  'POST user/UserRoutes.ts /leaves': 'user id comes from the token, not the body',
  'PUT user/UserRoutes.ts /leaves/:id': 'service: approve/reject needs admin-like, cancel needs owner or admin',
  'DELETE user/UserRoutes.ts /leaves/:id': 'service: owner or admin, pending requests only',
};

function stripComments(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/(?<=[;,)\s])\/\/[^\n]*/g, '');
}
function balanced(text: string, open: number): string {
  let depth = 0; let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '\'' || c === '"' || c === '`') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

interface Route { id: string; method: string; protectedRoute: boolean; guarded: boolean }
function scan(): Route[] {
  const routes: Route[] = [];
  for (const dir of fs.readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const file of fs.readdirSync(path.join(modulesDir, dir.name)).filter((f) => /(Routes|Router|Controller)\.ts$/.test(f))) {
      const text = stripComments(fs.readFileSync(path.join(modulesDir, dir.name, file), 'utf8'));
      let routerProtect = false; let routerGuard = false;
      for (const m of text.matchAll(CALL)) {
        const args = balanced(text, m.index! + m[0].length - 1);
        const method = m[1].toUpperCase();
        const guards = args.match(GUARD) ?? [];
        const hasProtect = /\bprotect\b/.test(args);
        if (method === 'USE') { routerProtect ||= hasProtect; routerGuard ||= guards.length > 0; continue; }
        const first = args.match(/^\s*(['"`])(.*?)\1/);
        routes.push({ id: `${method} ${dir.name}/${file} ${first ? first[2] : '?'}`, method, protectedRoute: hasProtect || routerProtect, guarded: guards.length > 0 || routerGuard });
      }
    }
  }
  return routes;
}

const routes = scan();
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

describe('route authorization, route by route', () => {
  it('restricts identifiable NHIS expiry patient details to authorised desk roles', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'report', 'ReportRoutes.ts'), 'utf8');
    expect(source).toMatch(/router\.get\(['"]\/nhis-expiring-soon['"],\s*requireRole\(\[['"]admin['"],\s*['"]accounts['"],\s*['"]records['"]\]\)/);
  });

  it('finds the routes (guards against the scanner silently matching nothing)', () => {
    expect(routes.length).toBeGreaterThan(400);
    expect(routes.filter((r) => MUTATING.has(r.method)).length).toBeGreaterThan(200);
  });

  it('only the explicitly public auth endpoints skip authentication', () => {
    const open = routes.filter((r) => !r.protectedRoute).map((r) => r.id).sort();
    expect(open).toEqual([
      'POST auth/AuthController.ts /complete-password-reset',
      'POST auth/AuthController.ts /forgot-password',
      'POST auth/AuthController.ts /login',
      'POST auth/AuthController.ts /logout',
      'POST auth/AuthController.ts /refresh-token',
    ]);
  });

  it('every data-changing route has a role/permission guard, or is a documented self-service route', () => {
    const unguarded = routes.filter((r) => MUTATING.has(r.method) && r.protectedRoute && !r.guarded && !(r.id in SELF_SERVICE)).map((r) => r.id);
    expect(unguarded, 'add a role/permission guard, or verify the route and add it to SELF_SERVICE with the reason').toEqual([]);
  });

  it('the self-service list has no stale entries', () => {
    const routeIds = new Set(routes.map((r) => r.id));
    const stale = Object.keys(SELF_SERVICE).filter((id) => !routeIds.has(id));
    expect(stale, 'remove self-service entries for routes that no longer exist').toEqual([]);
    for (const id of Object.keys(SELF_SERVICE)) {
      expect(routes.find((route) => route.id === id)?.protectedRoute, `${id} must remain authenticated`).toBe(true);
    }
  });
});
