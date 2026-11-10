CREATE SEQUENCE so_thu_tu_ma_vi_tri;
CREATE FUNCTION tao_ma_vi_tri() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'VT-' || CASE WHEN length(n) < 6 THEN lpad(n, 6, '0') ELSE n END
  FROM (SELECT nextval('so_thu_tu_ma_vi_tri')::text AS n) s;
$$;
CREATE TABLE vi_tri (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  ma_vi_tri VARCHAR(50) NOT NULL DEFAULT tao_ma_vi_tri(),
  ten_vi_tri VARCHAR(255) NOT NULL,
  loai_vi_tri VARCHAR(30) NOT NULL,
  parent_id INTEGER,
  mo_ta TEXT,
  dang_su_dung BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL,
  CONSTRAINT vi_tri_ten_hop_le CHECK (length(btrim(ten_vi_tri)) > 0),
  CONSTRAINT vi_tri_loai_hop_le CHECK (loai_vi_tri IN ('TOA_NHA','TANG','PHONG','KHU_VUC','CHO_NGOI','DIEM_DAT_THIET_BI')),
  CONSTRAINT vi_tri_company_id_fkey FOREIGN KEY (company_id) REFERENCES cong_ty(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX vi_tri_id_company_id_key ON vi_tri(id, company_id);
CREATE UNIQUE INDEX vi_tri_company_id_ma_vi_tri_key ON vi_tri(company_id, ma_vi_tri);
CREATE INDEX vi_tri_company_id_parent_id_idx ON vi_tri(company_id, parent_id);
ALTER TABLE vi_tri ADD CONSTRAINT vi_tri_parent_id_company_id_fkey FOREIGN KEY (parent_id, company_id) REFERENCES vi_tri(id, company_id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION kiem_tra_cay_vi_tri() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM cong_ty WHERE id = NEW.company_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.company_id <> OLD.company_id OR NEW.ma_vi_tri <> OLD.ma_vi_tri THEN
      RAISE EXCEPTION 'Không được đổi ID, công ty hoặc mã vị trí';
    END IF;
  END IF;
  IF NEW.parent_id = NEW.id THEN RAISE EXCEPTION 'Vị trí không thể là cha của chính nó'; END IF;
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id, dang_su_dung FROM vi_tri WHERE id = NEW.parent_id AND company_id = NEW.company_id
      UNION
      SELECT p.id, p.parent_id, p.dang_su_dung FROM vi_tri p JOIN ancestors a ON p.id = a.parent_id WHERE p.company_id = NEW.company_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.id OR NOT dang_su_dung
  ) THEN RAISE EXCEPTION 'Cây vị trí có vòng lặp hoặc cấp trên ngừng sử dụng'; END IF;
  IF NOT NEW.dang_su_dung AND EXISTS (SELECT 1 FROM vi_tri WHERE parent_id = NEW.id AND company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'Vị trí còn vị trí con';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vi_tri_bao_ve BEFORE INSERT OR UPDATE ON vi_tri FOR EACH ROW EXECUTE FUNCTION kiem_tra_cay_vi_tri();

-- Catalog only: intentionally no role grants, including ADMIN.
INSERT INTO quyen (phan_he, hanh_dong, ten_quyen, pham_vi, created_at, updated_at)
VALUES ('LOCATIONS','VIEW','Xem vị trí và không gian','ALL',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
       ('LOCATIONS','MANAGE','Quản lý vị trí và không gian','ALL',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (phan_he, hanh_dong) DO NOTHING;
