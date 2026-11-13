// resolveEstimateLine turns a planned bill line into a priced catalogue line. It feeds the pre-authorisation and
// estimate seeders. Lab, scan and procedure lines used to resolve to nothing: plans carry the template CODE, but
// serviceBy*Template is keyed by the template ID, and the code was looked up directly. Roughly 100 of 120
// pre-authorisations (and the estimates built around those line kinds) were silently dropped as a result.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/seed/testSeed/lookups.js', () => ({
  ENUMS: { serviceType: { laboratory: 'laboratory', scan: 'scan', procedure: 'procedure', medication: 'medication', ward: 'ward', miscellaneous: 'miscellaneous' } },
}));
vi.mock('../src/seed/testSeed/shared.js', () => ({
  hashOf: (s: string) => s.length, money: (v: number) => Math.round((v + Number.EPSILON) * 100) / 100,
  prisma: {}, startOfToday: () => new Date(), writeMany: vi.fn(),
}));
vi.mock('../src/seed/testSeed/patients.js', () => ({ corporateEnrolmentFor: () => null }));
vi.mock('@prisma/client', () => ({ Prisma: {} }));

import { resolveEstimateLine } from '../src/seed/testSeed/finance';

const service = (id: string, type: string, cash: number, nhis: number) => ({
  id, code: id.toUpperCase(), name: `Service ${id}`, serviceType: type, isNHISCovered: true, stockItemId: null,
  cashPrice: cash, nhisPrice: nhis, insurancePrice: cash, corporatePrice: 0,
});

// Built the way lookups.ts builds them: code -> template, and TEMPLATE ID -> service.
const lookups: any = {
  labTemplateByCode: new Map([['INVE51D', { id: 'tpl-lab' }]]),
  scanTemplateByCode: new Map([['scan01x', { id: 'tpl-scan' }]]),
  procedureTemplateByCode: new Map([['obgy02A', { id: 'tpl-proc' }]]),
  serviceByLabTemplate: new Map([['tpl-lab', service('svc-lab', 'laboratory', 80, 60)]]),
  serviceByScanTemplate: new Map([['tpl-scan', service('svc-scan', 'scan', 150, 100)]]),
  serviceByProcedureTemplate: new Map([['tpl-proc', service('svc-proc', 'procedure', 800, 600)]]),
  serviceByCode: new Map(),
  priceOf: (s: any, mode: string) => (mode === 'nhis' ? s.nhisPrice : s.cashPrice),
};
const encounter: any = {
  plan: { paymentMode: 'nhis', folderNumber: null },
  consultationCode: null,
  labPlans: [{ testCode: 'INVE51D' }, { testCode: 'NOT-A-REAL-CODE' }],
  scanPlans: [{ scanCode: 'scan01x' }],
  procPlans: [{ procedureCode: 'obgy02A' }],
  medPlans: [],
};
const line = (kind: string, index = 0, quantity = 1): any => ({ kind, index, quantity });

describe('resolveEstimateLine: lab, scan and procedure lines', () => {
  it('resolves a lab line through its template code, at the payer price', () => {
    expect(resolveEstimateLine(lookups, encounter, line('lab'))).toMatchObject({ serviceCatalogId: 'svc-lab', unitPrice: 60, quantity: 1, serviceType: 'laboratory' });
  });
  it('resolves a scan line', () => {
    expect(resolveEstimateLine(lookups, encounter, line('scan'))).toMatchObject({ serviceCatalogId: 'svc-scan', unitPrice: 100 });
  });
  it('resolves a procedure line', () => {
    expect(resolveEstimateLine(lookups, encounter, line('procedure'))).toMatchObject({ serviceCatalogId: 'svc-proc', unitPrice: 600 });
  });
  it('keeps the quantity of the planned line', () => {
    expect(resolveEstimateLine(lookups, encounter, line('lab', 0, 3))?.quantity).toBe(3);
  });
  it('uses the cash price for a cash visit', () => {
    const cash = { ...encounter, plan: { paymentMode: 'cash', folderNumber: null } };
    expect(resolveEstimateLine(lookups, cash, line('procedure'))?.unitPrice).toBe(800);
  });
  it('returns null for a template code that has no template, a missing plan, or a template with no catalogue entry', () => {
    expect(resolveEstimateLine(lookups, encounter, line('lab', 1))).toBeNull();      // unknown code
    expect(resolveEstimateLine(lookups, encounter, line('lab', 9))).toBeNull();      // no such plan
    const noService = { ...lookups, serviceByLabTemplate: new Map() };
    expect(resolveEstimateLine(noService, encounter, line('lab'))).toBeNull();       // template exists, no priced service
  });
  it('the map really is keyed by template ID: a service stored under the CODE is not found', () => {
    const wrongKey = { ...lookups, serviceByLabTemplate: new Map([['INVE51D', service('svc-lab', 'laboratory', 80, 60)]]) };
    expect(resolveEstimateLine(wrongKey, encounter, line('lab'))).toBeNull();
  });
});
