ALTER TABLE nhan_su ADD COLUMN vi_tri_lam_viec_id INTEGER;
CREATE INDEX nhan_su_company_id_vi_tri_lam_viec_id_idx ON nhan_su(company_id, vi_tri_lam_viec_id);
ALTER TABLE nhan_su ADD CONSTRAINT nhan_su_vi_tri_lam_viec_id_company_id_fkey
  FOREIGN KEY (vi_tri_lam_viec_id, company_id) REFERENCES vi_tri(id, company_id)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION kiem_tra_vi_tri_lam_viec() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_id INTEGER; node RECORD; visited INTEGER[] := '{}';
BEGIN
  PERFORM id FROM cong_ty WHERE id = NEW.company_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.vi_tri_lam_viec_id IS NOT DISTINCT FROM OLD.vi_tri_lam_viec_id AND NEW.company_id = OLD.company_id THEN
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.vi_tri_lam_viec_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.tinh_trang_lam_viec <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Chỉ gán vị trí mới cho nhân sự đang làm việc';
  END IF;
  current_id := NEW.vi_tri_lam_viec_id;
  WHILE current_id IS NOT NULL LOOP
    IF current_id = ANY(visited) THEN RAISE EXCEPTION 'Cây vị trí không hợp lệ'; END IF;
    visited := array_append(visited, current_id);
    SELECT id, parent_id, loai_vi_tri, dang_su_dung INTO node FROM vi_tri WHERE id = current_id AND company_id = NEW.company_id;
    IF NOT FOUND OR NOT node.dang_su_dung THEN RAISE EXCEPTION 'Vị trí hoặc cấp trên không còn sử dụng'; END IF;
    IF current_id = NEW.vi_tri_lam_viec_id AND node.loai_vi_tri NOT IN ('PHONG','KHU_VUC','CHO_NGOI') THEN
      RAISE EXCEPTION 'Chọn phòng, khu vực hoặc chỗ ngồi làm vị trí làm việc';
    END IF;
    current_id := node.parent_id;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER nhan_su_vi_tri_bao_ve BEFORE INSERT OR UPDATE OF vi_tri_lam_viec_id, company_id ON nhan_su
  FOR EACH ROW EXECUTE FUNCTION kiem_tra_vi_tri_lam_viec();

CREATE FUNCTION bao_ve_vi_tri_co_nhan_su() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM cong_ty WHERE id = OLD.company_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM nhan_su WHERE company_id = OLD.company_id AND vi_tri_lam_viec_id = OLD.id) THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Vị trí còn nhân sự liên kết'; END IF;
    IF NOT NEW.dang_su_dung OR NEW.loai_vi_tri NOT IN ('PHONG','KHU_VUC','CHO_NGOI') THEN
      RAISE EXCEPTION 'Gỡ hoặc chuyển nhân sự trước khi ngừng dùng hoặc đổi loại vị trí';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vi_tri_nhan_su_bao_ve BEFORE DELETE OR UPDATE OF dang_su_dung, loai_vi_tri ON vi_tri
  FOR EACH ROW EXECUTE FUNCTION bao_ve_vi_tri_co_nhan_su();
