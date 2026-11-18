// Payer allocation used only when materialising demo bills. Live billing rules remain
// owned by BillRepository; this helper makes the seed's receivables match the claim workflow.
export interface SeedPayerLineInput {
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  quantity: number;
  lineTotal: number;
  unitPrice: number;
  cashPrice?: number | null;
  nhisPrice?: number | null;
  isNHISCovered?: boolean;
  existingInsuranceCoveredAmount?: number;
  existingPatientPayableAmount?: number;
}

export interface SeedPayerLineAllocation {
  lineTotal: number;
  unitPrice: number;
  insuranceCoveredAmount: number;
  patientPayableAmount: number;
}

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Private and corporate invoices are receivables, not front-desk collections.
 * NHIS covered non-medicine services retain the cash charge and split the tariff:
 * NHIS pays up to its tariff; the patient pays the cash-price difference. Uncovered
 * items remain fully patient-payable. NHIS medicine eligibility is checked against the
 * existing StockItem payer rule before this helper is called.
 */
export const allocateSeedPayerLine = (input: SeedPayerLineInput): SeedPayerLineAllocation => {
  const lineTotal = roundMoney(Math.max(0, input.lineTotal));
  const quantity = Math.max(1, input.quantity || 1);

  if (input.paymentMode === 'private_insurance' || input.paymentMode === 'corporate') {
    return { lineTotal, unitPrice: roundMoney(lineTotal / quantity), insuranceCoveredAmount: lineTotal, patientPayableAmount: 0 };
  }

  if (input.paymentMode !== 'nhis' ||
      input.cashPrice == null || !Number.isFinite(input.cashPrice) || input.cashPrice < 0) {
    return {
      lineTotal,
      unitPrice: roundMoney(input.unitPrice),
      insuranceCoveredAmount: roundMoney(input.existingInsuranceCoveredAmount ?? 0),
      patientPayableAmount: roundMoney(input.existingPatientPayableAmount ?? lineTotal),
    };
  }

  const cashTotal = roundMoney(input.cashPrice * quantity);
  const nhisTariff = input.isNHISCovered === true && input.nhisPrice != null &&
    Number.isFinite(input.nhisPrice) && input.nhisPrice > 0
    ? roundMoney(Math.min(input.cashPrice, input.nhisPrice) * quantity)
    : 0;

  return {
    lineTotal: cashTotal,
    unitPrice: roundMoney(input.cashPrice),
    insuranceCoveredAmount: nhisTariff,
    patientPayableAmount: roundMoney(Math.max(0, cashTotal - nhisTariff)),
  };
};
