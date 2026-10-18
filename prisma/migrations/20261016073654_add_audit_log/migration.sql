-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" VARCHAR(100) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(100),
    "targetName" VARCHAR(255),
    "description" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" VARCHAR(50),
    "userAgent" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_companyId_module_createdAt_idx" ON "AuditLog"("companyId", "module", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
