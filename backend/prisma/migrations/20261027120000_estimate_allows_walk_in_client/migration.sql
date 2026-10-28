-- An estimate is a quote: a walk-in client can be priced and printed a copy
-- before anyone registers them, so the patient link stops being mandatory.
ALTER TABLE "ProformaInvoice" ALTER COLUMN "patientId" DROP NOT NULL;
