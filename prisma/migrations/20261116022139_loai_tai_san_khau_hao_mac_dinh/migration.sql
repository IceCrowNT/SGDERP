BEGIN;
-- AlterTable
ALTER TABLE "loai_tai_san" ADD COLUMN     "khau_hao_mac_dinh_thang" INTEGER;

ALTER TABLE "loai_tai_san" ADD CONSTRAINT "loai_tai_san_khau_hao_mac_dinh_hop_le" CHECK (khau_hao_mac_dinh_thang IS NULL OR khau_hao_mac_dinh_thang BETWEEN 1 AND 1200);
COMMIT;
