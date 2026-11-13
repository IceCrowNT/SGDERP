CREATE TABLE "vat_the_3d" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER NOT NULL,
  "vi_tri_id" INTEGER NOT NULL,
  "phong_id" INTEGER NOT NULL,
  "loai_vat_the" VARCHAR(10) NOT NULL,
  "toa_do_x" DOUBLE PRECISION NOT NULL,
  "toa_do_z" DOUBLE PRECISION NOT NULL,
  "goc_xoay" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vat_the_3d_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vat_the_3d_loai_check" CHECK ("loai_vat_the" IN ('BAN','DIEM')),
  CONSTRAINT "vat_the_3d_toa_do_check" CHECK ("toa_do_x" BETWEEN -100 AND 100 AND "toa_do_z" BETWEEN -100 AND 100),
  CONSTRAINT "vat_the_3d_goc_check" CHECK ("goc_xoay" IN (0,90,180,270)),
  CONSTRAINT "vat_the_3d_phong_check" CHECK ("vi_tri_id" <> "phong_id"),
  CONSTRAINT "vat_the_3d_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "vat_the_3d_vi_tri_id_company_id_fkey" FOREIGN KEY ("vi_tri_id","company_id") REFERENCES "vi_tri"("id","company_id") ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT "vat_the_3d_phong_id_company_id_fkey" FOREIGN KEY ("phong_id","company_id") REFERENCES "vi_tri"("id","company_id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "vat_the_3d_vi_tri_id_company_id_key" ON "vat_the_3d"("vi_tri_id","company_id");
CREATE INDEX "vat_the_3d_company_id_phong_id_idx" ON "vat_the_3d"("company_id","phong_id");
