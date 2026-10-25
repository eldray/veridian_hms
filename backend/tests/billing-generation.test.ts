import { describe, expect, it, vi } from 'vitest';
import { BillRepository } from '../src/modules/bill/BillRepository';

const serviceDate = new Date('2026-10-20T10:00:00.000Z');

function buildRepository(attendance: any, provider: any, stockItem: any, activeLines: any[]) {
  const createdBills: any[] = [];
  const tx: any = {
    attendance: {
      findUnique: vi.fn()
        .mockResolvedValueOnce({ dateTime: serviceDate })
        .mockResolvedValueOnce(attendance),
      update: vi.fn(),
    },
    insuranceProvider: { findUnique: vi.fn().mockResolvedValue(provider) },
    corporateAccount: { findUnique: vi.fn() },
    stockItem: { findUnique: vi.fn().mockResolvedValue(stockItem) },
    preAuthorisationRequest: { findMany: vi.fn().mockResolvedValue([]) },
    bill: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (args: any) => {
        createdBills.push(args);
        return { id: 'bill-1', attendanceId: attendance.id };
      }),
      update: vi.fn().mockResolvedValue({
        id: 'bill-1',
        attendanceId: attendance.id,
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
      }),
      aggregate: vi.fn().mockResolvedValue({
        _sum: { totalAmount: 0, paidAmount: 0, balance: 0 },
      }),
    },
    billLineItem: {
      findMany: vi.fn().mockResolvedValue(activeLines),
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
    wardChargeRecord: { update: vi.fn() },
  };
  const prisma: any = {
    $transaction: vi.fn(async (callback: any) => callback(tx)),
  };
  return { repository: new BillRepository(prisma), tx, createdBills };
}

describe('automatic bill generation payer allocations', () => {
  it('applies the private insurer coverage percentage and leaves the remainder patient-payable', async () => {
    const attendance = {
      id: 'attendance-1',
      patientId: 'patient-1',
      attendanceNumber: 'ATT-1',
      paymentMode: 'private_insurance',
      insuranceProviderId: 'insurer-1',
      corporateAccountId: null,
      ServiceRendered: [{
        id: 'service-rendered-1',
        quantity: 1,
        ServiceCatalog: {
          id: 'catalog-1',
          name: 'Consultation',
          code: 'CONS',
          serviceType: 'consultation',
          stockItemId: null,
          isNHISCovered: true,
          isPrivateInsuranceExempted: false,
          pricing: [{ cashPrice: 100, nhisPrice: 60, insurancePrice: 80 }],
        },
      }],
      LabTest: [],
      Scan: [],
      Procedure: [],
      Medication: [],
      WardChargeRecord: [],
    };
    const { repository, createdBills } = buildRepository(
      attendance,
      { coveragePercentage: 50 },
      null,
      [{ lineTotal: 80, patientPayableAmount: 40, insuranceCoveredAmount: 40 }],
    );

    await repository.generateFromEncounter('attendance-1', 'user-1');

    const lines = createdBills[0].data.BillLineItem.create;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      lineTotal: 80,
      insuranceCoveredAmount: 40,
      patientPayableAmount: 40,
    });
  });

  it('applies configured NHIS medicine co-payment rules instead of treating the whole tariff as insurer-paid', async () => {
    const attendance = {
      id: 'attendance-1',
      patientId: 'patient-1',
      attendanceNumber: 'ATT-1',
      paymentMode: 'nhis',
      insuranceProviderId: 'nhis-1',
      corporateAccountId: null,
      ServiceRendered: [],
      LabTest: [],
      Scan: [],
      Procedure: [],
      Medication: [{
        id: 'medication-1',
        name: 'Medicine',
        quantity: 2,
        status: 'dispensed',
        ServiceCatalog: {
          id: 'catalog-medicine-1',
          name: 'Medicine',
          code: 'MED-1',
          serviceType: 'medication',
          stockItemId: 'stock-1',
          isNHISCovered: true,
          isPrivateInsuranceExempted: false,
          pricing: [{ cashPrice: 100, nhisPrice: 60, insurancePrice: 80 }],
        },
      }],
      WardChargeRecord: [],
    };
    const stockItem = {
      id: 'stock-1',
      payerRules: [{
        insuranceProviderId: 'nhis-1',
        isCovered: true,
        authorizationRequired: false,
        prescribingLevel: 'A',
        tariffPrice: 60,
        effectiveFrom: null,
        effectiveTo: null,
        copaymentMode: 'fixed_amount',
        copaymentAmount: 10,
        copaymentPercentage: null,
      }],
    };
    const { repository, createdBills } = buildRepository(
      attendance,
      { coveragePercentage: 100 },
      stockItem,
      [{ lineTotal: 120, patientPayableAmount: 20, insuranceCoveredAmount: 100 }],
    );

    await repository.generateFromEncounter('attendance-1', 'user-1');

    const lines = createdBills[0].data.BillLineItem.create;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      quantity: 2,
      lineTotal: 120,
      insuranceCoveredAmount: 100,
      patientPayableAmount: 20,
    });
  });
});
