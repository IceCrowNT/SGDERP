CREATE UNIQUE INDEX "tin_nhan_ai_id_hoi_thoai_id_company_id_key" ON "tin_nhan_ai"("id", "hoi_thoai_id", "company_id");
CREATE TABLE "tep_dinh_kem_ai" (
 "id" SERIAL PRIMARY KEY, "company_id" INTEGER NOT NULL, "account_id" INTEGER NOT NULL,
 "hoi_thoai_id" INTEGER, "tin_nhan_id" INTEGER, "ma_tai_len" UUID NOT NULL,
 "ten_tep" VARCHAR(200) NOT NULL, "loai_tep" VARCHAR(20) NOT NULL, "dung_luong" INTEGER NOT NULL,
 "khoa_luu_tru" UUID NOT NULL, "tom_tat" JSONB NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "tep_ai_lien_ket_check" CHECK (("hoi_thoai_id" IS NULL) = ("tin_nhan_id" IS NULL)),
 CONSTRAINT "tep_ai_dung_luong_check" CHECK ("dung_luong" > 0 AND "dung_luong" <= 10485760),
 CONSTRAINT "tep_ai_loai_check" CHECK ("loai_tep" IN ('image','docx','xlsx','csv')),
 CONSTRAINT "tep_dinh_kem_ai_account_id_company_id_fkey" FOREIGN KEY ("account_id","company_id") REFERENCES "tai_khoan"("id","company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "tep_dinh_kem_ai_hoi_thoai_id_company_id_fkey" FOREIGN KEY ("hoi_thoai_id","company_id") REFERENCES "hoi_thoai_ai"("id","company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "tep_dinh_kem_ai_tin_nhan_id_hoi_thoai_id_company_id_fkey" FOREIGN KEY ("tin_nhan_id","hoi_thoai_id","company_id") REFERENCES "tin_nhan_ai"("id","hoi_thoai_id","company_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tep_dinh_kem_ai_khoa_luu_tru_key" ON "tep_dinh_kem_ai"("khoa_luu_tru");
CREATE UNIQUE INDEX "tep_dinh_kem_ai_company_id_account_id_ma_tai_len_key" ON "tep_dinh_kem_ai"("company_id","account_id","ma_tai_len");
CREATE INDEX "tep_dinh_kem_ai_company_id_account_id_hoi_thoai_id_idx" ON "tep_dinh_kem_ai"("company_id","account_id","hoi_thoai_id");
