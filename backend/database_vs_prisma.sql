-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "dispensedQuantity" INTEGER;

-- CreateTable
CREATE TABLE "_UserAdditionalDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserAdditionalDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserAdditionalDepartments_B_index" ON "_UserAdditionalDepartments"("B");

-- AddForeignKey
ALTER TABLE "_UserAdditionalDepartments" ADD CONSTRAINT "_UserAdditionalDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAdditionalDepartments" ADD CONSTRAINT "_UserAdditionalDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

