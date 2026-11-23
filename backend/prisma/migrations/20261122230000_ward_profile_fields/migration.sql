-- Persist the ward profile fields already collected by Ward Management.
ALTER TABLE "Ward"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "floor" TEXT;
