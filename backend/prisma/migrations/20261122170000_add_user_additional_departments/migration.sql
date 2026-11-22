-- Add secondary department memberships without changing the existing primary departmentId.
CREATE TABLE "_UserAdditionalDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Prisma implicit many-to-many convention: A = Department, B = User.
CREATE UNIQUE INDEX "_UserAdditionalDepartments_AB_unique" ON "_UserAdditionalDepartments"("A", "B");
CREATE INDEX "_UserAdditionalDepartments_B_index" ON "_UserAdditionalDepartments"("B");

ALTER TABLE "_UserAdditionalDepartments"
  ADD CONSTRAINT "_UserAdditionalDepartments_A_fkey"
  FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_UserAdditionalDepartments"
  ADD CONSTRAINT "_UserAdditionalDepartments_B_fkey"
  FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
