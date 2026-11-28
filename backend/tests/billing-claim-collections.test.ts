import { describe, expect, it, vi } from 'vitest';
import { BillingRepository } from '../src/modules/billing/BillingRepository';
import { BillingService } from '../src/modules/billing/BillingService';

describe('Premier patient collections in the billing cashbook', () => {
  it('loads direct claim receipts by transaction date with patient, claim and cashier context', async () => {
    const from = new Date('2026-11-01T00:00:00.000Z');
    const to = new Date('2026-11-30T23:59:59.999Z');
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new BillingRepository({
      insuranceClaimPatientPayment: { findMany },
    } as any);

    await repository.findPremierClaimPatientCollections(from, to);

    expect(findMany).toHaveBeenCalledWith({
      where: { transactionDate: { gte: from, lte: to } },
      orderBy: { transactionDate: 'desc' },
      include: {
        receivedBy: { select: { id: true, fullName: true, username: true } },
        patient: { select: { surname: true, otherNames: true, folderNumber: true } },
        claim: {
          select: {
            id: true,
            claimNumber: true,
            Attendance: { select: { attendanceNumber: true } },
            InsuranceProvider: { select: { name: true } },
          },
        },
      },
    });
  });

  it('includes direct Premier patient receipts in collections, cashier totals and a separate claims breakdown', async () => {
    const transactionDate = new Date('2026-11-28T09:30:00.000Z');
    const service = new BillingService({} as any);
    (service as any).repository = {
      findCollections: vi.fn().mockResolvedValue([]),
      findRefunds: vi.fn().mockResolvedValue([]),
      findPremierClaimPatientCollections: vi.fn().mockResolvedValue([{
        id: 'claim-payment-1',
        receiptNumber: 'PRC-000123',
        transactionDate,
        amount: 125.5,
        paymentMethod: 'cash',
        reference: 'COUNTER-REF-1',
        notes: 'Premier patient share',
        patient: { surname: 'Mensah', otherNames: 'Ama', folderNumber: 'F-0012' },
        receivedBy: { id: 'cashier-1', fullName: 'Accounts Cashier', username: 'accounts' },
        claim: {
          id: 'claim-1',
          claimNumber: 'CLM-00045',
          Attendance: { attendanceNumber: 'AT-00045' },
          InsuranceProvider: { name: 'Premier Health' },
        },
      }]),
    };

    const report = await service.getCollections(
      new Date('2026-11-01T00:00:00.000Z'),
      new Date('2026-11-30T23:59:59.999Z'),
    );

    expect(report.totalAmount).toBe(125.5);
    expect(report.paymentCount).toBe(1);
    expect(report.netCollected).toBe(125.5);
    expect(report.cashAtHand).toBe(125.5);
    expect(report.payments[0]).toMatchObject({
      id: 'claim-payment-1',
      reference: 'PRC-000123',
      sourceType: 'premier_claim_patient_payment',
      claimNumber: 'CLM-00045',
      attendanceNumber: 'AT-00045',
      providerName: 'Premier Health',
      bill: {
        billNumber: 'CLM-00045',
        customer: { name: 'Mensah Ama', reference: 'F-0012', kind: 'patient' },
      },
    });
    expect(report.groups.find((group: any) => group.key === 'claims')).toMatchObject({
      label: 'Premier Patient Collections',
      subtotal: { collections: 125.5, reversals: 0, balance: 125.5 },
      lines: [{ key: 'claims:premier_patient_share', label: 'Premier patient share', collections: 125.5 }],
    });
    expect(report.cashiers).toContainEqual(expect.objectContaining({
      id: 'cashier-1',
      receipts: 1,
      collections: 125.5,
      balance: 125.5,
      cashAtHand: 125.5,
    }));
  });

  it('does not count non-cash Premier receipts as physical cash', async () => {
    const service = new BillingService({} as any);
    (service as any).repository = {
      findCollections: vi.fn().mockResolvedValue([]),
      findRefunds: vi.fn().mockResolvedValue([]),
      findPremierClaimPatientCollections: vi.fn().mockResolvedValue([{
        id: 'claim-payment-2',
        receiptNumber: 'PRC-000124',
        transactionDate: new Date('2026-11-28T10:00:00.000Z'),
        amount: 80,
        paymentMethod: 'card',
        notes: null,
        patient: { surname: 'Owusu', otherNames: 'Kojo', folderNumber: 'F-0013' },
        receivedBy: { id: 'cashier-2', fullName: 'Card Desk', username: 'carddesk' },
        claim: { id: 'claim-2', claimNumber: 'CLM-00046', Attendance: null, InsuranceProvider: { name: 'Premier Health' } },
      }]),
    };

    const report = await service.getCollections(
      new Date('2026-11-28T00:00:00.000Z'),
      new Date('2026-11-28T23:59:59.999Z'),
    );

    expect(report.totalAmount).toBe(80);
    expect(report.cashAtHand).toBe(0);
    expect(report.cashiers[0].cashAtHand).toBe(0);
  });
});
