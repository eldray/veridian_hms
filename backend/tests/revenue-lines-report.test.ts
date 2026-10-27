// backend/tests/revenue-lines-report.test.ts
//
// The revenue-lines report is the line-level money view the Reports screen renders through the
// shared shell. Two things have gone wrong in reports like this before: Prisma Decimals added
// with + (which concatenates text and silently produces a wrong total), and a report that
// quietly drops walk-in customers because it assumes every bill has a patient folder behind it.

import { describe, expect, it, vi } from 'vitest';
import { BillingService } from '../src/modules/billing/BillingService';

const dateFrom = new Date('2026-01-01T00:00:00.000Z');
const dateTo = new Date('2026-01-31T23:59:59.999Z');

function makeLine(overrides: Record<string, any> = {}) {
  return {
    id: 'line-1',
    description: 'Paracetamol 500mg',
    serviceType: 'medication',
    quantity: 2,
    unitPrice: 50.005,
    discount: 0,
    vatAmount: 0,
    lineTotal: 100.01,
    insuranceCoveredAmount: 60.005,
    patientPayableAmount: 40.005,
    pricingBasis: 'nhis',
    createdAt: new Date('2026-01-14T09:30:00.000Z'),
    serviceCatalog: { serviceCategory: 'pharmacy' },
    bill: {
      id: 'bill-1',
      billNumber: 'BILL-0041',
      billDate: new Date('2026-01-14T00:00:00.000Z'),
      status: 'pending',
      paymentMode: 'nhis',
      Patient: { surname: 'Mensah', otherNames: 'Kofi', folderNumber: 'F/001' },
      CounterClient: null,
    },
    ...overrides,
  };
}

function serviceWith(rows: any[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const prisma: any = { billLineItem: { findMany } };
  return { service: new BillingService(prisma), findMany };
}

describe('revenue lines report', () => {
  it('queries unvoided lines whose bill falls inside the window', async () => {
    const { service, findMany } = serviceWith([]);
    await service.getRevenueLines(dateFrom, dateTo, { paymentMode: 'cash', billStatus: 'paid', serviceType: 'lab_test' });

    const arg = findMany.mock.calls[0][0];
    expect(arg.where.isVoided).toBe(false);
    expect(arg.where.bill.billDate).toEqual({ gte: dateFrom, lte: dateTo });
    expect(arg.where.bill.paymentMode).toBe('cash');
    expect(arg.where.bill.status).toBe('paid');
    expect(arg.where.serviceType).toBe('lab_test');
    expect(arg.take).toBe(2000);
  });

  it('adds Prisma decimals in whole cents instead of as text', async () => {
    const { service } = serviceWith([
      makeLine({ id: 'line-a', lineTotal: 0.1, patientPayableAmount: 0.1, insuranceCoveredAmount: 0 }),
      makeLine({ id: 'line-b', lineTotal: 0.2, patientPayableAmount: 0.2, insuranceCoveredAmount: 0 }),
    ]);
    const report = await service.getRevenueLines(dateFrom, dateTo);

    // 0.1 + 0.2 is 0.30000000000000004 in floating point; a money report must print 0.30
    expect(report.totalAmount).toBe(0.3);
    expect(report.patientPayableAmount).toBe(0.3);
    expect(report.insuranceCoveredAmount).toBe(0);
    expect(report.totalLines).toBe(2);
  });

  it('names a counter customer instead of leaving the payer blank', async () => {
    const { service } = serviceWith([
      makeLine(),
      makeLine({
        id: 'line-2',
        bill: {
          id: 'bill-2', billNumber: 'CT-0007', billDate: dateTo, status: 'paid', paymentMode: 'cash',
          Patient: null,
          CounterClient: { name: 'Ama Boateng' },
        },
      }),
    ]);
    const report = await service.getRevenueLines(dateFrom, dateTo);

    expect(report.lines[0].bill.customer).toEqual({ name: 'Mensah Kofi', reference: 'F/001', kind: 'patient' });
    // A walk-in ticket has no folder, so the line is labelled as a walk-in rather than blank.
    expect(report.lines[1].bill.customer).toEqual({ name: 'Ama Boateng', reference: null, kind: 'walk_in' });
  });

  it('says when the window holds more lines than one response carries', async () => {
    const { service } = serviceWith([makeLine()]);
    const report = await service.getRevenueLines(dateFrom, dateTo, { limit: 1 });
    expect(report.capped).toBe(true);
    expect(report.limit).toBe(1);

    const roomy = await service.getRevenueLines(dateFrom, dateTo, { limit: 5 });
    expect(roomy.capped).toBe(false);
  });

  it('keeps the search on the item, the bill number and either kind of customer', async () => {
    const { service, findMany } = serviceWith([]);
    await service.getRevenueLines(dateFrom, dateTo, { search: 'Boateng' });

    const { where } = findMany.mock.calls[0][0];
    const branches = JSON.stringify(where.OR);
    expect(branches).toContain('"description"');
    expect(branches).toContain('"billNumber"');
    expect(branches).toContain('"surname"');
    expect(branches).toContain('"name"');
    expect(branches).toContain('"insensitive"');
  });
});
