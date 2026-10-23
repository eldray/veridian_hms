-- Add structured peri-operative safety checklist and handover details.
ALTER TABLE "Procedure" ADD COLUMN "clinicalRecord" JSONB;
