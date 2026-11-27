-- Create dedicated patient collection ledger for Premier capped private claims.
CREATE TABLE "insurance_claim_patient_payments" (
  "id" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedById" TEXT NOT NULL,
  "notes" TEXT,
  "receiptFilePath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insurance_claim_patient_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_claim_patient_payments_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "insurance_claim_patient_payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "insurance_claim_patient_payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "insurance_claim_patient_payments_receiptNumber_key" ON "insurance_claim_patient_payments"("receiptNumber");
CREATE UNIQUE INDEX "insurance_claim_patient_payments_idempotencyKey_key" ON "insurance_claim_patient_payments"("idempotencyKey");
CREATE INDEX "insurance_claim_patient_payments_claimId_transactionDate_idx" ON "insurance_claim_patient_payments"("claimId","transactionDate");
CREATE INDEX "insurance_claim_patient_payments_patientId_transactionDate_idx" ON "insurance_claim_patient_payments"("patientId","transactionDate");
