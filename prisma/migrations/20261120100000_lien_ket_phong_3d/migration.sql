CREATE TABLE "lien_ket_phong_3d" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "khoa_phong" VARCHAR(80) NOT NULL,
    "vi_tri_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lien_ket_phong_3d_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lien_ket_phong_3d_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lien_ket_phong_3d_vi_tri_id_company_id_fkey" FOREIGN KEY ("vi_tri_id", "company_id") REFERENCES "vi_tri"("id", "company_id") ON DELETE CASCADE ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "lien_ket_phong_3d_company_id_khoa_phong_key" ON "lien_ket_phong_3d"("company_id", "khoa_phong");
CREATE UNIQUE INDEX "lien_ket_phong_3d_vi_tri_id_company_id_key" ON "lien_ket_phong_3d"("vi_tri_id", "company_id");
