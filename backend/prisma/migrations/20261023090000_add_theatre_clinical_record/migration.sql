-- Add structured peri-operative safety checklist and handover details.
ALTER TABLE "procedures" ADD COLUMN "clinicalRecord" JSONB;
