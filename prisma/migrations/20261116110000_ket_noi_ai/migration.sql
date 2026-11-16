CREATE TABLE "ket_noi_ai" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "model_mac_dinh" VARCHAR(200) NOT NULL,
    "tham_chieu_bi_mat" VARCHAR(36) NOT NULL,
    "hau_to_khoa" VARCHAR(4) NOT NULL,
    "phien_ban_khoa" INTEGER NOT NULL DEFAULT 1,
    "dang_su_dung" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ket_noi_ai_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ket_noi_ai_model_check" CHECK ("model_mac_dinh" ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'),
    CONSTRAINT "ket_noi_ai_secret_ref_check" CHECK ("tham_chieu_bi_mat" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
    CONSTRAINT "ket_noi_ai_key_version_check" CHECK ("phien_ban_khoa" >= 1),
    CONSTRAINT "ket_noi_ai_key_suffix_check" CHECK (length("hau_to_khoa") = 4)
);
CREATE UNIQUE INDEX "ket_noi_ai_company_id_key" ON "ket_noi_ai"("company_id");
ALTER TABLE "ket_noi_ai" ADD CONSTRAINT "ket_noi_ai_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
