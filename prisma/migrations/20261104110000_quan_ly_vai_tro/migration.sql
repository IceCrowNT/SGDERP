BEGIN;
-- Materialize previous administrator privileges before removing role-code bypass.
INSERT INTO quyen (phan_he, hanh_dong, ten_quyen, pham_vi, thoi_diem_tao, thoi_diem_cap_nhat)
VALUES ('ACCOUNTS','MANAGE','Quản lý tài khoản đăng nhập','ALL',NOW(),NOW()),
       ('ROLES','VIEW','Xem vai trò và quyền hiệu lực','ALL',NOW(),NOW()),
       ('ROLES','MANAGE','Quản lý vai trò và phân quyền','ALL',NOW(),NOW()),
       ('AUDIT','VIEW','Xem nhật ký hoạt động','ALL',NOW(),NOW())
ON CONFLICT (phan_he, hanh_dong) DO NOTHING;
INSERT INTO vai_tro_quyen (dinh_danh_vai_tro, dinh_danh_quyen, thoi_diem_gan)
SELECT r.dinh_danh, p.dinh_danh, NOW() FROM vai_tro r CROSS JOIN quyen p
WHERE r.ma_vai_tro IN ('ADMIN','IT_ADMIN') AND p.pham_vi = 'ALL'
AND ((p.phan_he IN ('HR','SYSTEM','TASK','APPROVAL','ACCOUNTS','ROLES') AND p.hanh_dong='MANAGE') OR (p.phan_he='AUDIT' AND p.hanh_dong='VIEW'))
ON CONFLICT DO NOTHING;
INSERT INTO vai_tro_quyen (dinh_danh_vai_tro, dinh_danh_quyen, thoi_diem_gan)
SELECT DISTINCT rp.dinh_danh_vai_tro, a.dinh_danh, NOW() FROM vai_tro_quyen rp
JOIN quyen p ON p.dinh_danh=rp.dinh_danh_quyen CROSS JOIN quyen a
WHERE p.phan_he='SYSTEM' AND p.hanh_dong IN ('VIEW','MANAGE') AND p.pham_vi='ALL' AND a.phan_he='AUDIT' AND a.hanh_dong='VIEW'
ON CONFLICT DO NOTHING;
-- Correct an ambiguous label, never infer a business title from a system role.
UPDATE vai_tro SET ten_vai_tro='Quản trị hệ thống', thoi_diem_cap_nhat=NOW()
WHERE ma_vai_tro='ADMIN' AND ten_vai_tro='Ban Giám Đốc / Quản Trị Tối Cao';
-- One display-primary role at most; this flag never grants additional permissions.
WITH ranked AS (SELECT dinh_danh_tai_khoan, dinh_danh_vai_tro,
 ROW_NUMBER() OVER (PARTITION BY dinh_danh_tai_khoan ORDER BY thoi_diem_gan, dinh_danh_vai_tro) n
 FROM tai_khoan_vai_tro WHERE la_vai_tro_chinh)
UPDATE tai_khoan_vai_tro ur SET la_vai_tro_chinh=false FROM ranked r
WHERE ur.dinh_danh_tai_khoan=r.dinh_danh_tai_khoan AND ur.dinh_danh_vai_tro=r.dinh_danh_vai_tro AND r.n>1;
CREATE UNIQUE INDEX tai_khoan_mot_vai_tro_chinh ON tai_khoan_vai_tro(dinh_danh_tai_khoan) WHERE la_vai_tro_chinh;
-- Prevent cross-company assignments without adding redundant writable tenant columns.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM tai_khoan_vai_tro ur JOIN tai_khoan u ON u.dinh_danh=ur.dinh_danh_tai_khoan JOIN vai_tro r ON r.dinh_danh=ur.dinh_danh_vai_tro WHERE u.dinh_danh_cong_ty<>r.dinh_danh_cong_ty) THEN
 RAISE EXCEPTION 'Existing cross-company role assignment requires review'; END IF;
END $$;
CREATE FUNCTION kiem_tra_cong_ty_vai_tro() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE u_company INT; r_company INT;
BEGIN
 SELECT dinh_danh_cong_ty INTO u_company FROM tai_khoan WHERE dinh_danh=NEW.dinh_danh_tai_khoan FOR SHARE;
 SELECT dinh_danh_cong_ty INTO r_company FROM vai_tro WHERE dinh_danh=NEW.dinh_danh_vai_tro FOR SHARE;
 IF u_company IS DISTINCT FROM r_company THEN RAISE EXCEPTION 'Tai khoan va vai tro phai cung cong ty'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tai_khoan_vai_tro_cung_cong_ty BEFORE INSERT OR UPDATE ON tai_khoan_vai_tro FOR EACH ROW EXECUTE FUNCTION kiem_tra_cong_ty_vai_tro();
CREATE FUNCTION giu_cong_ty_phan_quyen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.dinh_danh_cong_ty<>OLD.dinh_danh_cong_ty THEN RAISE EXCEPTION 'Khong chuyen cong ty cua tai khoan hoac vai tro'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tai_khoan_giu_cong_ty BEFORE UPDATE OF dinh_danh_cong_ty ON tai_khoan FOR EACH ROW EXECUTE FUNCTION giu_cong_ty_phan_quyen();
CREATE TRIGGER vai_tro_giu_cong_ty BEFORE UPDATE OF dinh_danh_cong_ty ON vai_tro FOR EACH ROW EXECUTE FUNCTION giu_cong_ty_phan_quyen();
COMMIT;
