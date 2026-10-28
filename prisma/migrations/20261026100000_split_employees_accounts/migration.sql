BEGIN;
-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'LEFT', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "ban_giao_tai_san" DROP CONSTRAINT "AssetAssignment_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "bao_tri_tai_san" DROP CONSTRAINT "AssetMaintenance_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "nguoi_dung" DROP CONSTRAINT "User_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "tai_san" DROP CONSTRAINT "Asset_currentCustodianId_fkey";

-- AlterTable
ALTER TABLE "nguoi_dung" ADD COLUMN     "dinh_danh_nhan_su" INTEGER,
ADD COLUMN     "phien_ban_dang_nhap" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "ma_nhan_vien" DROP NOT NULL;

-- CreateTable
CREATE TABLE "nhan_su" (
    "dinh_danh" SERIAL NOT NULL,
    "ma_nhan_vien" VARCHAR(50) NOT NULL,
    "ho_ten" VARCHAR(255) NOT NULL,
    "chuc_vu" VARCHAR(100),
    "thu_dien_tu" VARCHAR(255),
    "so_dien_thoai" VARCHAR(20),
    "ngay_sinh" DATE,
    "ngay_vao_lam" DATE,
    "duong_dan_anh_dai_dien" TEXT,
    "dia_chi" TEXT,
    "tinh_trang_lam_viec" "EmploymentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "he_thong_nguon" VARCHAR(50),
    "dinh_danh_nguon" VARCHAR(100),
    "thoi_diem_chup_du_lieu_nguon" TIMESTAMP(3),
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "dinh_danh_phong_ban" INTEGER,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nhan_su_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateIndex
CREATE INDEX "nhan_su_dinh_danh_cong_ty_dinh_danh_phong_ban_idx" ON "nhan_su"("dinh_danh_cong_ty", "dinh_danh_phong_ban");

-- CreateIndex
CREATE INDEX "nhan_su_dinh_danh_cong_ty_tinh_trang_lam_viec_idx" ON "nhan_su"("dinh_danh_cong_ty", "tinh_trang_lam_viec");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_su_dinh_danh_dinh_danh_cong_ty_key" ON "nhan_su"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_su_dinh_danh_cong_ty_ma_nhan_vien_key" ON "nhan_su"("dinh_danh_cong_ty", "ma_nhan_vien");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_su_dinh_danh_cong_ty_he_thong_nguon_dinh_danh_nguon_key" ON "nhan_su"("dinh_danh_cong_ty", "he_thong_nguon", "dinh_danh_nguon");

-- CreateIndex
CREATE INDEX "nguoi_dung_dinh_danh_nhan_su_dinh_danh_cong_ty_idx" ON "nguoi_dung"("dinh_danh_nhan_su", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "phong_ban_dinh_danh_dinh_danh_cong_ty_key" ON "phong_ban"("dinh_danh", "dinh_danh_cong_ty");


-- Source: 67-record HR workbook dated 14/10/2026; do not infer employment from account status.
-- SHA256: 1d0eea9299f3d695cc4d86f9caa259938a51fc1e8c021522cf7a98030e0f61e7
-- Code SDG-074 has a generic source name. Preserve the existing ERP profile; review source separately.
CREATE TEMP TABLE employee_source (code TEXT PRIMARY KEY, source_id TEXT UNIQUE, status "EmploymentStatus") ON COMMIT DROP;
INSERT INTO employee_source VALUES
('SDG-001', '2', 'ACTIVE'::"EmploymentStatus"),
('SDG-010', '29', 'ACTIVE'::"EmploymentStatus"),
('SDG-011', '32', 'ACTIVE'::"EmploymentStatus"),
('SDG-012', '35', 'ACTIVE'::"EmploymentStatus"),
('SDG-013', '38', 'ACTIVE'::"EmploymentStatus"),
('SDG-014', '41', 'ACTIVE'::"EmploymentStatus"),
('SDG-016', '47', 'ACTIVE'::"EmploymentStatus"),
('SDG-017', '50', 'ACTIVE'::"EmploymentStatus"),
('SDG-018', '208', 'ACTIVE'::"EmploymentStatus"),
('SDG-019', '56', 'ACTIVE'::"EmploymentStatus"),
('SDG-002', '5', 'ACTIVE'::"EmploymentStatus"),
('SDG-020', '59', 'ACTIVE'::"EmploymentStatus"),
('SDG-021', '62', 'ACTIVE'::"EmploymentStatus"),
('SDG-022', '65', 'ACTIVE'::"EmploymentStatus"),
('SDG-023', '68', 'ACTIVE'::"EmploymentStatus"),
('SDG-024', '71', 'LEFT'::"EmploymentStatus"),
('SDG-025', '74', 'ACTIVE'::"EmploymentStatus"),
('SDG-026', '77', 'ACTIVE'::"EmploymentStatus"),
('SDG-027', '80', 'ACTIVE'::"EmploymentStatus"),
('SDG-028', '83', 'ACTIVE'::"EmploymentStatus"),
('SDG-029', '86', 'ACTIVE'::"EmploymentStatus"),
('SDG-003', '8', 'ACTIVE'::"EmploymentStatus"),
('SDG-030', '89', 'ACTIVE'::"EmploymentStatus"),
('SDG-031', '92', 'ACTIVE'::"EmploymentStatus"),
('SDG-032', '95', 'ACTIVE'::"EmploymentStatus"),
('SDG-033', '98', 'ACTIVE'::"EmploymentStatus"),
('SDG-034', '101', 'ACTIVE'::"EmploymentStatus"),
('SDG-035', '104', 'ACTIVE'::"EmploymentStatus"),
('SDG-036', '107', 'ACTIVE'::"EmploymentStatus"),
('SDG-037', '110', 'ACTIVE'::"EmploymentStatus"),
('SDG-038', '113', 'ACTIVE'::"EmploymentStatus"),
('SDG-039', '116', 'ACTIVE'::"EmploymentStatus"),
('SDG-004', '11', 'ACTIVE'::"EmploymentStatus"),
('SDG-040', '119', 'ACTIVE'::"EmploymentStatus"),
('SDG-041', '122', 'ACTIVE'::"EmploymentStatus"),
('SDG-042', '125', 'ACTIVE'::"EmploymentStatus"),
('SDG-043', '128', 'ACTIVE'::"EmploymentStatus"),
('SDG-044', '131', 'ACTIVE'::"EmploymentStatus"),
('SDG-045', '134', 'ACTIVE'::"EmploymentStatus"),
('SDG-046', '137', 'ACTIVE'::"EmploymentStatus"),
('SDG-047', '140', 'ACTIVE'::"EmploymentStatus"),
('SDG-048', '143', 'ACTIVE'::"EmploymentStatus"),
('SDG-049', '146', 'ACTIVE'::"EmploymentStatus"),
('SDG-005', '14', 'ACTIVE'::"EmploymentStatus"),
('SDG-050', '149', 'ACTIVE'::"EmploymentStatus"),
('SDG-051', '152', 'ACTIVE'::"EmploymentStatus"),
('SDG-052', '155', 'ACTIVE'::"EmploymentStatus"),
('SDG-053', '158', 'ACTIVE'::"EmploymentStatus"),
('SDG-054', '161', 'ACTIVE'::"EmploymentStatus"),
('SDG-055', '164', 'ACTIVE'::"EmploymentStatus"),
('SDG-056', '167', 'ACTIVE'::"EmploymentStatus"),
('SDG-058', '173', 'ACTIVE'::"EmploymentStatus"),
('SDG-059', '176', 'ACTIVE'::"EmploymentStatus"),
('SDG-006', '17', 'ACTIVE'::"EmploymentStatus"),
('SDG-060', '179', 'ACTIVE'::"EmploymentStatus"),
('SDG-061', '182', 'ACTIVE'::"EmploymentStatus"),
('SDG-063', '188', 'ACTIVE'::"EmploymentStatus"),
('SDG-064', '191', 'ACTIVE'::"EmploymentStatus"),
('SDG-066', '197', 'ACTIVE'::"EmploymentStatus"),
('SDG-067', '200', 'ACTIVE'::"EmploymentStatus"),
('SDG-007', '20', 'ACTIVE'::"EmploymentStatus"),
('SDG-070', '202', 'ACTIVE'::"EmploymentStatus"),
('SDG-071', '203', 'ACTIVE'::"EmploymentStatus"),
('SDG-072', '206', 'ACTIVE'::"EmploymentStatus"),
('SDG-074', '209', 'ACTIVE'::"EmploymentStatus"),
('SDG-008', '23', 'ACTIVE'::"EmploymentStatus"),
('SDG-009', '26', 'ACTIVE'::"EmploymentStatus");
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM nguoi_dung u LEFT JOIN employee_source s ON s.code=u.ma_nhan_vien WHERE s.code IS NULL AND NOT (u.ten_dang_nhap='admin' AND u.ma_nhan_vien='SDG-ADMIN')) THEN
 RAISE EXCEPTION 'Unmapped account: review person ownership before migration'; END IF;
END $$;
INSERT INTO nhan_su (dinh_danh,ma_nhan_vien,ho_ten,chuc_vu,thu_dien_tu,so_dien_thoai,ngay_sinh,ngay_vao_lam,duong_dan_anh_dai_dien,dia_chi,tinh_trang_lam_viec,he_thong_nguon,dinh_danh_nguon,thoi_diem_chup_du_lieu_nguon,dinh_danh_cong_ty,dinh_danh_phong_ban,thoi_diem_tao,thoi_diem_cap_nhat)
SELECT u.dinh_danh,u.ma_nhan_vien,u.ho_ten,u.chuc_vu,u.thu_dien_tu,u.so_dien_thoai,u.ngay_sinh,u.ngay_vao_lam,u.duong_dan_anh_dai_dien,u.dia_chi,s.status,'ONE_OFFICE',s.source_id,'2026-10-14'::timestamp,u.dinh_danh_cong_ty,u.dinh_danh_phong_ban,u.thoi_diem_tao,u.thoi_diem_cap_nhat
FROM nguoi_dung u JOIN employee_source s ON s.code=u.ma_nhan_vien;
UPDATE nguoi_dung u SET dinh_danh_nhan_su=e.dinh_danh FROM nhan_su e WHERE e.dinh_danh=u.dinh_danh;
SELECT setval(pg_get_serial_sequence('nhan_su','dinh_danh'),COALESCE((SELECT MAX(dinh_danh) FROM nhan_su),1),EXISTS(SELECT 1 FROM nhan_su));
-- AddForeignKey
ALTER TABLE "nhan_su" ADD CONSTRAINT "nhan_su_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nhan_su" ADD CONSTRAINT "nhan_su_dinh_danh_phong_ban_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_phong_ban", "dinh_danh_cong_ty") REFERENCES "phong_ban"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nguoi_dung" ADD CONSTRAINT "nguoi_dung_dinh_danh_nhan_su_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_nhan_su", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "Asset_currentCustodianId_fkey" FOREIGN KEY ("dinh_danh_nguoi_giu_hien_tai") REFERENCES "nhan_su"("dinh_danh") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ban_giao_tai_san" ADD CONSTRAINT "AssetAssignment_assignedToUserId_fkey" FOREIGN KEY ("dinh_danh_nguoi_nhan") REFERENCES "nhan_su"("dinh_danh") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bao_tri_tai_san" ADD CONSTRAINT "AssetMaintenance_technicianId_fkey" FOREIGN KEY ("dinh_danh_ky_thuat_vien") REFERENCES "nhan_su"("dinh_danh") ON DELETE SET NULL ON UPDATE CASCADE;


COMMIT;
