-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "externalId" VARCHAR(100),
ADD COLUMN     "externalLevel" INTEGER,
ADD COLUMN     "externalName" VARCHAR(255),
ADD COLUMN     "externalParentId" VARCHAR(100),
ADD COLUMN     "externalPath" TEXT,
ADD COLUMN     "externalSnapshotAt" TIMESTAMP(3),
ADD COLUMN     "externalSupervisorName" VARCHAR(255),
ADD COLUMN     "externalSystem" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Department_companyId_externalSystem_idx" ON "Department"("companyId", "externalSystem");

-- CreateIndex
CREATE INDEX "Department_externalParentId_idx" ON "Department"("externalParentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_externalSystem_externalId_key" ON "Department"("companyId", "externalSystem", "externalId");
