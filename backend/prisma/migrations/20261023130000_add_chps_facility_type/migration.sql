-- Add CHPS as an explicit facility class so NHIS level A medicines
-- can be restricted to the correct facility type.
ALTER TYPE "FacilityType" ADD VALUE IF NOT EXISTS 'CHPS';
