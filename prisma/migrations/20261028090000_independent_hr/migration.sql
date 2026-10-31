BEGIN;

-- Mã ERP cấp độc lập với STT, ID người hoặc mã nguồn 1Office.
CREATE SEQUENCE "so_thu_tu_ma_nhan_su" AS BIGINT MINVALUE 1;
SELECT setval('"so_thu_tu_ma_nhan_su"', GREATEST(1, COALESCE(
  (SELECT MAX(substring("ma_nhan_vien" FROM '^SDG-([0-9]+)$')::bigint) + 1 FROM "nhan_su"), 1)), false);
CREATE FUNCTION tao_ma_nhan_su() RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'SDG-' || CASE WHEN length(n::text) < 3 THEN lpad(n::text, 3, '0') ELSE n::text END
  FROM nextval('"so_thu_tu_ma_nhan_su"') AS n;
$$;
ALTER TABLE "nhan_su" ALTER COLUMN "ma_nhan_vien" SET DEFAULT tao_ma_nhan_su();
CREATE FUNCTION bao_ve_ma_nhan_su() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."ma_nhan_vien" IS DISTINCT FROM OLD."ma_nhan_vien" THEN
    RAISE EXCEPTION 'Mã nhân sự không được thay đổi.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ma_nhan_su_bat_bien BEFORE UPDATE OF "ma_nhan_vien" ON "nhan_su"
FOR EACH ROW EXECUTE FUNCTION bao_ve_ma_nhan_su();

ALTER TABLE "nhan_su" ADD COLUMN "ghi_chu" TEXT;
UPDATE "nhan_su" SET "ghi_chu" = "ghi_chu_nhan_su_hr";

-- Đã backup trước triển khai. Hồ sơ sống chỉ nằm trong nhan_su;
-- metadata nguồn và audit được giữ để truy nguyên, không khóa chỉnh sửa.
ALTER TABLE "nguoi_dung"
  DROP COLUMN "thu_dien_tu",
  DROP COLUMN "so_dien_thoai",
  DROP COLUMN "ma_nhan_vien",
  DROP COLUMN "chuc_vu",
  DROP COLUMN "ngay_sinh",
  DROP COLUMN "ngay_vao_lam",
  DROP COLUMN "duong_dan_anh_dai_dien",
  DROP COLUMN "dia_chi",
  DROP COLUMN "dinh_danh_phong_ban";
ALTER TABLE "nguoi_dung" RENAME COLUMN "ho_ten" TO "ten_hien_thi";
COMMIT;
