-- Visual model is independent of the business location type. Existing furniture is unchanged.
ALTER TABLE "vat_the_3d" ADD COLUMN "mau_hien_thi" VARCHAR(20) NOT NULL DEFAULT 'MAC_DINH';
ALTER TABLE "vat_the_3d" ADD CONSTRAINT "vat_the_3d_mau_hien_thi_check"
CHECK ("mau_hien_thi" IN ('MAC_DINH', 'QUAY_LE_TAN') AND ("mau_hien_thi" <> 'QUAY_LE_TAN' OR "loai_vat_the" = 'BAN'));
