-- Removal requested 31/10/2026. Source documents and the pre-removal DB
-- remain in a private local backup. Core HR/account/RBAC tables are untouched.
BEGIN;
DROP TABLE "ban_giao_tai_san";
DROP TABLE "lich_su_vi_tri_tai_san";
DROP TABLE "bao_tri_tai_san";
DROP TABLE "tai_san";
DROP TABLE "dong_kiem_ke";
DROP TABLE "chung_tu_kiem_ke";
DROP TABLE "vi_tri_vat_ly";
DROP TABLE "loai_tai_san";

DROP TYPE "AssetTrackingMode";
DROP TYPE "AssetStatus";
DROP TYPE "AssetCondition";
DROP TYPE "PhysicalLocationType";
DROP TYPE "AssetInventoryDocumentStatus";
DROP TYPE "AssetAssignmentType";
DROP TYPE "AssetMaintenanceType";
DROP TYPE "AssetMaintenanceStatus";
COMMIT;
