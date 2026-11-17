CREATE TABLE "cong_viec_ai" (
  "id" SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "account_id" INTEGER NOT NULL,
  "ma_yeu_cau" UUID NOT NULL,
  "loai_cong_viec" VARCHAR(50) NOT NULL,
  "phien_ban" INTEGER NOT NULL DEFAULT 1,
  "trang_thai" VARCHAR(30) NOT NULL DEFAULT 'CHO_DUYET',
  "noi_dung" JSONB NOT NULL,
  "ket_qua" JSONB,
  "thoi_diem_duyet" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cong_viec_ai_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cong_viec_ai_account_id_company_id_fkey" FOREIGN KEY ("account_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cong_viec_ai_version_check" CHECK ("phien_ban" > 0),
  CONSTRAINT "cong_viec_ai_kind_check" CHECK ("loai_cong_viec" = 'KHAU_HAO_LOAI'),
  CONSTRAINT "cong_viec_ai_status_check" CHECK ("trang_thai" IN ('CHO_DUYET','CAN_LAM_MOI','DA_HUY','HOAN_TAT','KHONG_CAN_DOI')),
  CONSTRAINT "cong_viec_ai_content_check" CHECK (jsonb_typeof("noi_dung") = 'object'),
  CONSTRAINT "cong_viec_ai_result_check" CHECK (("trang_thai" IN ('HOAN_TAT','KHONG_CAN_DOI')) = ("ket_qua" IS NOT NULL)),
  CONSTRAINT "cong_viec_ai_approval_check" CHECK (("trang_thai" = 'HOAN_TAT') = ("thoi_diem_duyet" IS NOT NULL))
);
CREATE UNIQUE INDEX "cong_viec_ai_company_id_account_id_ma_yeu_cau_key" ON "cong_viec_ai"("company_id","account_id","ma_yeu_cau");
CREATE INDEX "cong_viec_ai_company_id_account_id_id_idx" ON "cong_viec_ai"("company_id","account_id","id");
