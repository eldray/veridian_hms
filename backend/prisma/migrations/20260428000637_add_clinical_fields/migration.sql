-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "historyPresentingComplaint" TEXT,
ADD COLUMN     "onsetDurationQuality" TEXT,
ADD COLUMN     "physicalExamination" TEXT,
ADD COLUMN     "treatmentPlan" TEXT;
