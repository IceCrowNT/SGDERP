BEGIN;
CREATE SEQUENCE so_thu_tu_ho_so_quy_trinh;
CREATE FUNCTION tao_ma_ho_so_quy_trinh() RETURNS text LANGUAGE sql AS $$
 SELECT 'QT-' || lpad(nextval('so_thu_tu_ho_so_quy_trinh')::text, 8, '0')
$$;
-- CreateEnum
CREATE TYPE "TrangThaiMauQuyTrinh" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "LoaiBuocQuyTrinh" AS ENUM ('APPROVAL', 'TASK');

-- CreateEnum
CREATE TYPE "CachChonNguoiQuyTrinh" AS ENUM ('SPECIFIC_EMPLOYEE', 'REQUESTER_DEPARTMENT_HEAD');

-- CreateEnum
CREATE TYPE "TrangThaiHoSoQuyTrinh" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrangThaiBuocQuyTrinh" AS ENUM ('WAITING', 'PENDING', 'BLOCKED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "mau_quy_trinh" (
    "dinh_danh" SERIAL NOT NULL,
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,
    "ma" VARCHAR(50) NOT NULL,
    "ten" VARCHAR(255) NOT NULL,
    "mo_ta" TEXT,
    "phien_ban" INTEGER NOT NULL DEFAULT 1,
    "trang_thai" "TrangThaiMauQuyTrinh" NOT NULL DEFAULT 'DRAFT',
    "dinh_danh_tai_khoan_tao" INTEGER NOT NULL,
    "thoi_diem_phat_hanh" TIMESTAMP(3),

    CONSTRAINT "mau_quy_trinh_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateTable
CREATE TABLE "buoc_mau_quy_trinh" (
    "dinh_danh" SERIAL NOT NULL,
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,
    "dinh_danh_mau" INTEGER NOT NULL,
    "thu_tu" INTEGER NOT NULL,
    "ten" VARCHAR(255) NOT NULL,
    "huong_dan" TEXT,
    "loai_buoc" "LoaiBuocQuyTrinh" NOT NULL,
    "cach_chon_nguoi" "CachChonNguoiQuyTrinh" NOT NULL,
    "dinh_danh_nguoi_chi_dinh" INTEGER,

    CONSTRAINT "buoc_mau_quy_trinh_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateTable
CREATE TABLE "ho_so_quy_trinh" (
    "dinh_danh" SERIAL NOT NULL,
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,
    "ma" VARCHAR(50) NOT NULL DEFAULT tao_ma_ho_so_quy_trinh(),
    "dinh_danh_mau" INTEGER NOT NULL,
    "tieu_de" VARCHAR(255) NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "dinh_danh_nguoi_gui" INTEGER NOT NULL,
    "dinh_danh_phong_nguoi_gui" INTEGER NOT NULL,
    "dinh_danh_tai_khoan_tao" INTEGER NOT NULL,
    "trang_thai" "TrangThaiHoSoQuyTrinh" NOT NULL DEFAULT 'DRAFT',
    "thoi_diem_gui" TIMESTAMP(3),
    "thoi_diem_ket_thuc" TIMESTAMP(3),
    "dinh_danh_ho_so_truoc" INTEGER,

    CONSTRAINT "ho_so_quy_trinh_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateTable
CREATE TABLE "buoc_xu_ly_quy_trinh" (
    "dinh_danh" SERIAL NOT NULL,
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,
    "dinh_danh_ho_so" INTEGER NOT NULL,
    "dinh_danh_mau" INTEGER NOT NULL,
    "dinh_danh_buoc_mau" INTEGER NOT NULL,
    "dinh_danh_nguoi_duoc_giao" INTEGER,
    "trang_thai" "TrangThaiBuocQuyTrinh" NOT NULL DEFAULT 'WAITING',
    "thoi_diem_bat_dau" TIMESTAMP(3),
    "thoi_diem_ket_thuc" TIMESTAMP(3),
    "ly_do_tam_dung" TEXT,

    CONSTRAINT "buoc_xu_ly_quy_trinh_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateTable
CREATE TABLE "lich_su_quy_trinh" (
    "dinh_danh" SERIAL NOT NULL,
    "dinh_danh_cong_ty" INTEGER NOT NULL,
    "thoi_diem_tao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoi_diem_cap_nhat" TIMESTAMP(3) NOT NULL,
    "dinh_danh_ho_so" INTEGER NOT NULL,
    "dinh_danh_buoc_xu_ly" INTEGER,
    "dinh_danh_tai_khoan_thao_tac" INTEGER,
    "dinh_danh_nhan_su_thao_tac" INTEGER,
    "ten_nguoi_thao_tac_luc_do" VARCHAR(255) NOT NULL,
    "hanh_dong" VARCHAR(50) NOT NULL,
    "y_kien" TEXT,
    "chi_tiet" JSONB,

    CONSTRAINT "lich_su_quy_trinh_pkey" PRIMARY KEY ("dinh_danh")
);

-- CreateIndex
CREATE UNIQUE INDEX "mau_quy_trinh_dinh_danh_dinh_danh_cong_ty_key" ON "mau_quy_trinh"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "mau_quy_trinh_dinh_danh_cong_ty_ma_phien_ban_key" ON "mau_quy_trinh"("dinh_danh_cong_ty", "ma", "phien_ban");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_mau_quy_trinh_dinh_danh_dinh_danh_cong_ty_key" ON "buoc_mau_quy_trinh"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_mau_quy_trinh_dinh_danh_mau_thu_tu_key" ON "buoc_mau_quy_trinh"("dinh_danh_mau", "thu_tu");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_mau_mau_cong_ty_key" ON "buoc_mau_quy_trinh"("dinh_danh", "dinh_danh_mau", "dinh_danh_cong_ty");

-- CreateIndex
CREATE INDEX "ho_so_quy_trinh_dinh_danh_cong_ty_dinh_danh_nguoi_gui_trang_idx" ON "ho_so_quy_trinh"("dinh_danh_cong_ty", "dinh_danh_nguoi_gui", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_quy_trinh_dinh_danh_dinh_danh_cong_ty_key" ON "ho_so_quy_trinh"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_quy_trinh_dinh_danh_cong_ty_ma_key" ON "ho_so_quy_trinh"("dinh_danh_cong_ty", "ma");

-- CreateIndex
CREATE UNIQUE INDEX "ho_so_mau_cong_ty_key" ON "ho_so_quy_trinh"("dinh_danh", "dinh_danh_mau", "dinh_danh_cong_ty");

-- CreateIndex
CREATE INDEX "buoc_xu_ly_hop_viec_idx" ON "buoc_xu_ly_quy_trinh"("dinh_danh_cong_ty", "dinh_danh_nguoi_duoc_giao", "trang_thai");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_xu_ly_quy_trinh_dinh_danh_dinh_danh_cong_ty_key" ON "buoc_xu_ly_quy_trinh"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_xu_ly_ho_so_buoc_key" ON "buoc_xu_ly_quy_trinh"("dinh_danh_ho_so", "dinh_danh_buoc_mau");

-- CreateIndex
CREATE UNIQUE INDEX "buoc_xu_ly_ho_so_cong_ty_key" ON "buoc_xu_ly_quy_trinh"("dinh_danh", "dinh_danh_ho_so", "dinh_danh_cong_ty");

-- CreateIndex
CREATE INDEX "lich_su_ho_so_thoi_diem_idx" ON "lich_su_quy_trinh"("dinh_danh_ho_so", "thoi_diem_tao", "dinh_danh");

-- CreateIndex
CREATE UNIQUE INDEX "lich_su_quy_trinh_dinh_danh_dinh_danh_cong_ty_key" ON "lich_su_quy_trinh"("dinh_danh", "dinh_danh_cong_ty");

-- CreateIndex
CREATE UNIQUE INDEX "tai_khoan_dinh_danh_dinh_danh_cong_ty_key" ON "tai_khoan"("dinh_danh", "dinh_danh_cong_ty");

-- AddForeignKey
ALTER TABLE "mau_quy_trinh" ADD CONSTRAINT "mau_quy_trinh_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mau_quy_trinh" ADD CONSTRAINT "mau_quy_trinh_dinh_danh_tai_khoan_tao_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_tai_khoan_tao", "dinh_danh_cong_ty") REFERENCES "tai_khoan"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_mau_quy_trinh" ADD CONSTRAINT "buoc_mau_quy_trinh_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_mau_quy_trinh" ADD CONSTRAINT "buoc_mau_quy_trinh_dinh_danh_mau_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_mau", "dinh_danh_cong_ty") REFERENCES "mau_quy_trinh"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_mau_quy_trinh" ADD CONSTRAINT "buoc_mau_quy_trinh_dinh_danh_nguoi_chi_dinh_dinh_danh_cong_fkey" FOREIGN KEY ("dinh_danh_nguoi_chi_dinh", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_mau_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_mau", "dinh_danh_cong_ty") REFERENCES "mau_quy_trinh"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_nguoi_gui_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_nguoi_gui", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_phong_nguoi_gui_dinh_danh_cong_t_fkey" FOREIGN KEY ("dinh_danh_phong_nguoi_gui", "dinh_danh_cong_ty") REFERENCES "phong_ban"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_tai_khoan_tao_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_tai_khoan_tao", "dinh_danh_cong_ty") REFERENCES "tai_khoan"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ho_so_quy_trinh" ADD CONSTRAINT "ho_so_quy_trinh_dinh_danh_ho_so_truoc_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_ho_so_truoc", "dinh_danh_cong_ty") REFERENCES "ho_so_quy_trinh"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_xu_ly_quy_trinh" ADD CONSTRAINT "buoc_xu_ly_quy_trinh_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_xu_ly_quy_trinh" ADD CONSTRAINT "buoc_xu_ly_ho_so_cung_mau_fkey" FOREIGN KEY ("dinh_danh_ho_so", "dinh_danh_mau", "dinh_danh_cong_ty") REFERENCES "ho_so_quy_trinh"("dinh_danh", "dinh_danh_mau", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_xu_ly_quy_trinh" ADD CONSTRAINT "buoc_xu_ly_buoc_mau_fkey" FOREIGN KEY ("dinh_danh_buoc_mau", "dinh_danh_mau", "dinh_danh_cong_ty") REFERENCES "buoc_mau_quy_trinh"("dinh_danh", "dinh_danh_mau", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buoc_xu_ly_quy_trinh" ADD CONSTRAINT "buoc_xu_ly_nguoi_cung_cong_ty_fkey" FOREIGN KEY ("dinh_danh_nguoi_duoc_giao", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quy_trinh" ADD CONSTRAINT "lich_su_quy_trinh_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_cong_ty") REFERENCES "cong_ty"("dinh_danh") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quy_trinh" ADD CONSTRAINT "lich_su_quy_trinh_dinh_danh_ho_so_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_ho_so", "dinh_danh_cong_ty") REFERENCES "ho_so_quy_trinh"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quy_trinh" ADD CONSTRAINT "lich_su_buoc_cung_ho_so_fkey" FOREIGN KEY ("dinh_danh_buoc_xu_ly", "dinh_danh_ho_so", "dinh_danh_cong_ty") REFERENCES "buoc_xu_ly_quy_trinh"("dinh_danh", "dinh_danh_ho_so", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quy_trinh" ADD CONSTRAINT "lich_su_tai_khoan_cong_ty_fkey" FOREIGN KEY ("dinh_danh_tai_khoan_thao_tac", "dinh_danh_cong_ty") REFERENCES "tai_khoan"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_quy_trinh" ADD CONSTRAINT "lich_su_nhan_su_cong_ty_fkey" FOREIGN KEY ("dinh_danh_nhan_su_thao_tac", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE mau_quy_trinh ADD CONSTRAINT mau_phien_ban_duong CHECK (phien_ban > 0);
ALTER TABLE buoc_mau_quy_trinh ADD CONSTRAINT buoc_thu_tu_duong CHECK (thu_tu > 0),
 ADD CONSTRAINT buoc_chon_nguoi_hop_le CHECK ((cach_chon_nguoi = 'SPECIFIC_EMPLOYEE') = (dinh_danh_nguoi_chi_dinh IS NOT NULL));
ALTER TABLE ho_so_quy_trinh ADD CONSTRAINT ho_so_khong_tu_tro CHECK (dinh_danh_ho_so_truoc IS DISTINCT FROM dinh_danh);
ALTER TABLE buoc_xu_ly_quy_trinh ADD CONSTRAINT buoc_dang_cho_du_nguoi CHECK (trang_thai <> 'PENDING' OR (dinh_danh_nguoi_duoc_giao IS NOT NULL AND thoi_diem_bat_dau IS NOT NULL)),
 ADD CONSTRAINT buoc_chua_chay_chua_gan CHECK (trang_thai <> 'WAITING' OR (dinh_danh_nguoi_duoc_giao IS NULL AND thoi_diem_bat_dau IS NULL));
CREATE UNIQUE INDEX mau_mot_ban_phat_hanh ON mau_quy_trinh(dinh_danh_cong_ty,ma) WHERE trang_thai='PUBLISHED';
CREATE UNIQUE INDEX ho_so_mot_buoc_dang_xu_ly ON buoc_xu_ly_quy_trinh(dinh_danh_ho_so) WHERE trang_thai IN ('PENDING','BLOCKED');
CREATE FUNCTION bao_ve_mau_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
   IF OLD.trang_thai <> 'DRAFT' THEN RAISE EXCEPTION 'Mẫu đã phát hành không thể xóa'; END IF;
   RETURN OLD;
 END IF;
 IF OLD.trang_thai <> 'DRAFT' AND
   ((to_jsonb(NEW) - ARRAY['trang_thai','thoi_diem_cap_nhat']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['trang_thai','thoi_diem_cap_nhat'])
    OR (NEW.trang_thai <> OLD.trang_thai AND NOT (OLD.trang_thai='PUBLISHED' AND NEW.trang_thai='RETIRED'))) THEN
   RAISE EXCEPTION 'Mẫu đã phát hành bất biến';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER mau_quy_trinh_bat_bien BEFORE UPDATE OR DELETE ON mau_quy_trinh FOR EACH ROW EXECUTE FUNCTION bao_ve_mau_quy_trinh();
CREATE FUNCTION bao_ve_buoc_mau_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN
   PERFORM 1 FROM mau_quy_trinh WHERE dinh_danh=OLD.dinh_danh_mau AND trang_thai='DRAFT' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bước mẫu đã phát hành bất biến'; END IF;
 END IF;
 IF TG_OP <> 'DELETE' THEN
   PERFORM 1 FROM mau_quy_trinh WHERE dinh_danh=NEW.dinh_danh_mau AND trang_thai='DRAFT' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bước mẫu đã phát hành bất biến'; END IF;
   RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER buoc_mau_bat_bien BEFORE INSERT OR UPDATE OR DELETE ON buoc_mau_quy_trinh FOR EACH ROW EXECUTE FUNCTION bao_ve_buoc_mau_quy_trinh();
CREATE FUNCTION bao_ve_ho_so_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.ma <> OLD.ma OR NEW.dinh_danh_cong_ty <> OLD.dinh_danh_cong_ty OR NEW.dinh_danh_nguoi_gui <> OLD.dinh_danh_nguoi_gui OR NEW.dinh_danh_tai_khoan_tao <> OLD.dinh_danh_tai_khoan_tao OR NEW.dinh_danh_ho_so_truoc IS DISTINCT FROM OLD.dinh_danh_ho_so_truoc THEN
   RAISE EXCEPTION 'Định danh hồ sơ bất biến';
 END IF;
 IF OLD.trang_thai <> 'DRAFT' AND (NEW.tieu_de <> OLD.tieu_de OR NEW.noi_dung <> OLD.noi_dung OR NEW.dinh_danh_mau <> OLD.dinh_danh_mau OR NEW.dinh_danh_phong_nguoi_gui <> OLD.dinh_danh_phong_nguoi_gui OR NEW.thoi_diem_gui IS DISTINCT FROM OLD.thoi_diem_gui) THEN
   RAISE EXCEPTION 'Nội dung hồ sơ đã gửi bất biến';
 END IF;
 IF OLD.trang_thai IN ('COMPLETED','REJECTED','CANCELLED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Hồ sơ đã kết thúc'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ho_so_quy_trinh_bat_bien BEFORE UPDATE ON ho_so_quy_trinh FOR EACH ROW EXECUTE FUNCTION bao_ve_ho_so_quy_trinh();
CREATE FUNCTION bao_ve_lich_su_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Lịch sử quy trình chỉ được ghi thêm'; END $$;
CREATE TRIGGER lich_su_quy_trinh_bat_bien BEFORE UPDATE OR DELETE ON lich_su_quy_trinh FOR EACH ROW EXECUTE FUNCTION bao_ve_lich_su_quy_trinh();
INSERT INTO quyen (phan_he, hanh_dong, ten_quyen, pham_vi, thoi_diem_tao, thoi_diem_cap_nhat) VALUES
 ('WORKFLOW','VIEW','Xem hồ sơ quy trình liên quan','ALL',now(),now()),
 ('WORKFLOW','CREATE','Tạo và gửi hồ sơ quy trình','ALL',now(),now()),
 ('WORKFLOW','APPROVE','Duyệt bước được giao','ALL',now(),now()),
 ('WORKFLOW','EXECUTE','Thực hiện bước được giao','ALL',now(),now()),
 ('WORKFLOW','MANAGE','Quản lý mẫu và điều phối quy trình','ALL',now(),now())
 ON CONFLICT (phan_he,hanh_dong) DO NOTHING;
-- Không cấp quyền cho bất kỳ vai trò/tài khoản hiện có nào.
COMMIT;
