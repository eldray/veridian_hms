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
