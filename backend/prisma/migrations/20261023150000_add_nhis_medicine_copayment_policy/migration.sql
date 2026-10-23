-- Add explicit payer-rule co-payment configuration for NHIS medicines.
-- Existing rows default to no patient contribution; tariff gaps are never charged automatically.
ALTER TABLE "stock_item_payer_rules"
  ADD COLUMN "copaymentMode" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "copaymentAmount" DECIMAL(15,2),
  ADD COLUMN "copaymentPercentage" DOUBLE PRECISION;

ALTER TABLE "stock_item_payer_rules"
  ADD CONSTRAINT "stock_item_payer_rules_copayment_mode_check"
  CHECK ("copaymentMode" IN ('none', 'fixed_amount', 'percentage', 'cash_price_difference'));

ALTER TABLE "stock_item_payer_rules"
  ADD CONSTRAINT "stock_item_payer_rules_copayment_percentage_check"
  CHECK ("copaymentPercentage" IS NULL OR ("copaymentPercentage" >= 0 AND "copaymentPercentage" <= 100));

ALTER TABLE "stock_item_payer_rules"
  ADD CONSTRAINT "stock_item_payer_rules_copayment_amount_check"
  CHECK ("copaymentAmount" IS NULL OR "copaymentAmount" >= 0);
