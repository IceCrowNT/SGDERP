BEGIN;

-- Chỉ đổi tên; giữ ID, dữ liệu, FK, index, sequence và quyền hiện hành.
ALTER TABLE "cong_ty" RENAME COLUMN "ten" TO "ten_cong_ty";
ALTER TABLE "phong_ban" RENAME COLUMN "ma" TO "ma_phong_ban";
ALTER TABLE "phong_ban" RENAME COLUMN "ten" TO "ten_phong_ban";
ALTER TABLE "phong_ban" RENAME COLUMN "dinh_danh_cap_tren" TO "dinh_danh_phong_ban_cha";
ALTER TABLE "nhan_su" RENAME COLUMN "ma_nhan_vien" TO "ma_nhan_su";

-- PL/pgSQL tham chiếu tên field trong thân hàm: phải cập nhật cùng lần rename.
CREATE OR REPLACE FUNCTION bao_ve_ma_nhan_su() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."ma_nhan_su" IS DISTINCT FROM OLD."ma_nhan_su" THEN
    RAISE EXCEPTION 'Mã nhân sự không được thay đổi.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE "nguoi_dung" RENAME TO "tai_khoan";
ALTER TABLE "tai_khoan" RENAME COLUMN "dang_hoat_dong" TO "cho_phep_dang_nhap";
ALTER TABLE "vai_tro" RENAME COLUMN "ma" TO "ma_vai_tro";
ALTER TABLE "vai_tro" RENAME COLUMN "ten" TO "ten_vai_tro";
ALTER TABLE "vai_tro" RENAME COLUMN "thuoc_he_thong" TO "la_vai_tro_he_thong";
ALTER TABLE "quyen" RENAME COLUMN "ten" TO "ten_quyen";
ALTER TABLE "nguoi_dung_vai_tro" RENAME TO "tai_khoan_vai_tro";
ALTER TABLE "tai_khoan_vai_tro" RENAME COLUMN "dinh_danh_nguoi_dung" TO "dinh_danh_tai_khoan";
ALTER TABLE "tai_khoan_vai_tro" RENAME COLUMN "la_chinh" TO "la_vai_tro_chinh";
ALTER TABLE "nhat_ky_hoat_dong" RENAME COLUMN "dinh_danh_nguoi_dung" TO "dinh_danh_tai_khoan";

COMMIT;
