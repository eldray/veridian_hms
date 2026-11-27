-- Preserve the ordering used by the existing verifier before switching to an
-- explicit database sequence. The advisory transaction lock serializes all new
-- chain appends; nextval() then gives each committed append a stable order.
CREATE SEQUENCE "audit_logs_chainSequence_seq";

ALTER TABLE "audit_logs" ADD COLUMN "chainSequence" INTEGER;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id" ASC)::INTEGER AS sequence
  FROM "audit_logs"
)
UPDATE "audit_logs" AS audit
SET "chainSequence" = ordered.sequence
FROM ordered
WHERE audit."id" = ordered."id";

SELECT setval(
  '"audit_logs_chainSequence_seq"',
  COALESCE((SELECT MAX("chainSequence") FROM "audit_logs"), 1),
  EXISTS (SELECT 1 FROM "audit_logs")
);

ALTER TABLE "audit_logs"
  ALTER COLUMN "chainSequence" SET DEFAULT nextval('"audit_logs_chainSequence_seq"'::regclass),
  ALTER COLUMN "chainSequence" SET NOT NULL;

CREATE UNIQUE INDEX "audit_logs_chainSequence_key" ON "audit_logs"("chainSequence");
