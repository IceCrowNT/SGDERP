ALTER TABLE "vat_the_3d"
  ADD COLUMN "chieu_rong" DOUBLE PRECISION NOT NULL DEFAULT 1.6,
  ADD COLUMN "chieu_sau" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  ADD COLUMN "khoa_cu" VARCHAR(80);
UPDATE "vat_the_3d" SET "chieu_rong" = 0.7, "chieu_sau" = 0.7 WHERE "loai_vat_the" = 'DIEM';
ALTER TABLE "vat_the_3d" ADD CONSTRAINT "vat_the_3d_kich_thuoc_check"
  CHECK ("chieu_rong" BETWEEN 0.1 AND 10 AND "chieu_sau" BETWEEN 0.1 AND 10);
CREATE UNIQUE INDEX "vat_the_3d_company_id_khoa_cu_key" ON "vat_the_3d"("company_id", "khoa_cu");
