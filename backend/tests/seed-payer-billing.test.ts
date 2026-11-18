import { describe, expect, it } from 'vitest';
import { allocateSeedPayerLine } from '../src/seed/testSeed/payerAllocation';

describe('seeded bill payer allocation', () => {
  const base = {
    quantity: 1,
    lineTotal: 100,
    unitPrice: 100,
    cashPrice: 100,
    nhisPrice: 65,
    isNHISCovered: true,
  };

  it('routes the full private-insurance bill to the insurer, with no patient collection', () => {
    expect(allocateSeedPayerLine({ ...base, paymentMode: 'private_insurance' })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 100,
      patientPayableAmount: 0,
    });
  });

  it('routes the full corporate bill to the corporate claim, with no patient collection', () => {
    expect(allocateSeedPayerLine({ ...base, paymentMode: 'corporate' })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 100,
      patientPayableAmount: 0,
    });
  });

  it('splits a covered NHIS service into NHIS tariff and cash-price difference', () => {
    expect(allocateSeedPayerLine({ ...base, paymentMode: 'nhis' })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 65,
      patientPayableAmount: 35,
    });
  });

  it('leaves an uncovered NHIS service fully patient-payable at cash price', () => {
    expect(allocateSeedPayerLine({ ...base, paymentMode: 'nhis', isNHISCovered: false })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 0,
      patientPayableAmount: 100,
    });
  });

  it('does not over-allocate when the NHIS tariff is higher than the cash price', () => {
    expect(allocateSeedPayerLine({ ...base, paymentMode: 'nhis', nhisPrice: 120 })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 100,
      patientPayableAmount: 0,
    });
  });

  it('applies the cash-minus-NHIS-tariff difference to covered medicines too', () => {
    expect(allocateSeedPayerLine({
      ...base,
      paymentMode: 'nhis',
      existingInsuranceCoveredAmount: 65,
      existingPatientPayableAmount: 0,
    })).toEqual({
      lineTotal: 100,
      unitPrice: 100,
      insuranceCoveredAmount: 65,
      patientPayableAmount: 35,
    });
  });
});
