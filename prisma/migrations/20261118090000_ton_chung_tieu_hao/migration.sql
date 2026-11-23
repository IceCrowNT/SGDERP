-- Consumable pooled stock; preserve historical rows and accessory stock. No grants or data reset.
BEGIN;
ALTER TABLE giao_dich_vat_tu DROP CONSTRAINT giao_dich_vat_tu_truong;
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_truong CHECK (
  (loai_giao_dich='DAO_GIAO_DICH' AND dao_giao_dich_id IS NOT NULL)
  OR (dao_giao_dich_id IS NULL AND (
    (loai_giao_dich IN ('TON_DAU','NHAP','DIEU_CHINH_TANG') AND vi_tri_xuat_id IS NULL AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='DIEU_CHINH_GIAM' AND vi_tri_nhap_id IS NULL AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='CHUYEN_NOI_GIU' AND vi_tri_xuat_id IS NOT NULL AND vi_tri_nhap_id IS NOT NULL AND vi_tri_xuat_id<>vi_tri_nhap_id AND nhan_su_nhan_id IS NULL AND phong_ban_nhan_id IS NULL AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich='CAP_PHAT' AND vi_tri_nhap_id IS NULL AND num_nonnulls(nhan_su_nhan_id,phong_ban_nhan_id)=1 AND cap_phat_goc_id IS NULL)
    OR (loai_giao_dich IN ('THU_HOI','GIAM_DANG_CAP') AND cap_phat_goc_id IS NOT NULL AND vi_tri_xuat_id IS NULL AND num_nonnulls(nhan_su_nhan_id,phong_ban_nhan_id)=1 AND ((loai_giao_dich='THU_HOI' AND vi_tri_nhap_id IS NOT NULL) OR (loai_giao_dich='GIAM_DANG_CAP' AND vi_tri_nhap_id IS NULL)))
  ))
);
CREATE OR REPLACE FUNCTION ton_vat_tu(p_item integer) RETURNS TABLE(vi_tri_id integer, so_luong bigint) LANGUAGE sql VOLATILE AS $$
  WITH kind AS (
    SELECT l.hang_muc FROM mat_hang_vat_tu m JOIN loai_vat_tu l ON l.id=m.loai_vat_tu_id WHERE m.id=p_item
  )
  SELECT NULL::integer, sum(g.so_luong::bigint *
    CASE coalesce(o.loai_giao_dich,g.loai_giao_dich)
      WHEN 'TON_DAU' THEN 1 WHEN 'NHAP' THEN 1 WHEN 'DIEU_CHINH_TANG' THEN 1
      WHEN 'CAP_PHAT' THEN -1 WHEN 'DIEU_CHINH_GIAM' THEN -1 ELSE 0 END *
    CASE WHEN g.loai_giao_dich='DAO_GIAO_DICH' THEN -1 ELSE 1 END)::bigint
  FROM giao_dich_vat_tu g LEFT JOIN giao_dich_vat_tu o ON o.id=g.dao_giao_dich_id
  WHERE g.mat_hang_vat_tu_id=p_item AND (SELECT hang_muc FROM kind)='TIEU_HAO'
  HAVING count(*)>0
  UNION ALL
  SELECT x.vi_tri_id, sum(x.sl)::bigint FROM giao_dich_vat_tu g
  CROSS JOIN LATERAL (VALUES
    (g.vi_tri_nhap_id, g.so_luong::bigint * CASE WHEN g.loai_giao_dich='DAO_GIAO_DICH' THEN -1 ELSE 1 END),
    (g.vi_tri_xuat_id, g.so_luong::bigint * CASE WHEN g.loai_giao_dich='DAO_GIAO_DICH' THEN 1 ELSE -1 END)
  ) x(vi_tri_id,sl) WHERE g.mat_hang_vat_tu_id=p_item AND x.vi_tri_id IS NOT NULL
    AND (SELECT hang_muc FROM kind)='PHU_KIEN' GROUP BY x.vi_tri_id;
$$;
CREATE OR REPLACE FUNCTION bao_ve_giao_dich_vat_tu() RETURNS trigger LANGUAGE plpgsql AS $$
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
    IF l.hang_muc='TIEU_HAO' THEN
      IF NEW.vi_tri_nhap_id IS NOT NULL OR NEW.vi_tri_xuat_id IS NOT NULL OR NEW.loai_giao_dich IN ('CHUYEN_NOI_GIU','THU_HOI','GIAM_DANG_CAP') THEN
        RAISE EXCEPTION 'Vật tư: tiêu hao dùng tồn chung, không chọn nơi giữ hoặc thu hồi.';
      END IF;
      IF NEW.loai_giao_dich='TON_DAU' AND EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE mat_hang_vat_tu_id=m.id) THEN
        RAISE EXCEPTION 'Vật tư: mặt hàng đã có lịch sử; dùng nhập hoặc điều chỉnh.';
      END IF;
    ELSE
      IF (NEW.loai_giao_dich IN ('TON_DAU','NHAP','DIEU_CHINH_TANG','THU_HOI') AND NEW.vi_tri_nhap_id IS NULL)
        OR (NEW.loai_giao_dich IN ('CAP_PHAT','DIEU_CHINH_GIAM','CHUYEN_NOI_GIU') AND NEW.vi_tri_xuat_id IS NULL) THEN
        RAISE EXCEPTION 'Vật tư: phụ kiện cần nơi nhập hoặc nơi xuất.';
      END IF;
    END IF;
    IF NEW.loai_giao_dich IN ('NHAP','TON_DAU','CAP_PHAT','DIEU_CHINH_TANG') AND (NOT m.dang_su_dung OR NOT l.dang_su_dung) THEN RAISE EXCEPTION 'Vật tư: mặt hàng hoặc loại đã ngừng sử dụng.'; END IF;
    IF NEW.loai_giao_dich='CAP_PHAT' THEN
      IF l.hang_muc='PHU_KIEN' AND NOT noi_giu_vat_tu_hop_le(NEW.vi_tri_xuat_id,NEW.company_id) THEN RAISE EXCEPTION 'Vật tư: nơi cấp không còn hiệu lực; hãy chuyển hàng về nơi đang dùng.'; END IF;
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
COMMIT;
