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
  it('restricts encounter worklists and vital-sign reads to their authorised departments', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'encounter', 'EncounterRoutes.ts'), 'utf8');
    const expected = [
      "router.get('/vitals/latest', requireRole(['admin', 'doctor', 'nurse', 'midwife'])",
      "router.get('/vitals/batch', requireRole(['admin', 'doctor', 'nurse', 'midwife'])",
      "router.get('/worklist/vitals', requireRole(['admin', 'doctor', 'nurse', 'midwife'])",
      "router.get('/worklist/medical', requireRole(['admin', 'doctor', 'nurse', 'midwife'])",
      "router.get('/worklist/lab', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech'])",
      "router.get('/worklist/pharmacy', requireRole(['admin', 'pharmacist'])",
      "router.get('/worklist/scans', requireRole(['admin', 'doctor', 'midwife', 'sonographer'])",
      "router.get('/worklist/procedures', requireRole(['admin', 'doctor', 'nurse', 'midwife'])",
      "router.get('/worklist/maternal', requireRole(['admin', 'doctor', 'midwife'])",
      "router.get('/worklist/outstanding', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer'])",
    ];
    for (const route of expected) expect(source).toContain(route);
  });


    it('restricts encounter statistics and aggregate worklist summaries to relevant staff roles', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'encounter', 'EncounterRoutes.ts'), 'utf8');
    expect(source).toContain("router.get('/stats', requireRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts']), controller.getStats);");
    expect(source).toContain("router.get('/worklist/summary', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer']), controller.getWorklistSummary);");
  });

  it('scopes encounter list/detail and direct clinical subresource reads by staff role', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'encounter', 'EncounterRoutes.ts'), 'utf8');
    expect(source).toContain("router.get('/', requireRole(encounterReaders), controller.getAll);");
    expect(source).toContain("router.get('/:id', requireRole(encounterReaders), controller.getById);");
    expect(source).toContain("router.get('/:id/vitals', requireRole(['admin', 'doctor', 'nurse', 'midwife'])");
    expect(source).toContain("router.get('/:id/consumables', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'pharmacist'])");
    expect(source).toContain("router.get('/:id/ward-charges', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'])");
  });

  it('restricts legacy billing invoice detail and item reads by staff role', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'billing', 'BillingRoutes.ts'), 'utf8');
    expect(source).toContain("router.get('/invoices/:id', requireRole(BILL_READERS)");
    expect(source).toContain("router.get('/invoices/:id/items', requireRole(BILL_ITEM_READERS)");
    expect(source).toContain("const BILL_READERS = ['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife'];");
    expect(source).toContain("const BILL_ITEM_READERS = [...BILL_READERS, 'pharmacist'];");
  });

  it('requires an idempotency key for every manual payment-posting API', () => {
    const current = fs.readFileSync(path.join(modulesDir, 'bill', 'BillController.ts'), 'utf8');
    const legacy = fs.readFileSync(path.join(modulesDir, 'billing', 'BillingController.ts'), 'utf8');
    expect(current).toContain("body('idempotencyKey').isUUID().withMessage('A valid payment idempotency key is required')");
    expect(current).toContain("body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'cheque'])");
    expect(legacy).toContain("body('idempotencyKey').isUUID().withMessage('A valid payment idempotency key is required')");
    expect(legacy).toContain("body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'cheque'])");
    expect(current).not.toContain("body('idempotencyKey').optional().isUUID()");
    expect(legacy).not.toContain("body('idempotencyKey').optional().isUUID()");
  });

  it('keeps provider-backed Mobile Money off the manual payment endpoints', () => {
    const current = fs.readFileSync(path.join(modulesDir, 'bill', 'BillController.ts'), 'utf8');
    const legacy = fs.readFileSync(path.join(modulesDir, 'billing', 'BillingController.ts'), 'utf8');
    const service = fs.readFileSync(path.join(modulesDir, 'billing', 'BillingService.ts'), 'utf8');
    expect(current).toContain("body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'cheque'])");
    expect(legacy).toContain("body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'cheque'])");
    expect(service).toContain("if (data.paymentMethod === 'mobile_money' || (data as any).internalMomoIntentId)");
    expect(service).toContain("async addConfirmedMomoPayment");
  });

  it('restricts patient-linked bill and payment detail reads to care, records and finance roles', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src', 'modules', 'bill', 'BillRoutes.ts'), 'utf8');
    for (const route of [
      "router.get('/', requireRole(BILL_READERS)",
      "router.get('/:id', requireRole(BILL_READERS)",
      "router.get('/:id/line-items', requireRole(BILL_READERS)",
      "router.get('/:id/breakdown', requireRole(BILL_READERS)",
      "router.get('/:id/report', requireRole(BILL_READERS)",
    ]) expect(source).toContain(route);
    expect(source).toContain("const BILL_READERS = ['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife'];");
  });

  it('restricts inpatient and daycase patient lists to the relevant clinical desks', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'encounter', 'EncounterRoutes.ts'), 'utf8');
    expect(source).toContain("router.get('/daycase', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records'])");
    expect(source).toContain("router.get('/bed-occupancy', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records'])");
    expect(source).toContain("router.get('/detention', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records'])");
    expect(source).toContain("router.get('/formal-ipd', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records'])");
  });

  it('restricts patient demographics and EMR reads to patient-management roles', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'patient', 'PatientRoutes.ts'), 'utf8');
    const readRoutes = source.split('\n').filter((line) => line.includes('router.get('));
    expect(readRoutes.length).toBeGreaterThan(0);
    for (const route of readRoutes) expect(route).toContain('requirePatientManagement');
  });

  it('restricts family-planning read APIs to the page-authorised roles', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'familyPlanning', 'FamilyPlanningRoutes.ts'), 'utf8');
    const readRoutes = source.split('\n').filter((line) => line.includes('router.get('));
    expect(readRoutes.length).toBeGreaterThan(0);
    for (const route of readRoutes) expect(route).toContain('requireRole(readRoles)');
  });

  it('restricts referral read APIs to the page-authorised roles', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'referral', 'ReferralRoutes.ts'), 'utf8');
    const readRoutes = source.split('\n').filter((line) => line.includes('router.get('));
    expect(readRoutes.length).toBeGreaterThan(0);
    for (const route of readRoutes) expect(route).toContain('requireRole(readRoles)');
  });


  it('uses the authenticated staff member for immunization performer and recorder attribution', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'immunization', 'ImmunizationRoutes.ts'), 'utf8');
    expect(source).toContain('const recordedBy = req.user!.id;');
    expect(source).toContain('administeredById: req.user!.id, recordedById: recordedBy');
    expect(source).not.toContain('req.body.administeredById');
    expect(source).not.toContain('req.body.recordedById');
  });

  it('prevents pharmacy stock receipts from being placed in the unassigned stock pool', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'stockItem', 'StockItemController.ts'), 'utf8');
    expect(source).toContain("if (!isAdmin && !req.user?.departmentId)");
    expect(source).toContain("Assign this user to a department before creating a stock item");
    expect(source).toContain("Assign this user to a department before receiving stock batches");
  });

  it('does not expose hospital-wide stock totals through department requisition reads', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'requisition', 'RequisitionRepository.ts'), 'utf8');
    const listStart = source.indexOf('async findAll(');
    const detailStart = source.indexOf('async findById(');
    const fulfilStart = source.indexOf('async fulfillRequisitionWithStockUpdate(');
    const listProjection = source.slice(listStart, detailStart);
    const detailProjection = source.slice(detailStart, fulfilStart);
    expect(listProjection).not.toContain('currentStock: true');
    expect(detailProjection).not.toContain('currentStock: true');
  });

  it('restricts insurance claim read APIs to accounts and doctors', () => {
    const source = fs.readFileSync(path.join(modulesDir, 'insuranceClaim', 'InsuranceClaimRoutes.ts'), 'utf8');
    expect(source).toContain("router.use(requireRole(['admin', 'accounts', 'doctor']));");
  });

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
