-- CreateEnum
CREATE TYPE "AssetTrackingMode" AS ENUM ('INDIVIDUAL', 'QUANTITY');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'IN_USE', 'UNDER_MAINTENANCE', 'BROKEN', 'LOST', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('UNKNOWN', 'NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "PhysicalLocationType" AS ENUM ('BUILDING', 'FLOOR', 'ROOM', 'ZONE', 'RACK', 'STORAGE');

-- CreateEnum
CREATE TYPE "AssetInventoryDocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetAssignmentType" AS ENUM ('USER', 'DEPARTMENT', 'SHARED');

-- CreateEnum
CREATE TYPE "AssetMaintenanceType" AS ENUM ('INSPECTION', 'PREVENTIVE', 'REPAIR', 'REPLACEMENT', 'UPGRADE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('REPORTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "trackingMode" "AssetTrackingMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalLocation" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "PhysicalLocationType" NOT NULL,
    "description" TEXT,
    "floorNumber" INTEGER,
    "threeDKey" VARCHAR(100),
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "positionZ" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhysicalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetInventoryDocument" (
    "id" SERIAL NOT NULL,
    "documentNumber" VARCHAR(100) NOT NULL,
    "documentDate" DATE,
    "title" VARCHAR(255) NOT NULL,
    "transferorName" VARCHAR(255),
    "transferorPosition" VARCHAR(100),
    "recipientName" VARCHAR(255),
    "recipientPosition" VARCHAR(100),
    "sourceFile" TEXT,
    "status" "AssetInventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInventoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetInventoryLine" (
    "id" SERIAL NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL DEFAULT 'Cái',
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetInventoryLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "assetCode" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "serialNumber" VARCHAR(255),
    "manufacturer" VARCHAR(255),
    "model" VARCHAR(255),
    "specifications" JSONB,
    "purchaseDate" DATE,
    "warrantyEndDate" DATE,
    "originalValue" DECIMAL(18,2),
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_STOCK',
    "condition" "AssetCondition" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "sourceLineId" INTEGER,
    "currentLocationId" INTEGER,
    "currentCustodianId" INTEGER,
    "currentDepartmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" SERIAL NOT NULL,
    "assignmentType" "AssetAssignmentType" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "conditionOnAssign" "AssetCondition" NOT NULL DEFAULT 'UNKNOWN',
    "conditionOnReturn" "AssetCondition",
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "assignedToUserId" INTEGER,
    "assignedToDepartmentId" INTEGER,
    "assignedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetLocationHistory" (
    "id" SERIAL NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "changedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetLocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMaintenance" (
    "id" SERIAL NOT NULL,
    "maintenanceCode" VARCHAR(100) NOT NULL,
    "type" "AssetMaintenanceType" NOT NULL,
    "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'REPORTED',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "vendorName" VARCHAR(255),
    "cost" DECIMAL(18,2),
    "result" TEXT,
    "nextMaintenanceAt" TIMESTAMP(3),
    "companyId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "requestedById" INTEGER,
    "technicianId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCategory_companyId_isActive_idx" ON "AssetCategory"("companyId", "isActive");
CREATE UNIQUE INDEX "AssetCategory_companyId_code_key" ON "AssetCategory"("companyId", "code");
CREATE UNIQUE INDEX "AssetCategory_companyId_name_key" ON "AssetCategory"("companyId", "name");
CREATE INDEX "PhysicalLocation_companyId_type_isActive_idx" ON "PhysicalLocation"("companyId", "type", "isActive");
CREATE INDEX "PhysicalLocation_parentId_idx" ON "PhysicalLocation"("parentId");
CREATE INDEX "PhysicalLocation_departmentId_idx" ON "PhysicalLocation"("departmentId");
CREATE UNIQUE INDEX "PhysicalLocation_companyId_code_key" ON "PhysicalLocation"("companyId", "code");
CREATE UNIQUE INDEX "PhysicalLocation_companyId_threeDKey_key" ON "PhysicalLocation"("companyId", "threeDKey");
CREATE INDEX "AssetInventoryDocument_companyId_status_documentDate_idx" ON "AssetInventoryDocument"("companyId", "status", "documentDate");
CREATE UNIQUE INDEX "AssetInventoryDocument_companyId_documentNumber_key" ON "AssetInventoryDocument"("companyId", "documentNumber");
CREATE INDEX "AssetInventoryLine_companyId_categoryId_idx" ON "AssetInventoryLine"("companyId", "categoryId");
CREATE UNIQUE INDEX "AssetInventoryLine_documentId_lineNumber_key" ON "AssetInventoryLine"("documentId", "lineNumber");
CREATE INDEX "Asset_companyId_categoryId_status_idx" ON "Asset"("companyId", "categoryId", "status");
CREATE INDEX "Asset_currentLocationId_idx" ON "Asset"("currentLocationId");
CREATE INDEX "Asset_currentCustodianId_idx" ON "Asset"("currentCustodianId");
CREATE INDEX "Asset_currentDepartmentId_idx" ON "Asset"("currentDepartmentId");
CREATE INDEX "Asset_sourceLineId_idx" ON "Asset"("sourceLineId");
CREATE UNIQUE INDEX "Asset_companyId_assetCode_key" ON "Asset"("companyId", "assetCode");
CREATE UNIQUE INDEX "Asset_companyId_serialNumber_key" ON "Asset"("companyId", "serialNumber");
CREATE INDEX "AssetAssignment_companyId_assignedAt_idx" ON "AssetAssignment"("companyId", "assignedAt");
CREATE INDEX "AssetAssignment_assetId_returnedAt_idx" ON "AssetAssignment"("assetId", "returnedAt");
CREATE INDEX "AssetAssignment_assignedToUserId_idx" ON "AssetAssignment"("assignedToUserId");
CREATE INDEX "AssetAssignment_assignedToDepartmentId_idx" ON "AssetAssignment"("assignedToDepartmentId");
CREATE INDEX "AssetLocationHistory_companyId_placedAt_idx" ON "AssetLocationHistory"("companyId", "placedAt");
CREATE INDEX "AssetLocationHistory_assetId_removedAt_idx" ON "AssetLocationHistory"("assetId", "removedAt");
CREATE INDEX "AssetLocationHistory_locationId_removedAt_idx" ON "AssetLocationHistory"("locationId", "removedAt");
CREATE INDEX "AssetMaintenance_companyId_status_scheduledAt_idx" ON "AssetMaintenance"("companyId", "status", "scheduledAt");
CREATE INDEX "AssetMaintenance_assetId_reportedAt_idx" ON "AssetMaintenance"("assetId", "reportedAt");
CREATE INDEX "AssetMaintenance_requestedById_idx" ON "AssetMaintenance"("requestedById");
CREATE INDEX "AssetMaintenance_technicianId_idx" ON "AssetMaintenance"("technicianId");
CREATE UNIQUE INDEX "AssetMaintenance_companyId_maintenanceCode_key" ON "AssetMaintenance"("companyId", "maintenanceCode");

-- AddForeignKey
ALTER TABLE "AssetCategory" ADD CONSTRAINT "AssetCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalLocation" ADD CONSTRAINT "PhysicalLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PhysicalLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalLocation" ADD CONSTRAINT "PhysicalLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PhysicalLocation" ADD CONSTRAINT "PhysicalLocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetInventoryDocument" ADD CONSTRAINT "AssetInventoryDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetInventoryLine" ADD CONSTRAINT "AssetInventoryLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetInventoryLine" ADD CONSTRAINT "AssetInventoryLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AssetInventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetInventoryLine" ADD CONSTRAINT "AssetInventoryLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sourceLineId_fkey" FOREIGN KEY ("sourceLineId") REFERENCES "AssetInventoryLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "PhysicalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentCustodianId_fkey" FOREIGN KEY ("currentCustodianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentDepartmentId_fkey" FOREIGN KEY ("currentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assignedToDepartmentId_fkey" FOREIGN KEY ("assignedToDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetLocationHistory" ADD CONSTRAINT "AssetLocationHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetLocationHistory" ADD CONSTRAINT "AssetLocationHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetLocationHistory" ADD CONSTRAINT "AssetLocationHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "PhysicalLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetLocationHistory" ADD CONSTRAINT "AssetLocationHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetMaintenance" ADD CONSTRAINT "AssetMaintenance_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
