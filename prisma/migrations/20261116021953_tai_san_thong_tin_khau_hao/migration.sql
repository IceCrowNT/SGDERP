BEGIN;
-- Optional management information; existing dossiers remain unchanged.
ALTER TABLE "tai_san" ADD COLUMN     "gia_mua" DECIMAL(18,0),
ADD COLUMN     "han_bao_hanh" DATE,
ADD COLUMN     "ngay_mua" DATE,
ADD COLUMN     "thoi_gian_khau_hao_thang" INTEGER;

ALTER TABLE "tai_san"
  ADD CONSTRAINT "tai_san_gia_mua_hop_le" CHECK (gia_mua IS NULL OR gia_mua >= 0),
  ADD CONSTRAINT "tai_san_khau_hao_thang_hop_le" CHECK (thoi_gian_khau_hao_thang IS NULL OR thoi_gian_khau_hao_thang BETWEEN 1 AND 1200),
  ADD CONSTRAINT "tai_san_ngay_mua_hop_le" CHECK (ngay_mua IS NULL OR ngay_mua BETWEEN DATE '1000-01-01' AND DATE '9999-12-31'),
  ADD CONSTRAINT "tai_san_bao_hanh_hop_le" CHECK (han_bao_hanh IS NULL OR han_bao_hanh BETWEEN DATE '1000-01-01' AND DATE '9999-12-31'),
  ADD CONSTRAINT "tai_san_bao_hanh_sau_mua" CHECK (ngay_mua IS NULL OR han_bao_hanh IS NULL OR han_bao_hanh >= ngay_mua);
COMMIT;
