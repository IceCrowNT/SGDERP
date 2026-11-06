BEGIN;

-- Quy ước lai: khóa và trường kỹ thuật dùng tiếng Anh ngắn gọn;
-- khóa nghiệp vụ phức tạp giữ nghĩa tiếng Việt và kết thúc bằng _id.
-- Chỉ đổi tên cột, không tạo lại bảng và không biến đổi dữ liệu.

ALTER TABLE "cong_ty"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "cong_ty"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "cong_ty"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "phong_ban"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "phong_ban"
  RENAME COLUMN "dinh_danh_phong_ban_cha" TO "parent_id";
ALTER TABLE "phong_ban"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "phong_ban"
  RENAME COLUMN "dinh_danh_nguoi_phu_trach" TO "nguoi_phu_trach_id";
ALTER TABLE "phong_ban"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "phong_ban"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "nhan_su"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "nhan_su"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "nhan_su"
  RENAME COLUMN "dinh_danh_phong_ban" TO "department_id";
ALTER TABLE "nhan_su"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "nhan_su"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "tai_khoan"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "tai_khoan"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "tai_khoan"
  RENAME COLUMN "dinh_danh_nhan_su" TO "employee_id";
ALTER TABLE "tai_khoan"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "tai_khoan"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "vai_tro"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "vai_tro"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "vai_tro"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "vai_tro"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "quyen"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "quyen"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "quyen"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "vai_tro_quyen"
  RENAME COLUMN "dinh_danh_vai_tro" TO "role_id";
ALTER TABLE "vai_tro_quyen"
  RENAME COLUMN "dinh_danh_quyen" TO "permission_id";

ALTER TABLE "tai_khoan_vai_tro"
  RENAME COLUMN "dinh_danh_tai_khoan" TO "account_id";
ALTER TABLE "tai_khoan_vai_tro"
  RENAME COLUMN "dinh_danh_vai_tro" TO "role_id";

ALTER TABLE "nhat_ky_hoat_dong"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "nhat_ky_hoat_dong"
  RENAME COLUMN "dinh_danh_tai_khoan" TO "account_id";
ALTER TABLE "nhat_ky_hoat_dong"
  RENAME COLUMN "dinh_danh_doi_tuong" TO "doi_tuong_id";
ALTER TABLE "nhat_ky_hoat_dong"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "nhat_ky_hoat_dong"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";

ALTER TABLE "mau_quy_trinh"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "mau_quy_trinh"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "mau_quy_trinh"
  RENAME COLUMN "dinh_danh_tai_khoan_tao" TO "tai_khoan_tao_id";
ALTER TABLE "mau_quy_trinh"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "mau_quy_trinh"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "dinh_danh_mau" TO "mau_quy_trinh_id";
ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "dinh_danh_nguoi_chi_dinh" TO "nguoi_chi_dinh_id";
ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "buoc_mau_quy_trinh"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_mau" TO "mau_quy_trinh_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_nguoi_gui" TO "nguoi_gui_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_phong_nguoi_gui" TO "phong_nguoi_gui_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_tai_khoan_tao" TO "tai_khoan_tao_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "dinh_danh_ho_so_truoc" TO "ho_so_truoc_id";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "ho_so_quy_trinh"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh_ho_so" TO "ho_so_quy_trinh_id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh_mau" TO "mau_quy_trinh_id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh_buoc_mau" TO "buoc_mau_quy_trinh_id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "dinh_danh_nguoi_duoc_giao" TO "nguoi_duoc_giao_id";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "buoc_xu_ly_quy_trinh"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh" TO "id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh_cong_ty" TO "company_id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh_ho_so" TO "ho_so_quy_trinh_id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh_buoc_xu_ly" TO "buoc_xu_ly_quy_trinh_id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh_tai_khoan_thao_tac" TO "tai_khoan_thao_tac_id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "dinh_danh_nhan_su_thao_tac" TO "nhan_su_thao_tac_id";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "thoi_diem_tao" TO "created_at";
ALTER TABLE "lich_su_quy_trinh"
  RENAME COLUMN "thoi_diem_cap_nhat" TO "updated_at";

-- ALTER TABLE ... RENAME COLUMN cập nhật FK, CHECK và biểu thức index theo cột mới.
-- Các hàm PL/pgSQL lưu thân hàm dưới dạng văn bản nên phải thay lại rõ ràng.
CREATE OR REPLACE FUNCTION kiem_tra_cong_ty_vai_tro() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE u_company INT; r_company INT;
BEGIN
 SELECT company_id INTO u_company FROM tai_khoan WHERE id=NEW.account_id FOR SHARE;
 SELECT company_id INTO r_company FROM vai_tro WHERE id=NEW.role_id FOR SHARE;
 IF u_company IS DISTINCT FROM r_company THEN RAISE EXCEPTION 'Tai khoan va vai tro phai cung cong ty'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION giu_cong_ty_phan_quyen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.company_id<>OLD.company_id THEN RAISE EXCEPTION 'Khong chuyen cong ty cua tai khoan hoac vai tro'; END IF;
 RETURN NEW;
END $$;

DROP TRIGGER tai_khoan_giu_cong_ty ON tai_khoan;
CREATE TRIGGER tai_khoan_giu_cong_ty BEFORE UPDATE OF company_id ON tai_khoan
FOR EACH ROW EXECUTE FUNCTION giu_cong_ty_phan_quyen();
DROP TRIGGER vai_tro_giu_cong_ty ON vai_tro;
CREATE TRIGGER vai_tro_giu_cong_ty BEFORE UPDATE OF company_id ON vai_tro
FOR EACH ROW EXECUTE FUNCTION giu_cong_ty_phan_quyen();

CREATE OR REPLACE FUNCTION chan_cap_quyen_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vai_tro WHERE id = NEW.role_id AND ma_vai_tro = 'DEFAULT') THEN
    RAISE EXCEPTION 'DEFAULT chỉ có quyền cá nhân; cấp quyền nghiệp vụ bằng vai trò khác.';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION bao_ve_mau_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
   IF OLD.trang_thai <> 'DRAFT' THEN RAISE EXCEPTION 'Mẫu đã phát hành không thể xóa'; END IF;
   RETURN OLD;
 END IF;
 IF OLD.trang_thai <> 'DRAFT' AND
   ((to_jsonb(NEW) - ARRAY['trang_thai','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['trang_thai','updated_at'])
    OR (NEW.trang_thai <> OLD.trang_thai AND NOT (OLD.trang_thai='PUBLISHED' AND NEW.trang_thai='RETIRED'))) THEN
   RAISE EXCEPTION 'Mẫu đã phát hành bất biến';
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION bao_ve_buoc_mau_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN
   PERFORM 1 FROM mau_quy_trinh WHERE id=OLD.mau_quy_trinh_id AND trang_thai='DRAFT' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bước mẫu đã phát hành bất biến'; END IF;
 END IF;
 IF TG_OP <> 'DELETE' THEN
   PERFORM 1 FROM mau_quy_trinh WHERE id=NEW.mau_quy_trinh_id AND trang_thai='DRAFT' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bước mẫu đã phát hành bất biến'; END IF;
   RETURN NEW;
 END IF;
 RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION bao_ve_ho_so_quy_trinh() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.ma <> OLD.ma OR NEW.company_id <> OLD.company_id OR NEW.nguoi_gui_id <> OLD.nguoi_gui_id OR NEW.tai_khoan_tao_id <> OLD.tai_khoan_tao_id OR NEW.ho_so_truoc_id IS DISTINCT FROM OLD.ho_so_truoc_id THEN
   RAISE EXCEPTION 'Định danh hồ sơ bất biến';
 END IF;
 IF OLD.trang_thai <> 'DRAFT' AND (NEW.tieu_de <> OLD.tieu_de OR NEW.noi_dung <> OLD.noi_dung OR NEW.mau_quy_trinh_id <> OLD.mau_quy_trinh_id OR NEW.phong_nguoi_gui_id <> OLD.phong_nguoi_gui_id OR NEW.thoi_diem_gui IS DISTINCT FROM OLD.thoi_diem_gui) THEN
   RAISE EXCEPTION 'Nội dung hồ sơ đã gửi bất biến';
 END IF;
 IF OLD.trang_thai IN ('COMPLETED','REJECTED','CANCELLED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Hồ sơ đã kết thúc'; END IF;
 RETURN NEW;
END $$;

COMMIT;
