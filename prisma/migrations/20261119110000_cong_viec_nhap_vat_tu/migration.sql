BEGIN;
ALTER TABLE "cong_viec_ai" DROP CONSTRAINT "cong_viec_ai_kind_check";
ALTER TABLE "cong_viec_ai" ADD CONSTRAINT "cong_viec_ai_kind_check"
  CHECK ("loai_cong_viec" IN ('KHAU_HAO_LOAI', 'NHAP_VAT_TU'));
COMMIT;
