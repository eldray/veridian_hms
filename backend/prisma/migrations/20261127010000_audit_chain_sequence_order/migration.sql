BEGIN;

-- Prevent appends between the historical backfill and sequence activation.
LOCK TABLE "audit_logs" IN ACCESS EXCLUSIVE MODE;

-- Preserve the audit verifier's existing CUID order for historical rows,
-- then use a PostgreSQL sequence for every subsequent append.
CREATE SEQUENCE "audit_logs_chainSequence_seq";

ALTER TABLE "audit_logs"
ADD COLUMN "chainSequence" BIGINT;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "id" ASC) AS sequence_number
  FROM "audit_logs"
)
UPDATE "audit_logs" AS audit
SET "chainSequence" = ordered.sequence_number
FROM ordered
WHERE audit."id" = ordered."id";

SELECT setval(
  '"audit_logs_chainSequence_seq"',
  COALESCE(MAX("chainSequence"), 1),
  MAX("chainSequence") IS NOT NULL
)
FROM "audit_logs";

ALTER SEQUENCE "audit_logs_chainSequence_seq"
OWNED BY "audit_logs"."chainSequence";

ALTER TABLE "audit_logs"
ALTER COLUMN "chainSequence"
SET DEFAULT nextval('"audit_logs_chainSequence_seq"');

ALTER TABLE "audit_logs"
ALTER COLUMN "chainSequence" SET NOT NULL;

CREATE UNIQUE INDEX "audit_logs_chainSequence_key"
ON "audit_logs"("chainSequence");

COMMIT;
