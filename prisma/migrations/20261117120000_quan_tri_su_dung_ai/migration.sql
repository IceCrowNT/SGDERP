-- AlterTable
ALTER TABLE "ket_noi_ai" ADD COLUMN     "cau_hinh_gia" JSONB,
ADD COLUMN     "han_muc_chi_phi_thang" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "tai_khoan" ADD COLUMN     "han_muc_ai_thang" DECIMAL(18,6);

-- CreateTable
CREATE TABLE "cau_hinh_tac_vu_ai" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ma_tac_vu" VARCHAR(20) NOT NULL,
    "ket_noi_ai_id" INTEGER,
    "model" VARCHAR(200),
    "cau_hinh_gia" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cau_hinh_tac_vu_ai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhat_ky_goi_ai" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "ket_noi_ai_id" INTEGER NOT NULL,
    "ma_yeu_cau" UUID NOT NULL,
    "buoc" INTEGER NOT NULL,
    "ma_tac_vu" VARCHAR(20) NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "phien_ban_khoa" INTEGER NOT NULL,
    "cau_hinh_gia" JSONB,
    "trang_thai" VARCHAR(20) NOT NULL DEFAULT 'DANG_GOI',
    "token_dau_vao" INTEGER,
    "token_cache" INTEGER,
    "token_dau_ra" INTEGER,
    "chi_phi_uoc_tinh" DECIMAL(18,6),
    "du_phong" DECIMAL(18,6),
    "ma_phan_hoi" VARCHAR(200),
    "http_status" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hoan_tat_at" TIMESTAMP(3),

    CONSTRAINT "nhat_ky_goi_ai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cau_hinh_tac_vu_ai_ket_noi_ai_id_company_id_idx" ON "cau_hinh_tac_vu_ai"("ket_noi_ai_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cau_hinh_tac_vu_ai_company_id_ma_tac_vu_key" ON "cau_hinh_tac_vu_ai"("company_id", "ma_tac_vu");

-- CreateIndex
CREATE INDEX "nhat_ky_goi_ai_company_id_account_id_created_at_idx" ON "nhat_ky_goi_ai"("company_id", "account_id", "created_at");

-- CreateIndex
CREATE INDEX "nhat_ky_goi_ai_company_id_ket_noi_ai_id_created_at_idx" ON "nhat_ky_goi_ai"("company_id", "ket_noi_ai_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "nhat_ky_goi_ai_company_id_account_id_ma_yeu_cau_buoc_key" ON "nhat_ky_goi_ai"("company_id", "account_id", "ma_yeu_cau", "buoc");

-- CreateIndex
CREATE UNIQUE INDEX "ket_noi_ai_id_company_id_key" ON "ket_noi_ai"("id", "company_id");

-- AddForeignKey
ALTER TABLE "cau_hinh_tac_vu_ai" ADD CONSTRAINT "cau_hinh_tac_vu_ai_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cau_hinh_tac_vu_ai" ADD CONSTRAINT "cau_hinh_tac_vu_ai_ket_noi_ai_id_company_id_fkey" FOREIGN KEY ("ket_noi_ai_id", "company_id") REFERENCES "ket_noi_ai"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhat_ky_goi_ai" ADD CONSTRAINT "nhat_ky_goi_ai_account_id_company_id_fkey" FOREIGN KEY ("account_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhat_ky_goi_ai" ADD CONSTRAINT "nhat_ky_goi_ai_ket_noi_ai_id_company_id_fkey" FOREIGN KEY ("ket_noi_ai_id", "company_id") REFERENCES "ket_noi_ai"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE tai_khoan ADD CONSTRAINT tai_khoan_ai_limit_check CHECK (han_muc_ai_thang >= 0);
ALTER TABLE ket_noi_ai ADD CONSTRAINT ket_noi_ai_limit_check CHECK (han_muc_chi_phi_thang >= 0);
ALTER TABLE cau_hinh_tac_vu_ai ADD CONSTRAINT cau_hinh_tac_vu_ai_job_check CHECK (ma_tac_vu IN ('GENERAL','LOOKUP','DRAFT'));
ALTER TABLE nhat_ky_goi_ai ADD CONSTRAINT nhat_ky_goi_ai_values_check CHECK (
 buoc >= 0 AND phien_ban_khoa >= 1 AND du_phong >= 0 AND chi_phi_uoc_tinh >= 0
 AND token_dau_vao >= 0 AND token_dau_ra >= 0 AND token_cache >= 0 AND token_cache <= token_dau_vao
 AND ma_tac_vu IN ('GENERAL','LOOKUP','DRAFT')
 AND trang_thai IN ('DANG_GOI','HOAN_TAT','LOI','CHUA_RO','CHUA_GIA','DOI_SOAT')
 AND (trang_thai <> 'HOAN_TAT' OR (token_dau_vao IS NOT NULL AND token_cache IS NOT NULL AND token_dau_ra IS NOT NULL AND chi_phi_uoc_tinh IS NOT NULL AND du_phong = 0 AND hoan_tat_at IS NOT NULL))
 AND (trang_thai <> 'DOI_SOAT' OR (chi_phi_uoc_tinh IS NOT NULL AND du_phong = 0 AND hoan_tat_at IS NOT NULL))
);
INSERT INTO quyen (phan_he, hanh_dong, ten_quyen, pham_vi, created_at, updated_at)
VALUES ('AI','MANAGE_LIMITS','Quản lý hạn mức AI','ALL',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
 ('AI','VIEW_USAGE','Xem mức sử dụng AI trong công ty','ALL',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (phan_he, hanh_dong) DO NOTHING;
