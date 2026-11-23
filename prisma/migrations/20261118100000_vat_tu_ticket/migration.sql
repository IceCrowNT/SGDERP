BEGIN;
CREATE TABLE dong_vat_tu_quy_trinh (
  id SERIAL PRIMARY KEY, company_id INTEGER NOT NULL, ho_so_quy_trinh_id INTEGER NOT NULL,
  mat_hang_vat_tu_id INTEGER NOT NULL, phong_ban_nhan_id INTEGER NOT NULL,
  so_luong INTEGER NOT NULL CHECK (so_luong > 0),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT dong_vat_tu_quy_trinh_ho_so_quy_trinh_id_company_id_fkey FOREIGN KEY (ho_so_quy_trinh_id,company_id) REFERENCES ho_so_quy_trinh(id,company_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT dong_vat_tu_quy_trinh_mat_hang_vat_tu_id_company_id_fkey FOREIGN KEY (mat_hang_vat_tu_id,company_id) REFERENCES mat_hang_vat_tu(id,company_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT dong_vat_tu_quy_trinh_phong_ban_nhan_id_company_id_fkey FOREIGN KEY (phong_ban_nhan_id,company_id) REFERENCES phong_ban(id,company_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX dong_vat_tu_quy_trinh_id_mat_hang_vat_tu_id_company_id_key ON dong_vat_tu_quy_trinh(id,mat_hang_vat_tu_id,company_id);
CREATE UNIQUE INDEX dong_vat_tu_quy_trinh_ho_so_quy_trinh_id_mat_hang_vat_tu_id_pho_key ON dong_vat_tu_quy_trinh(ho_so_quy_trinh_id,mat_hang_vat_tu_id,phong_ban_nhan_id);
ALTER TABLE giao_dich_vat_tu ADD COLUMN dong_vat_tu_id INTEGER;
CREATE UNIQUE INDEX giao_dich_vat_tu_dong_vat_tu_id_key ON giao_dich_vat_tu(dong_vat_tu_id);
ALTER TABLE giao_dich_vat_tu ADD CONSTRAINT giao_dich_vat_tu_dong_vat_tu_id_mat_hang_vat_tu_id_company_id_fkey FOREIGN KEY (dong_vat_tu_id,mat_hang_vat_tu_id,company_id) REFERENCES dong_vat_tu_quy_trinh(id,mat_hang_vat_tu_id,company_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION bao_ve_dong_vat_tu_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r dong_vat_tu_quy_trinh; state text;
BEGIN
  IF TG_OP='DELETE' THEN r:=OLD; ELSE r:=NEW; END IF;
  PERFORM id FROM cong_ty WHERE id=r.company_id FOR UPDATE;
  PERFORM pg_advisory_xact_lock(260126,r.company_id);
  SELECT trang_thai::text INTO state FROM ho_so_quy_trinh WHERE id=r.ho_so_quy_trinh_id AND company_id=r.company_id FOR UPDATE;
  IF state IS DISTINCT FROM 'IN_PROGRESS' THEN RAISE EXCEPTION 'Vật tư: chỉ sửa vật tư khi ticket đang xử lý.'; END IF;
  IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.company_id,NEW.ho_so_quy_trinh_id) IS DISTINCT FROM ROW(OLD.id,OLD.company_id,OLD.ho_so_quy_trinh_id) THEN RAISE EXCEPTION 'Vật tư: không đổi định danh dòng ticket.'; END IF;
  IF EXISTS(SELECT 1 FROM giao_dich_vat_tu WHERE dong_vat_tu_id=r.id) THEN RAISE EXCEPTION 'Vật tư: dòng đã ghi tiêu hao, không sửa hoặc xóa.'; END IF;
  IF TG_OP<>'DELETE' AND NOT EXISTS(SELECT 1 FROM mat_hang_vat_tu m JOIN loai_vat_tu l ON l.id=m.loai_vat_tu_id WHERE m.id=r.mat_hang_vat_tu_id AND m.company_id=r.company_id AND m.dang_su_dung AND l.dang_su_dung AND l.hang_muc='TIEU_HAO') THEN RAISE EXCEPTION 'Vật tư: chọn mặt hàng tiêu hao đang sử dụng.'; END IF;
  RETURN r;
END $$;
CREATE TRIGGER dong_vat_tu_quy_trinh_bao_ve BEFORE INSERT OR UPDATE OR DELETE ON dong_vat_tu_quy_trinh FOR EACH ROW EXECUTE FUNCTION bao_ve_dong_vat_tu_quy_trinh();

CREATE FUNCTION kiem_tra_xuat_vat_tu_ticket() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.dong_vat_tu_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM dong_vat_tu_quy_trinh d JOIN ho_so_quy_trinh h ON h.id=d.ho_so_quy_trinh_id
    WHERE d.id=NEW.dong_vat_tu_id AND d.company_id=NEW.company_id AND d.mat_hang_vat_tu_id=NEW.mat_hang_vat_tu_id
      AND h.trang_thai='COMPLETED' AND NEW.loai_giao_dich='CAP_PHAT' AND NEW.so_luong=d.so_luong
      AND NEW.phong_ban_nhan_id=d.phong_ban_nhan_id AND NEW.nhan_su_nhan_id IS NULL
  ) THEN RAISE EXCEPTION 'Vật tư: xuất ticket phải khớp dòng đã chốt khi hoàn thành.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER giao_dich_vat_tu_ticket BEFORE INSERT ON giao_dich_vat_tu FOR EACH ROW EXECUTE FUNCTION kiem_tra_xuat_vat_tu_ticket();
COMMIT;
