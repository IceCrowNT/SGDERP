ALTER TABLE "tai_khoan" ADD COLUMN "huong_dan_ai_ca_nhan" TEXT;
ALTER TABLE "tai_khoan" ADD CONSTRAINT "tai_khoan_ai_ca_nhan_check" CHECK (char_length("huong_dan_ai_ca_nhan") <= 2000);
CREATE TABLE "hoi_thoai_ai" (
 "id" SERIAL PRIMARY KEY, "company_id" INTEGER NOT NULL, "account_id" INTEGER NOT NULL,
 "tieu_de" VARCHAR(200) NOT NULL DEFAULT 'Cuộc trò chuyện', "trang_thai" VARCHAR(20) NOT NULL DEFAULT 'DANG_MO',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "hoi_thoai_ai_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "hoi_thoai_ai_account_id_company_id_fkey" FOREIGN KEY ("account_id","company_id") REFERENCES "tai_khoan"("id","company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "hoi_thoai_ai_status_check" CHECK ("trang_thai" IN ('DANG_MO','LUU_TRU'))
);
CREATE UNIQUE INDEX "hoi_thoai_ai_id_company_id_key" ON "hoi_thoai_ai"("id","company_id");
CREATE INDEX "hoi_thoai_ai_company_id_account_id_updated_at_id_idx" ON "hoi_thoai_ai"("company_id","account_id","updated_at","id");
CREATE TABLE "tin_nhan_ai" (
 "id" SERIAL PRIMARY KEY, "company_id" INTEGER NOT NULL, "hoi_thoai_id" INTEGER NOT NULL,
 "ma_yeu_cau" UUID NOT NULL, "vai_tro" VARCHAR(20) NOT NULL, "noi_dung" TEXT NOT NULL,
 "du_lieu_kem_theo" JSONB, "trang_thai" VARCHAR(20) NOT NULL, "ma_xu_ly" UUID, "het_han_xu_ly" TIMESTAMP(3),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "tin_nhan_ai_hoi_thoai_id_company_id_fkey" FOREIGN KEY ("hoi_thoai_id","company_id") REFERENCES "hoi_thoai_ai"("id","company_id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "tin_nhan_ai_role_check" CHECK ("vai_tro" IN ('NGUOI_DUNG','TRO_LY')),
 CONSTRAINT "tin_nhan_ai_status_check" CHECK ("trang_thai" IN ('DANG_XU_LY','HOAN_TAT','LOI','GIAN_DOAN')),
 CONSTRAINT "tin_nhan_ai_user_check" CHECK ("vai_tro" <> 'NGUOI_DUNG' OR ("trang_thai" = 'HOAN_TAT' AND char_length("noi_dung") BETWEEN 1 AND 2000)),
 CONSTRAINT "tin_nhan_ai_length_check" CHECK (char_length("noi_dung") <= 8000),
 CONSTRAINT "tin_nhan_ai_lease_check" CHECK (("trang_thai" = 'DANG_XU_LY') = ("ma_xu_ly" IS NOT NULL AND "het_han_xu_ly" IS NOT NULL) AND (("ma_xu_ly" IS NULL) = ("het_han_xu_ly" IS NULL))),
 CONSTRAINT "tin_nhan_ai_context_check" CHECK ("du_lieu_kem_theo" IS NULL OR jsonb_typeof("du_lieu_kem_theo") = 'object')
);
CREATE UNIQUE INDEX "tin_nhan_ai_id_company_id_key" ON "tin_nhan_ai"("id","company_id");
CREATE UNIQUE INDEX "tin_nhan_ai_hoi_thoai_id_ma_yeu_cau_vai_tro_key" ON "tin_nhan_ai"("hoi_thoai_id","ma_yeu_cau","vai_tro");
CREATE UNIQUE INDEX "tin_nhan_ai_company_id_ma_yeu_cau_vai_tro_key" ON "tin_nhan_ai"("company_id","ma_yeu_cau","vai_tro");
CREATE INDEX "tin_nhan_ai_company_id_hoi_thoai_id_id_idx" ON "tin_nhan_ai"("company_id","hoi_thoai_id","id");
CREATE UNIQUE INDEX "tin_nhan_ai_one_pending" ON "tin_nhan_ai"("hoi_thoai_id") WHERE "trang_thai" = 'DANG_XU_LY';
CREATE FUNCTION "giu_chu_hoi_thoai_ai"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.company_id <> OLD.company_id OR NEW.account_id <> OLD.account_id THEN RAISE EXCEPTION 'Conversation owner is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "hoi_thoai_ai_chu_bat_bien" BEFORE UPDATE ON "hoi_thoai_ai" FOR EACH ROW EXECUTE FUNCTION "giu_chu_hoi_thoai_ai"();
