BEGIN;
ALTER TABLE "vat_the_3d" DROP CONSTRAINT "vat_the_3d_mau_hien_thi_check";
ALTER TABLE "vat_the_3d" ADD CONSTRAINT "vat_the_3d_mau_hien_thi_check"
CHECK (
  "mau_hien_thi" IN ('MAC_DINH', 'QUAY_LE_TAN', 'BAN_TONG_GIAM_DOC')
  AND ("mau_hien_thi" = 'MAC_DINH' OR "loai_vat_the" = 'BAN')
);
COMMIT;
