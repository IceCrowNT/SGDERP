-- Additive migration. No operational stock or role grants are created.
CREATE SEQUENCE ma_mat_hang_vat_tu_seq;
CREATE FUNCTION tao_ma_mat_hang_vat_tu() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'VT-' || lpad(n::text, greatest(6, length(n::text)), '0') FROM nextval('ma_mat_hang_vat_tu_seq') n;
$$;
-- CreateEnum
CREATE TYPE "HangMucVatTu" AS ENUM ('TIEU_HAO', 'PHU_KIEN');

-- CreateEnum
CREATE TYPE "LoaiGiaoDichVatTu" AS ENUM ('TON_DAU', 'NHAP', 'CAP_PHAT', 'THU_HOI', 'CHUYEN_NOI_GIU', 'DIEU_CHINH_TANG', 'DIEU_CHINH_GIAM', 'GIAM_DANG_CAP', 'DAO_GIAO_DICH');

-- CreateTable
CREATE TABLE "loai_vat_tu" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ma_loai" VARCHAR(50) NOT NULL,
    "ten_loai" VARCHAR(255) NOT NULL,
    "hang_muc" "HangMucVatTu" NOT NULL,
    "mo_ta" TEXT,
    "dang_su_dung" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loai_vat_tu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mat_hang_vat_tu" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ma_mat_hang" VARCHAR(50) NOT NULL DEFAULT tao_ma_mat_hang_vat_tu(),
    "ten_mat_hang" VARCHAR(255) NOT NULL,
    "loai_vat_tu_id" INTEGER NOT NULL,
    "don_vi_tinh" VARCHAR(50) NOT NULL,
    "muc_ton_toi_thieu" INTEGER,
    "phong_quan_ly_id" INTEGER,
    "ghi_chu" TEXT,
    "dang_su_dung" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mat_hang_vat_tu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "giao_dich_vat_tu" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "mat_hang_vat_tu_id" INTEGER NOT NULL,
    "loai_giao_dich" "LoaiGiaoDichVatTu" NOT NULL,
    "so_luong" INTEGER NOT NULL,
    "vi_tri_xuat_id" INTEGER,
    "vi_tri_nhap_id" INTEGER,
    "nhan_su_nhan_id" INTEGER,
    "phong_ban_nhan_id" INTEGER,
    "cap_phat_goc_id" INTEGER,
    "dao_giao_dich_id" INTEGER,
    "don_gia" DECIMAL(18,0),
    "ly_do" TEXT,
    "ghi_chu" TEXT,
    "request_id" UUID NOT NULL,
    "account_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "giao_dich_vat_tu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loai_vat_tu_id_company_id_key" ON "loai_vat_tu"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "loai_vat_tu_company_id_ma_loai_key" ON "loai_vat_tu"("company_id", "ma_loai");

-- CreateIndex
CREATE INDEX "mat_hang_vat_tu_company_id_loai_vat_tu_id_idx" ON "mat_hang_vat_tu"("company_id", "loai_vat_tu_id");

-- CreateIndex
CREATE INDEX "mat_hang_vat_tu_company_id_phong_quan_ly_id_idx" ON "mat_hang_vat_tu"("company_id", "phong_quan_ly_id");

-- CreateIndex
CREATE UNIQUE INDEX "mat_hang_vat_tu_id_company_id_key" ON "mat_hang_vat_tu"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "mat_hang_vat_tu_company_id_ma_mat_hang_key" ON "mat_hang_vat_tu"("company_id", "ma_mat_hang");

-- CreateIndex
CREATE UNIQUE INDEX "giao_dich_vat_tu_dao_giao_dich_id_key" ON "giao_dich_vat_tu"("dao_giao_dich_id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_company_id_mat_hang_vat_tu_id_created_at_i_idx" ON "giao_dich_vat_tu"("company_id", "mat_hang_vat_tu_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_company_id_vi_tri_xuat_id_idx" ON "giao_dich_vat_tu"("company_id", "vi_tri_xuat_id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_company_id_vi_tri_nhap_id_idx" ON "giao_dich_vat_tu"("company_id", "vi_tri_nhap_id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_company_id_nhan_su_nhan_id_idx" ON "giao_dich_vat_tu"("company_id", "nhan_su_nhan_id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_company_id_phong_ban_nhan_id_idx" ON "giao_dich_vat_tu"("company_id", "phong_ban_nhan_id");

-- CreateIndex
CREATE INDEX "giao_dich_vat_tu_cap_phat_goc_id_idx" ON "giao_dich_vat_tu"("cap_phat_goc_id");

-- CreateIndex
CREATE UNIQUE INDEX "giao_dich_vat_tu_id_mat_hang_vat_tu_id_company_id_key" ON "giao_dich_vat_tu"("id", "mat_hang_vat_tu_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "giao_dich_vat_tu_company_id_request_id_key" ON "giao_dich_vat_tu"("company_id", "request_id");

-- AddForeignKey
ALTER TABLE "loai_vat_tu" ADD CONSTRAINT "loai_vat_tu_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "mat_hang_vat_tu" ADD CONSTRAINT "mat_hang_vat_tu_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "mat_hang_vat_tu" ADD CONSTRAINT "mat_hang_vat_tu_loai_vat_tu_id_company_id_fkey" FOREIGN KEY ("loai_vat_tu_id", "company_id") REFERENCES "loai_vat_tu"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "mat_hang_vat_tu" ADD CONSTRAINT "mat_hang_vat_tu_phong_quan_ly_id_company_id_fkey" FOREIGN KEY ("phong_quan_ly_id", "company_id") REFERENCES "phong_ban"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_mat_hang_vat_tu_id_company_id_fkey" FOREIGN KEY ("mat_hang_vat_tu_id", "company_id") REFERENCES "mat_hang_vat_tu"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_vi_tri_xuat_id_company_id_fkey" FOREIGN KEY ("vi_tri_xuat_id", "company_id") REFERENCES "vi_tri"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_vi_tri_nhap_id_company_id_fkey" FOREIGN KEY ("vi_tri_nhap_id", "company_id") REFERENCES "vi_tri"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_nhan_su_nhan_id_company_id_fkey" FOREIGN KEY ("nhan_su_nhan_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_phong_ban_nhan_id_company_id_fkey" FOREIGN KEY ("phong_ban_nhan_id", "company_id") REFERENCES "phong_ban"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_cap_phat_goc_id_mat_hang_vat_tu_id_compan_fkey" FOREIGN KEY ("cap_phat_goc_id", "mat_hang_vat_tu_id", "company_id") REFERENCES "giao_dich_vat_tu"("id", "mat_hang_vat_tu_id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_dao_giao_dich_id_mat_hang_vat_tu_id_compa_fkey" FOREIGN KEY ("dao_giao_dich_id", "mat_hang_vat_tu_id", "company_id") REFERENCES "giao_dich_vat_tu"("id", "mat_hang_vat_tu_id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "giao_dich_vat_tu" ADD CONSTRAINT "giao_dich_vat_tu_account_id_company_id_fkey" FOREIGN KEY ("account_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE loai_vat_tu ADD CONSTRAINT loai_vat_tu_ten_hop_le CHECK (btrim(ma_loai) <> '' AND btrim(ten_loai) <> '');
ALTER TABLE mat_hang_vat_tu ADD CONSTRAINT mat_hang_vat_tu_hop_le CHECK (btrim(ten_mat_hang) <> '' AND btrim(don_vi_tinh) <> '' AND (muc_ton_toi_thieu IS NULL OR muc_ton_toi_thieu >= 0));
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_so_luong CHECK (so_luong > 0 OR (so_luong = 0 AND loai_giao_dich IN ('TON_DAU', 'DAO_GIAO_DICH')));
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_gia CHECK (don_gia IS NULL OR (don_gia >= 0 AND loai_giao_dich IN ('NHAP', 'DAO_GIAO_DICH')));
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_ly_do CHECK (loai_giao_dich NOT IN ('TON_DAU','DIEU_CHINH_TANG','DIEU_CHINH_GIAM','GIAM_DANG_CAP','DAO_GIAO_DICH') OR nullif(btrim(ly_do),'') IS NOT NULL);
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_truong CHECK (
  (loai_giao_dich='DAO_GIAO_DICH' AND dao_giao_dich_id IS NOT NULL)
  OR (dao_giao_dich_id IS NULL AND (
    (loai_giao_dich IN ('TON_DAU','NHAP','DIEU_CHINH_TANG') AND vi_tri_nhap_id IS NOT NULL AND vi_tri_xuat_id IS NULL AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='DIEU_CHINH_GIAM' AND vi_tri_xuat_id IS NOT NULL AND vi_tri_nhap_id IS NULL AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='CHUYEN_NOI_GIU' AND vi_tri_xuat_id IS NOT NULL AND vi_tri_nhap_id IS NOT NULL AND vi_tri_xuat_id<>vi_tri_nhap_id AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='CAP_PHAT' AND vi_tri_xuat_id IS NOT NULL AND vi_tri_nhap_id IS NULL AND num_nonnulls(nhan_su_nhan_id,phong_ban_nhan_id)=1 AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich IN ('THU_HOI','GIAM_DANG_CAP') AND cap_phat_goc_id IS NOT NULL AND vi_tri_xuat_id IS NULL AND num_nonnulls(nhan_su_nhan_id,phong_ban_nhan_id)=1 AND ((loai_giao_dich='THU_HOI' AND vi_tri_nhap_id IS NOT NULL) OR (loai_giao_dich='GIAM_DANG_CAP' AND vi_tri_nhap_id IS NULL)))
  ))
);
CREATE UNIQUE INDEX giao_dich_vat_tu_mo_dau ON giao_dich_vat_tu(mat_hang_vat_tu_id, vi_tri_nhap_id) WHERE loai_giao_dich='TON_DAU';

-- Reversals copy the original directions; their multiplier is -1.
CREATE FUNCTION ton_vat_tu(p_item integer) RETURNS TABLE(vi_tri_id integer, so_luong bigint) LANGUAGE sql VOLATILE AS $$
  SELECT x.vi_tri_id, sum(x.sl)::bigint FROM giao_dich_vat_tu g
  CROSS JOIN LATERAL (VALUES
    (g.vi_tri_nhap_id, g.so_luong::bigint * CASE WHEN g.loai_giao_dich='DAO_GIAO_DICH' THEN -1 ELSE 1 END),
    (g.vi_tri_xuat_id, g.so_luong::bigint * CASE WHEN g.loai_giao_dich='DAO_GIAO_DICH' THEN 1 ELSE -1 END)
  ) x(vi_tri_id,sl) WHERE g.mat_hang_vat_tu_id=p_item AND x.vi_tri_id IS NOT NULL GROUP BY x.vi_tri_id;
$$;
CREATE FUNCTION dang_cap_vat_tu(p_item integer) RETURNS TABLE(cap_phat_id integer, so_luong bigint) LANGUAGE sql VOLATILE AS $$
  SELECT g.id, (g.so_luong::bigint
    - CASE WHEN EXISTS(SELECT 1 FROM giao_dich_vat_tu r WHERE r.dao_giao_dich_id=g.id) THEN g.so_luong ELSE 0 END
    - coalesce((SELECT sum(CASE WHEN t.loai_giao_dich='DAO_GIAO_DICH' THEN -t.so_luong::bigint ELSE t.so_luong::bigint END) FROM giao_dich_vat_tu t WHERE t.cap_phat_goc_id=g.id),0))::bigint
  FROM giao_dich_vat_tu g JOIN mat_hang_vat_tu m ON m.id=g.mat_hang_vat_tu_id JOIN loai_vat_tu l ON l.id=m.loai_vat_tu_id
  WHERE g.mat_hang_vat_tu_id=p_item AND g.loai_giao_dich='CAP_PHAT' AND l.hang_muc='PHU_KIEN';
$$;
CREATE FUNCTION noi_giu_vat_tu_hop_le(p_location integer, p_company integer) RETURNS boolean LANGUAGE sql VOLATILE AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id,parent_id,dang_su_dung,loai_vi_tri FROM vi_tri WHERE id=p_location AND company_id=p_company
    UNION ALL SELECT v.id,v.parent_id,v.dang_su_dung,v.loai_vi_tri FROM vi_tri v JOIN ancestors a ON v.id=a.parent_id WHERE v.company_id=p_company
  ) SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=p_location AND loai_vi_tri IN ('PHONG','KHU_VUC','CHO_NGOI','DIEM_DAT_THIET_BI')) AND NOT EXISTS(SELECT 1 FROM ancestors WHERE NOT dang_su_dung);
$$;

CREATE FUNCTION bao_ve_giao_dich_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE g giao_dich_vat_tu; m mat_hang_vat_tu; l loai_vat_tu; dest integer;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Vật tư: sổ giao dịch chỉ được ghi thêm; hãy đảo giao dịch để sửa sai.'; END IF;
  PERFORM id FROM cong_ty WHERE id=NEW.company_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(260126,NEW.company_id);
  SELECT * INTO m FROM mat_hang_vat_tu WHERE id=NEW.mat_hang_vat_tu_id AND company_id=NEW.company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vật tư: mặt hàng không hợp lệ.'; END IF;
  SELECT * INTO l FROM loai_vat_tu WHERE id=m.loai_vat_tu_id;
  IF NEW.loai_giao_dich='DAO_GIAO_DICH' THEN
    SELECT * INTO g FROM giao_dich_vat_tu WHERE id=NEW.dao_giao_dich_id AND company_id=NEW.company_id AND mat_hang_vat_tu_id=m.id;
    IF NOT FOUND OR g.loai_giao_dich='DAO_GIAO_DICH' OR EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE dao_giao_dich_id=g.id) THEN RAISE EXCEPTION 'Vật tư: không thể đảo giao dịch này hoặc giao dịch đã được đảo.'; END IF;
    IF ROW(NEW.so_luong,NEW.vi_tri_xuat_id,NEW.vi_tri_nhap_id,NEW.nhan_su_nhan_id,NEW.phong_ban_nhan_id,NEW.cap_phat_goc_id,NEW.don_gia) IS DISTINCT FROM ROW(g.so_luong,g.vi_tri_xuat_id,g.vi_tri_nhap_id,g.nhan_su_nhan_id,g.phong_ban_nhan_id,g.cap_phat_goc_id,g.don_gia) THEN RAISE EXCEPTION 'Vật tư: bản đảo phải giữ nguyên tác động của giao dịch gốc.'; END IF;
    IF g.loai_giao_dich='CAP_PHAT' AND EXISTS(SELECT 1 FROM giao_dich_vat_tu t WHERE t.cap_phat_goc_id=g.id AND t.loai_giao_dich<>'DAO_GIAO_DICH' AND NOT EXISTS(SELECT 1 FROM giao_dich_vat_tu r WHERE r.dao_giao_dich_id=t.id)) THEN RAISE EXCEPTION 'Vật tư: hãy đảo các lần thu hồi/ghi giảm trước khi đảo lần cấp.'; END IF;
    dest := g.vi_tri_xuat_id;
  ELSE
    IF NEW.loai_giao_dich IN ('NHAP','TON_DAU','CAP_PHAT','DIEU_CHINH_TANG') AND (NOT m.dang_su_dung OR NOT l.dang_su_dung) THEN RAISE EXCEPTION 'Vật tư: mặt hàng hoặc loại đã ngừng sử dụng.'; END IF;
    IF NEW.loai_giao_dich='CAP_PHAT' THEN
      IF NOT noi_giu_vat_tu_hop_le(NEW.vi_tri_xuat_id,NEW.company_id) THEN RAISE EXCEPTION 'Vật tư: nơi cấp không còn hiệu lực; hãy chuyển hàng về nơi đang dùng.'; END IF;
      IF NEW.nhan_su_nhan_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nhan_su WHERE id=NEW.nhan_su_nhan_id AND company_id=NEW.company_id AND tinh_trang_lam_viec='ACTIVE') THEN RAISE EXCEPTION 'Vật tư: người nhận phải đang làm việc trong công ty.'; END IF;
    END IF;
    IF NEW.loai_giao_dich='TON_DAU' AND EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE mat_hang_vat_tu_id=m.id AND (vi_tri_nhap_id=NEW.vi_tri_nhap_id OR vi_tri_xuat_id=NEW.vi_tri_nhap_id)) THEN RAISE EXCEPTION 'Vật tư: nơi giữ đã có lịch sử; dùng nhập hoặc điều chỉnh.'; END IF;
    IF NEW.loai_giao_dich IN ('THU_HOI','GIAM_DANG_CAP') THEN
      SELECT * INTO g FROM giao_dich_vat_tu WHERE id=NEW.cap_phat_goc_id AND company_id=NEW.company_id AND mat_hang_vat_tu_id=m.id;
      IF NOT FOUND OR l.hang_muc<>'PHU_KIEN' OR g.loai_giao_dich<>'CAP_PHAT' OR EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE dao_giao_dich_id=g.id) THEN RAISE EXCEPTION 'Vật tư: lần cấp phụ kiện không hợp lệ.'; END IF;
      IF ROW(NEW.nhan_su_nhan_id,NEW.phong_ban_nhan_id) IS DISTINCT FROM ROW(g.nhan_su_nhan_id,g.phong_ban_nhan_id) THEN RAISE EXCEPTION 'Vật tư: phải giữ người/phòng nhận của lần cấp gốc.'; END IF;
    END IF;
    dest := NEW.vi_tri_nhap_id;
  END IF;
  IF dest IS NOT NULL AND NOT noi_giu_vat_tu_hop_le(dest,NEW.company_id) THEN RAISE EXCEPTION 'Vật tư: nơi nhập không còn hiệu lực; hãy chọn vị trí đang sử dụng.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER giao_dich_vat_tu_bao_ve BEFORE INSERT OR UPDATE OR DELETE ON giao_dich_vat_tu FOR EACH ROW EXECUTE FUNCTION bao_ve_giao_dich_vat_tu();
CREATE FUNCTION kiem_tra_so_du_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ton_vat_tu(NEW.mat_hang_vat_tu_id) WHERE so_luong<0) THEN RAISE EXCEPTION 'Vật tư: số lượng vượt tồn tại nơi giữ. Hãy cập nhật số dư.'; END IF;
  IF EXISTS(SELECT 1 FROM dang_cap_vat_tu(NEW.mat_hang_vat_tu_id) WHERE so_luong<0) THEN RAISE EXCEPTION 'Vật tư: số thu hồi/ghi giảm vượt số đang cấp.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER giao_dich_vat_tu_so_du AFTER INSERT ON giao_dich_vat_tu FOR EACH ROW EXECUTE FUNCTION kiem_tra_so_du_vat_tu();

CREATE FUNCTION bao_ve_danh_muc_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_kind "HangMucVatTu"; new_kind "HangMucVatTu"; active_kind boolean;
BEGIN
  PERFORM id FROM cong_ty WHERE id=NEW.company_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(260126,NEW.company_id);
  IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.company_id<>OLD.company_id) THEN RAISE EXCEPTION 'Vật tư: không đổi định danh hoặc công ty.'; END IF;
  IF TG_TABLE_NAME='loai_vat_tu' THEN
    IF TG_OP='UPDATE' THEN
      IF NEW.ma_loai<>OLD.ma_loai THEN RAISE EXCEPTION 'Vật tư: mã loại không thể thay đổi.'; END IF;
      IF NEW.hang_muc<>OLD.hang_muc AND EXISTS(SELECT 1 FROM mat_hang_vat_tu WHERE loai_vat_tu_id=OLD.id) THEN RAISE EXCEPTION 'Vật tư: loại đã có mặt hàng; không đổi hạng mục.'; END IF;
      IF NOT NEW.dang_su_dung AND EXISTS(SELECT 1 FROM mat_hang_vat_tu WHERE loai_vat_tu_id=OLD.id AND dang_su_dung) THEN RAISE EXCEPTION 'Vật tư: hãy ngừng các mặt hàng trước khi ngừng loại.'; END IF;
    END IF;
  ELSE
    SELECT hang_muc,dang_su_dung INTO new_kind,active_kind FROM loai_vat_tu WHERE id=NEW.loai_vat_tu_id AND company_id=NEW.company_id;
    IF NEW.dang_su_dung AND NOT coalesce(active_kind,false) THEN RAISE EXCEPTION 'Vật tư: hãy chọn loại đang sử dụng.'; END IF;
    IF TG_OP='UPDATE' THEN
      SELECT hang_muc INTO old_kind FROM loai_vat_tu WHERE id=OLD.loai_vat_tu_id;
      IF NEW.ma_mat_hang<>OLD.ma_mat_hang OR new_kind<>old_kind THEN RAISE EXCEPTION 'Vật tư: không đổi mã hoặc hạng mục mặt hàng.'; END IF;
      IF NEW.don_vi_tinh<>OLD.don_vi_tinh AND EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE mat_hang_vat_tu_id=OLD.id) THEN RAISE EXCEPTION 'Vật tư: đã có lịch sử; không đổi đơn vị tính.'; END IF;
      IF NOT NEW.dang_su_dung AND (EXISTS(SELECT 1 FROM ton_vat_tu(OLD.id) WHERE so_luong<>0) OR EXISTS(SELECT 1 FROM dang_cap_vat_tu(OLD.id) WHERE so_luong<>0)) THEN RAISE EXCEPTION 'Vật tư: còn tồn hoặc đang cấp; hãy tất toán trước khi ngừng.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER loai_vat_tu_bao_ve BEFORE INSERT OR UPDATE ON loai_vat_tu FOR EACH ROW EXECUTE FUNCTION bao_ve_danh_muc_vat_tu();
CREATE TRIGGER mat_hang_vat_tu_bao_ve BEFORE INSERT OR UPDATE ON mat_hang_vat_tu FOR EACH ROW EXECUTE FUNCTION bao_ve_danh_muc_vat_tu();

CREATE FUNCTION bao_ve_noi_giu_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM cong_ty WHERE id=OLD.company_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(260126,OLD.company_id);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; -- History FK blocks deletion, even at zero stock.
  IF NOT NEW.dang_su_dung OR NEW.loai_vi_tri NOT IN ('PHONG','KHU_VUC','CHO_NGOI','DIEM_DAT_THIET_BI') OR NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    IF EXISTS (
      WITH RECURSIVE branch AS (
        SELECT OLD.id AS id UNION ALL SELECT v.id FROM vi_tri v JOIN branch b ON v.parent_id=b.id
      ) SELECT 1 FROM mat_hang_vat_tu m CROSS JOIN LATERAL ton_vat_tu(m.id) t
      WHERE m.company_id=OLD.company_id AND t.so_luong>0 AND t.vi_tri_id IN(SELECT id FROM branch)
        AND (NOT NEW.dang_su_dung OR (t.vi_tri_id=OLD.id AND NEW.loai_vi_tri NOT IN ('PHONG','KHU_VUC','CHO_NGOI','DIEM_DAT_THIET_BI')) OR (NEW.parent_id IS NOT NULL AND EXISTS(
          WITH RECURSIVE a AS(SELECT id,parent_id,dang_su_dung FROM vi_tri WHERE id=NEW.parent_id UNION ALL SELECT v.id,v.parent_id,v.dang_su_dung FROM vi_tri v JOIN a ON v.id=a.parent_id) SELECT 1 FROM a WHERE NOT dang_su_dung
        )))
    ) THEN RAISE EXCEPTION 'Vật tư: vị trí hoặc nhánh còn tồn; hãy chuyển hết hàng trước khi ngừng/đổi nơi giữ.'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vi_tri_vat_tu_bao_ve BEFORE DELETE OR UPDATE OF dang_su_dung,loai_vi_tri,parent_id ON vi_tri FOR EACH ROW EXECUTE FUNCTION bao_ve_noi_giu_vat_tu();

INSERT INTO quyen(phan_he,hanh_dong,ten_quyen,mo_ta,pham_vi,updated_at)
VALUES ('INVENTORY','VIEW','Xem vật tư và phụ kiện','Xem mặt hàng, tồn và lịch sử toàn công ty','ALL',CURRENT_TIMESTAMP),
('INVENTORY','MANAGE','Quản lý vật tư và phụ kiện','Quản lý danh mục và giao dịch số lượng toàn công ty','ALL',CURRENT_TIMESTAMP)
ON CONFLICT (phan_he,hanh_dong) DO NOTHING;
