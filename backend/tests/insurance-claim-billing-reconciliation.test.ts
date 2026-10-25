import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextPrivateClaimNumber: () => 'PRV-TEST-001' }),
}));

import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

describe('private insurance claim liability reconciliation', () => {
  function setup(billItems: any[]) {
    const created: any[] = [];
    const attendance = {
      id: 'attendance-1',
      attendanceNumber: 'ATT-1001',
      patientId: 'patient-1',
      insuranceProviderId: 'private-provider',
      dateTime: new Date('2026-10-24T10:00:00.000Z'),
      InsuranceProvider: { id: 'private-provider', type: 'private', name: 'Private Insurer' },
      Bill: { id: 'bill-1', totalAmount: 150, BillLineItem: billItems },
      AttendanceDiagnosis: [],
      ServiceRendered: [],
      LabTest: [],
      Medication: [],
      Procedure: [],
      Scan: [],
    };
    const tx: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }: any) => {
          created.push(data);
          return { id: 'claim-1', ...data, items: data.items.create };
        }),
      },
      attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { service: new InsuranceClaimService(prisma), tx, created };
  }

  it('claims only covered amounts and excludes the patient co-payment and voided lines', async () => {
    const { service, tx, created } = setup([
      {
        id: 'line-covered',
        isVoided: false,
        serviceType: 'consultation',
        description: 'Consultation',
        quantity: 1,
        unitPrice: 100,
        lineTotal: 100,
        insuranceCoveredAmount: 80,
        patientPayableAmount: 20,
        serviceCatalogId: 'service-1',
        serviceCatalog: { code: 'CONS-01' },
      },
      {
        id: 'line-uncovered',
        isVoided: false,
        serviceType: 'lab_test',
        description: 'Uncovered test',
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        insuranceCoveredAmount: 0,
        patientPayableAmount: 50,
        serviceCatalogId: 'service-2',
        serviceCatalog: { code: 'LAB-02' },
      },
      {
        id: 'line-voided',
        isVoided: true,
        serviceType: 'consultation',
        description: 'Voided service',
        quantity: 1,
        unitPrice: 25,
        lineTotal: 25,
        insuranceCoveredAmount: 25,
        patientPayableAmount: 0,
        serviceCatalogId: 'service-3',
        serviceCatalog: { code: 'CONS-03' },
      },
    ]);

    const result = await service.generatePrivateInsuranceClaim('attendance-1', 'user-1');

    expect(result.isExisting).toBe(false);
    expect(tx.insuranceClaim.create).toHaveBeenCalledTimes(1);
    expect(created[0].totalClaimAmount).toBe(80);
    expect(created[0].items.create).toHaveLength(1);
    expect(created[0].items.create[0]).toMatchObject({
      billLineItemId: 'line-covered',
      quantity: 1,
      unitPrice: 80,
      lineTotal: 80,
    });
  });

  it('refuses to create an insurer claim when no active bill line has a positive covered amount', async () => {
    const { service, tx } = setup([
      {
        id: 'line-copay-only',
        isVoided: false,
        serviceType: 'lab_test',
        description: 'Patient-payable service',
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        insuranceCoveredAmount: 0,
        patientPayableAmount: 50,
        serviceCatalogId: 'service-1',
        serviceCatalog: { code: 'LAB-01' },
      },
    ]);

    await expect(service.generatePrivateInsuranceClaim('attendance-1', 'user-1'))
      .rejects.toThrow(/positive insurer-covered amount/i);
    expect(tx.insuranceClaim.create).not.toHaveBeenCalled();
  });
});

describe('claim draft item replacement reconciliation', () => {
  const makeService = (type: 'private' | 'corporate', discountPercentage = 0) => {
    const claim = {
      id: 'claim-1',
      billId: 'bill-1',
      insuranceProviderId: 'provider-1',
      status: 'draft',
      metadata: { discountPercentage },
      InsuranceProvider: { type },
      Attendance: { id: 'attendance-1', patientId: 'patient-1', dateTime: new Date('2026-10-24T10:00:00.000Z'), Admission: null, Medication: [] },
    };
    const updated = { ...claim, items: [] };
    const tx: any = {
      insuranceClaimItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      insuranceClaim: { update: vi.fn().mockResolvedValue(updated) },
    };
    const prisma: any = {
      insuranceClaim: { findUnique: vi.fn().mockResolvedValueOnce(claim).mockResolvedValueOnce(updated) },
      serviceCatalog: { findMany: vi.fn().mockResolvedValue([]) },
      diagnosis: { findMany: vi.fn().mockResolvedValue([]) },
      gDRGTariff: { findMany: vi.fn().mockResolvedValue([]) },
      billLineItem: { findMany: vi.fn().mockResolvedValue([{ id: 'bill-line-1' }]) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    return { service: new InsuranceClaimService(prisma), prisma, tx };
  };

  it('preserves a valid bill-line link and recalculates a private claim total from its items', async () => {
    const { service, prisma, tx } = makeService('private');
    await service.replaceClaimItems('claim-1', [{
      itemCategory: 'service',
      code: 'CONS',
      description: 'Consultation',
      quantity: 1,
      unitPrice: 80,
      lineTotal: 80,
      billLineItemId: 'bill-line-1',
    }], 'user-1');

    expect(prisma.billLineItem.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['bill-line-1'] }, billId: 'bill-1', isVoided: false },
      select: { id: true },
    });
    expect(tx.insuranceClaimItem.createMany.mock.calls[0][0].data[0].billLineItemId).toBe('bill-line-1');
    expect(tx.insuranceClaim.update.mock.calls[0][0].data.totalClaimAmount).toBe(80);
  });

  it('applies a corporate discount to saved lines and the claim header total', async () => {
    const { service, tx } = makeService('corporate', 10);
    await service.replaceClaimItems('claim-1', [{
      itemCategory: 'service',
      code: 'CONS',
      description: 'Consultation',
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
    }], 'user-1');

    expect(tx.insuranceClaimItem.createMany.mock.calls[0][0].data[0]).toMatchObject({
      unitPrice: 45,
      lineTotal: 90,
    });
    expect(tx.insuranceClaim.update.mock.calls[0][0].data.totalClaimAmount).toBe(90);
  });
});
