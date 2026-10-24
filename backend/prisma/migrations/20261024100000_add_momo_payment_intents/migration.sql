CREATE TABLE "momo_payment_intents" (
  "id" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "payerPhone" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "paymentIdempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "providerStatus" TEXT,
  "providerTransactionId" TEXT,
  "paymentId" TEXT,
  "initiatedById" TEXT NOT NULL,
  "lastCheckedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "momo_payment_intents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "momo_payment_intents_providerReference_key" ON "momo_payment_intents"("providerReference");
CREATE UNIQUE INDEX "momo_payment_intents_idempotencyKey_key" ON "momo_payment_intents"("idempotencyKey");
CREATE UNIQUE INDEX "momo_payment_intents_paymentIdempotencyKey_key" ON "momo_payment_intents"("paymentIdempotencyKey");
CREATE INDEX "momo_payment_intents_billId_status_idx" ON "momo_payment_intents"("billId", "status");
CREATE INDEX "momo_payment_intents_initiatedById_createdAt_idx" ON "momo_payment_intents"("initiatedById", "createdAt");
ALTER TABLE "momo_payment_intents" ADD CONSTRAINT "momo_payment_intents_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
