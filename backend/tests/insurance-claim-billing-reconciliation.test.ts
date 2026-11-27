import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextPrivateClaimNumber: () => 'PRV-TEST-001', nextCorporateClaimNumber: () => 'CORP-TEST-001' }),
}));

import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

describe('private and corporate direct claim generation', () => {
  const catalog = {
    id: 'service-1', name: 'Consultation', code: 'CONS-01', serviceType: 'consultation',
    isPrivateInsuranceExempted: false,
  };
  function setup(payer: 'private' | 'corporate' = 'private') {
    const created: any[] = [];
    const attendance: any = {
      id: 'attendance-1', attendanceNumber: 'ATT-1001', patientId: 'patient-1',
      insuranceProviderId: payer === 'private' ? 'private-provider' : 'corporate-provider',
      corporateAccountId: payer === 'corporate' ? 'corp-1' : null,
      corporateEmployeeId: 'EMP-1',
      dateTime: new Date('2026-10-24T10:00:00.000Z'),
      Patient: { id: 'patient-1' },
      InsuranceProvider: { id: payer === 'private' ? 'private-provider' : 'corporate-provider', type: payer, coveragePercentage: 80 },
      AttendanceDiagnosis: [], ServiceRendered: [{ id: 'service-rendered-1', quantity: 1, date: new Date('2026-10-24'), ServiceCatalog: catalog }],
      LabTest: [], Medication: [], Procedure: [], Scan: [],
    };
    const tx: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }: any) => { created.push(data); return { id: 'claim-1', ...data, items: data.items.create }; }),
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalClaimAmount: 25 } }),
      },
      attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
      servicePricing: { findFirst: vi.fn().mockResolvedValue({ cashPrice: 100, insurancePrice: 100, corporatePrice: 0 }) },
      corporateAccount: { findUnique: vi.fn().mockResolvedValue({ id: 'corp-1', companyName: 'Acme Ltd', isActive: true, insuranceProviderId: 'corporate-provider', creditLimit: 1000, discountPercentage: 10 }) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { service: new InsuranceClaimService(prisma), tx, created };
  }

  it('creates a private claim from attendance services without a bill and claims only the insurer share', async () => {
    const { service, tx, created } = setup('private');
    const result = await service.generatePrivateInsuranceClaim('attendance-1', 'user-1');
    expect(result.isExisting).toBe(false);
    expect(tx.insuranceClaim.create).toHaveBeenCalledTimes(1);
    expect(created[0].billId).toBeNull();
    expect(created[0].totalClaimAmount).toBe(80);
    expect(created[0].items.create).toHaveLength(1);
    expect(created[0].items.create[0]).toMatchObject({
      serviceCatalogId: 'service-1', quantity: 1, unitPrice: 80, lineTotal: 80,
    });
    expect(created[0].items.create[0].billLineItemId).toBeUndefined();
  });

  it('creates a corporate claim from attendance services using corporate discount and no bill', async () => {
    const { service, tx, created } = setup('corporate');
    const result = await service.generateCorporateClaim('attendance-1', 'user-1');
    expect(result.isExisting).toBe(false);
    expect(created[0].billId).toBeNull();
    expect(created[0].totalClaimAmount).toBe(90);
    expect(created[0].metadata).toMatchObject({ discountPercentage: 10 });
    expect(created[0].items.create[0]).toMatchObject({ unitPrice: 90, lineTotal: 90 });
    expect(tx.insuranceClaim.aggregate).toHaveBeenCalled();
  });

  it('uses NHIS investigation and procedure tariff codes in direct payer claim items and code arrays', async () => {
    const { service, tx, created } = setup('private');
    const attendance = await tx.attendance.findUnique();
    attendance.ServiceRendered = [];
    attendance.LabTest = [{
      id: 'lab-1', status: 'completed', name: 'Random Blood Glucose',
      LabTestTemplate: { investigationCode: 'INVE46D', name: 'Random Blood Glucose' },
      ServiceCatalog: { id: 'lab-service', name: 'Random Blood Glucose', code: 'LAB-INVE46D', nhisServiceCode: 'INVE46D', serviceType: 'lab_test', isPrivateInsuranceExempted: false },
    }];
    attendance.Scan = [{
      id: 'scan-1', status: 'completed', name: 'Abdominal Ultrasound',
      ScanTemplate: { investigationCode: 'INVE30E', name: 'Abdominal Ultrasound' },
      ServiceCatalog: { id: 'scan-service', name: 'Abdominal Ultrasound', code: 'SCAN-SCAN02U', nhisServiceCode: 'INVE30E', serviceType: 'scan', isPrivateInsuranceExempted: false },
    }];
    attendance.Procedure = [{
      id: 'procedure-1', status: 'completed', name: 'Dressing',
      ProcedureTemplate: { procedureCode: 'ZOOM05', name: 'Dressing' },
      ServiceCatalog: { id: 'procedure-service', name: 'Dressing', code: 'PROC-ZOOM05', nhisServiceCode: 'ZOOM05', serviceType: 'procedure', isPrivateInsuranceExempted: false },
    }];

    await service.generatePrivateInsuranceClaim('attendance-1', 'user-1');

    expect(created[0].items.create.map((item: any) => item.code)).toEqual(['INVE46D', 'INVE30E', 'ZOOM05']);
    expect(created[0].labTestCodes).toEqual(['INVE46D']);
    expect(created[0].scanCodes).toEqual(['INVE30E']);
    expect(created[0].procedureCodes).toEqual(['ZOOM05']);
  });

  it('uses canonical investigation and procedure tariff codes when generating corporate claims', async () => {
    const { service, tx, created } = setup('corporate');
    const attendance = await tx.attendance.findUnique();
    attendance.ServiceRendered = [];
    attendance.LabTest = [{
      id: 'corp-lab-1', status: 'completed', name: 'Random Blood Glucose',
      LabTestTemplate: { investigationCode: 'INVE46D', name: 'Random Blood Glucose' },
      ServiceCatalog: { id: 'corp-lab-service', name: 'Random Blood Glucose', code: 'LAB-INVE46D', nhisServiceCode: 'INVE46D', serviceType: 'lab_test', isPrivateInsuranceExempted: false },
    }];
    attendance.Scan = [{
      id: 'corp-scan-1', status: 'completed', name: 'Abdominal Ultrasound',
      ScanTemplate: { investigationCode: 'INVE30E', name: 'Abdominal Ultrasound' },
      ServiceCatalog: { id: 'corp-scan-service', name: 'Abdominal Ultrasound', code: 'SCAN-SCAN02U', nhisServiceCode: 'INVE30E', serviceType: 'scan', isPrivateInsuranceExempted: false },
    }];
    attendance.Procedure = [{
      id: 'corp-procedure-1', status: 'completed', name: 'Dressing',
      ProcedureTemplate: { procedureCode: 'ZOOM05', name: 'Dressing' },
      ServiceCatalog: { id: 'corp-procedure-service', name: 'Dressing', code: 'PROC-ZOOM05', nhisServiceCode: 'ZOOM05', serviceType: 'procedure', isPrivateInsuranceExempted: false },
    }];

    await service.generateCorporateClaim('attendance-1', 'user-1');

    expect(created[0].items.create.map((item: any) => item.code)).toEqual(['INVE46D', 'INVE30E', 'ZOOM05']);
    expect(created[0].labTestCodes).toEqual(['INVE46D']);
    expect(created[0].scanCodes).toEqual(['INVE30E']);
    expect(created[0].procedureCodes).toEqual(['ZOOM05']);
  });

  it('refuses to put internal LAB catalogue identifiers into payer claim lines', async () => {
    const { service, tx, created } = setup('private');
    const attendance = await tx.attendance.findUnique();
    attendance.ServiceRendered = [];
    attendance.LabTest = [{
      id: 'lab-legacy', status: 'completed', name: 'Random Blood Glucose',
      LabTestTemplate: null,
      ServiceCatalog: { id: 'lab-service', name: 'Random Blood Glucose', code: 'LAB-INVE46D', nhisServiceCode: null, serviceType: 'lab_test', isPrivateInsuranceExempted: false },
    }];

    await expect(service.generatePrivateInsuranceClaim('attendance-1', 'user-1'))
      .rejects.toThrow(/no valid NHIS INVE investigation code/i);
    expect(created).toHaveLength(0);
  });

  it('refuses to generate a claim when the attendance has no completed priced services', async () => {
    const { service, tx } = setup('private');
    const attendance = await tx.attendance.findUnique();
    attendance.ServiceRendered = [];
    await expect(service.generatePrivateInsuranceClaim('attendance-1', 'user-1'))
      .rejects.toThrow(/no completed, priced services/i);
    expect(tx.insuranceClaim.create).not.toHaveBeenCalled();
  });
});

describe('claim draft item replacement reconciliation', () => {
  const makeService = (type: 'private' | 'corporate', discountPercentage = 0) => {
    const claim = {
      id: 'claim-1',
      billId: 'bill-1',
      insuranceProviderId: 'provider-1',
      corporateAccountId: type === 'corporate' ? 'corporate-account-1' : null,
      status: 'draft',
      metadata: { discountPercentage },
      // Corporate accounts commonly use a provider whose type is "private".
      InsuranceProvider: { type: 'private' },
      Attendance: { id: 'attendance-1', patientId: 'patient-1', dateTime: new Date('2026-10-24T10:00:00.000Z'), Admission: null, Medication: [] },
    };
    const updated = { ...claim, items: [] };
    const tx: any = {
      insuranceClaimItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      insuranceClaim: { update: vi.fn().mockResolvedValue(updated) },
      auditLog: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ locked: 1 }]),
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
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({
      entityType: 'InsuranceClaim',
      entityId: 'claim-1',
      action: 'update',
      performedById: 'user-1',
      previousState: { itemCount: 0 },
      newState: { itemCount: 1, totalClaimAmount: 80 },
      metadata: {
        workflow: 'draft_claim_items_replaced',
        payerType: 'private',
        itemCategoryCounts: { service: 1 },
        clinicalAndPrescriptionContentOmitted: true,
      },
    });
    expect(JSON.stringify(tx.auditLog.create.mock.calls[0][0].data)).not.toContain('Consultation');
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
