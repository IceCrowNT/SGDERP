ALTER TABLE "tep_dinh_kem_ai" DROP CONSTRAINT "tep_ai_loai_check";
ALTER TABLE "tep_dinh_kem_ai" ADD CONSTRAINT "tep_ai_loai_check" CHECK ("loai_tep" IN ('image','docx','xlsx','csv','pdf'));
