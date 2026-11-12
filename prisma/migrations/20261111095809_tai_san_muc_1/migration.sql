BEGIN;

CREATE SEQUENCE so_thu_tu_ma_tai_san;
CREATE FUNCTION tao_ma_tai_san() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'TS-' || CASE WHEN length(n) < 6 THEN lpad(n, 6, '0') ELSE n END
  FROM (SELECT nextval('so_thu_tu_ma_tai_san')::text AS n) s;
$$;

-- CreateEnum
CREATE TYPE "TinhTrangTaiSan" AS ENUM ('CHUA_XAC_NHAN', 'BINH_THUONG', 'HONG', 'DANG_SUA', 'NGUNG_SU_DUNG');

-- CreateEnum
CREATE TYPE "HinhThucSuDungTaiSan" AS ENUM ('CHUA_XAC_DINH', 'CA_NHAN', 'DUNG_CHUNG', 'CHUA_PHAN_BO');

-- CreateTable
CREATE TABLE "loai_tai_san" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ma_loai" VARCHAR(50) NOT NULL,
    "ten_loai" VARCHAR(255) NOT NULL,
    "mo_ta" TEXT,
    "dang_su_dung" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loai_tai_san_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tai_san" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ma_tai_san" VARCHAR(50) NOT NULL DEFAULT tao_ma_tai_san(),
    "ten_tai_san" VARCHAR(255) NOT NULL,
    "loai_tai_san_id" INTEGER NOT NULL,
    "phong_quan_ly_id" INTEGER,
    "nguoi_su_dung_id" INTEGER,
    "vi_tri_id" INTEGER,
    "tinh_trang" "TinhTrangTaiSan" NOT NULL DEFAULT 'CHUA_XAC_NHAN',
    "hinh_thuc_su_dung" "HinhThucSuDungTaiSan" NOT NULL DEFAULT 'CHUA_XAC_DINH',
    "so_serial" VARCHAR(255),
    "hang_model" VARCHAR(255),
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tai_san_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loai_tai_san_id_company_id_key" ON "loai_tai_san"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "loai_tai_san_company_id_ma_loai_key" ON "loai_tai_san"("company_id", "ma_loai");

-- CreateIndex
CREATE INDEX "tai_san_company_id_loai_tai_san_id_idx" ON "tai_san"("company_id", "loai_tai_san_id");

-- CreateIndex
CREATE INDEX "tai_san_company_id_phong_quan_ly_id_idx" ON "tai_san"("company_id", "phong_quan_ly_id");

-- CreateIndex
CREATE INDEX "tai_san_company_id_nguoi_su_dung_id_idx" ON "tai_san"("company_id", "nguoi_su_dung_id");

-- CreateIndex
CREATE INDEX "tai_san_company_id_vi_tri_id_idx" ON "tai_san"("company_id", "vi_tri_id");

-- CreateIndex
CREATE INDEX "tai_san_company_id_tinh_trang_idx" ON "tai_san"("company_id", "tinh_trang");

-- CreateIndex
CREATE UNIQUE INDEX "tai_san_id_company_id_key" ON "tai_san"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tai_san_company_id_ma_tai_san_key" ON "tai_san"("company_id", "ma_tai_san");

-- AddForeignKey
ALTER TABLE "loai_tai_san" ADD CONSTRAINT "loai_tai_san_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "tai_san_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "tai_san_loai_tai_san_id_company_id_fkey" FOREIGN KEY ("loai_tai_san_id", "company_id") REFERENCES "loai_tai_san"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "tai_san_phong_quan_ly_id_company_id_fkey" FOREIGN KEY ("phong_quan_ly_id", "company_id") REFERENCES "phong_ban"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "tai_san_nguoi_su_dung_id_company_id_fkey" FOREIGN KEY ("nguoi_su_dung_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tai_san" ADD CONSTRAINT "tai_san_vi_tri_id_company_id_fkey" FOREIGN KEY ("vi_tri_id", "company_id") REFERENCES "vi_tri"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE loai_tai_san
  ADD CONSTRAINT loai_tai_san_ma_hop_le CHECK (ma_loai ~ '^[A-Z][A-Z0-9_]*$'),
  ADD CONSTRAINT loai_tai_san_ten_hop_le CHECK (length(btrim(ten_loai)) > 0);
ALTER TABLE tai_san
  ADD CONSTRAINT tai_san_ten_hop_le CHECK (length(btrim(ten_tai_san)) > 0),
  ADD CONSTRAINT tai_san_nguoi_ca_nhan CHECK ((hinh_thuc_su_dung = 'CA_NHAN') = (nguoi_su_dung_id IS NOT NULL));

CREATE FUNCTION bao_ve_loai_tai_san() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM cong_ty WHERE id = NEW.company_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.ma_loai <> OLD.ma_loai THEN
      RAISE EXCEPTION 'Không được đổi ID, công ty hoặc mã loại tài sản';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER loai_tai_san_bao_ve BEFORE INSERT OR UPDATE ON loai_tai_san
  FOR EACH ROW EXECUTE FUNCTION bao_ve_loai_tai_san();

CREATE FUNCTION bao_ve_tai_san() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_id INTEGER; node RECORD; visited INTEGER[] := '{}';
  check_category BOOLEAN := true; check_person BOOLEAN := true; check_location BOOLEAN := true;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Không xóa hồ sơ tài sản; hãy ghi nhận ngừng sử dụng';
  END IF;
  PERFORM id FROM cong_ty WHERE id = NEW.company_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.ma_tai_san <> OLD.ma_tai_san THEN
      RAISE EXCEPTION 'Không được đổi ID, công ty hoặc mã tài sản';
    END IF;
    check_category := NEW.loai_tai_san_id IS DISTINCT FROM OLD.loai_tai_san_id;
    check_person := NEW.nguoi_su_dung_id IS DISTINCT FROM OLD.nguoi_su_dung_id;
    check_location := NEW.vi_tri_id IS DISTINCT FROM OLD.vi_tri_id;
  END IF;
  IF check_category THEN
    PERFORM id FROM loai_tai_san WHERE id = NEW.loai_tai_san_id AND company_id = NEW.company_id AND dang_su_dung FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Chọn loại tài sản còn sử dụng trong công ty'; END IF;
  END IF;
  IF check_person AND NEW.nguoi_su_dung_id IS NOT NULL THEN
    PERFORM id FROM nhan_su WHERE id = NEW.nguoi_su_dung_id AND company_id = NEW.company_id AND tinh_trang_lam_viec = 'ACTIVE' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Chỉ giao mới cho nhân sự đang làm việc trong công ty'; END IF;
  END IF;
  IF check_location THEN
    current_id := NEW.vi_tri_id;
    WHILE current_id IS NOT NULL LOOP
      IF current_id = ANY(visited) THEN RAISE EXCEPTION 'Cây vị trí không hợp lệ'; END IF;
      visited := array_append(visited, current_id);
      SELECT id, parent_id, dang_su_dung INTO node FROM vi_tri WHERE id = current_id AND company_id = NEW.company_id FOR SHARE;
      IF NOT FOUND OR NOT node.dang_su_dung THEN RAISE EXCEPTION 'Vị trí hoặc cấp trên không còn sử dụng'; END IF;
      current_id := node.parent_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tai_san_bao_ve BEFORE INSERT OR UPDATE OR DELETE ON tai_san
  FOR EACH ROW EXECUTE FUNCTION bao_ve_tai_san();

CREATE FUNCTION bao_ve_vi_tri_co_tai_san() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM cong_ty WHERE id = OLD.company_id FOR UPDATE;
  IF TG_OP = 'DELETE' OR NOT NEW.dang_su_dung THEN
    IF EXISTS (SELECT 1 FROM tai_san WHERE company_id = OLD.company_id AND vi_tri_id = OLD.id) THEN
      RAISE EXCEPTION 'Vị trí còn tài sản; hãy chuyển hoặc gỡ vị trí trong hồ sơ tài sản trước';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vi_tri_tai_san_bao_ve BEFORE DELETE OR UPDATE OF dang_su_dung ON vi_tri
  FOR EACH ROW EXECUTE FUNCTION bao_ve_vi_tri_co_tai_san();

-- Only extend the permission catalog; existing roles and grants stay unchanged.
INSERT INTO quyen (phan_he, hanh_dong, ten_quyen, pham_vi, created_at, updated_at)
VALUES ('ASSETS', 'VIEW', 'Xem tài sản', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('ASSETS', 'MANAGE', 'Quản lý tài sản và loại thiết bị', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (phan_he, hanh_dong) DO NOTHING;

COMMIT;
