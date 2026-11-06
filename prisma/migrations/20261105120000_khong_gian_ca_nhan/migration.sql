ALTER TABLE "tai_khoan" ADD COLUMN "bat_buoc_doi_mat_khau" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO vai_tro (ma_vai_tro, ten_vai_tro, mo_ta, la_vai_tro_he_thong, dinh_danh_cong_ty, thoi_diem_tao, thoi_diem_cap_nhat)
SELECT 'DEFAULT', 'Nhân viên cơ bản', 'Dashboard cá nhân, hồ sơ của tôi và đổi mật khẩu. Quyền nghiệp vụ cấp bằng vai trò khác.', true, dinh_danh, NOW(), NOW() FROM cong_ty
ON CONFLICT (dinh_danh_cong_ty, ma_vai_tro) DO NOTHING;

CREATE FUNCTION chan_cap_quyen_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vai_tro WHERE dinh_danh = NEW.dinh_danh_vai_tro AND ma_vai_tro = 'DEFAULT') THEN
    RAISE EXCEPTION 'DEFAULT chỉ có quyền cá nhân; cấp quyền nghiệp vụ bằng vai trò khác.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER chan_cap_quyen_default BEFORE INSERT OR UPDATE ON vai_tro_quyen
FOR EACH ROW EXECUTE FUNCTION chan_cap_quyen_default();
