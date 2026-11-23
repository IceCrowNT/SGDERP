BEGIN;
-- CreateEnum
CREATE TYPE "TrangThaiCongViecHoTro" AS ENUM ('CHO_NHAN', 'DANG_THUC_HIEN', 'CHO_NGHIEM_THU', 'CAN_BO_SUNG', 'HOAN_THANH', 'TU_CHOI', 'DA_HUY');

-- CreateEnum
CREATE TYPE "LoaiDichNhanCongViec" AS ENUM ('CA_NHAN', 'PHONG_BAN');

-- CreateEnum
CREATE TYPE "CheDoNghiemThuCongViec" AS ENUM ('KHONG_CAN', 'NGUOI_YEU_CAU', 'QUAN_LY');

-- CreateEnum
CREATE TYPE "HanhDongCongViec" AS ENUM ('TAO', 'SUA', 'NHAN', 'TU_CHOI_CA_NHAN', 'TU_CHOI_YEU_CAU', 'CHUYEN_DICH', 'DOI_NGUOI_NGHIEM_THU', 'DOI_QUAN_LY', 'THEM_TEP', 'BAO_XONG', 'YEU_CAU_BO_SUNG', 'NGHIEM_THU', 'HUY');

-- CreateEnum
CREATE TYPE "LoaiTepCongViec" AS ENUM ('MO_TA', 'BANG_CHUNG');

-- CreateEnum
CREATE TYPE "LoaiThongBaoCongViec" AS ENUM ('YEU_CAU_MOI', 'CAP_NHAT', 'CAN_NGHIEM_THU', 'CAN_BO_SUNG', 'HOAN_THANH', 'DA_HUY');

-- AlterTable
ALTER TABLE "nhan_su" ADD COLUMN     "quan_ly_truc_tiep_id" INTEGER;

-- CreateTable
CREATE TABLE "cong_viec_ho_tro" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tieu_de" VARCHAR(255) NOT NULL,
    "noi_dung" TEXT NOT NULL,
    "hang_muc" VARCHAR(50) NOT NULL,
    "tinh_chat" VARCHAR(50),
    "muc_do" VARCHAR(30),
    "trang_thai" "TrangThaiCongViecHoTro" NOT NULL DEFAULT 'CHO_NHAN',
    "nguoi_yeu_cau_id" INTEGER NOT NULL,
    "tai_khoan_tao_id" INTEGER NOT NULL,
    "phong_nguoi_yeu_cau_id" INTEGER,
    "loai_dich_nhan" "LoaiDichNhanCongViec" NOT NULL,
    "phong_ho_tro_id" INTEGER NOT NULL,
    "nguoi_duoc_yeu_cau_id" INTEGER,
    "nguoi_thuc_hien_id" INTEGER,
    "quan_ly_nguoi_yeu_cau_id" INTEGER,
    "quan_ly_ben_ho_tro_id" INTEGER,
    "che_do_nghiem_thu" "CheDoNghiemThuCongViec" NOT NULL,
    "nghiem_thu_bat_buoc" BOOLEAN NOT NULL,
    "nguoi_nghiem_thu_id" INTEGER,
    "bat_dau_luc" TIMESTAMPTZ(3) NOT NULL,
    "han_hoan_thanh" TIMESTAMPTZ(3),
    "nhan_luc" TIMESTAMPTZ(3),
    "bao_xong_luc" TIMESTAMPTZ(3),
    "nghiem_thu_luc" TIMESTAMPTZ(3),
    "dong_luc" TIMESTAMPTZ(3),
    "so_lan_bao_xong" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "request_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cong_viec_ho_tro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_su_cong_viec" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cong_viec_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "operation_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "tai_khoan_thao_tac_id" INTEGER NOT NULL,
    "nhan_su_thao_tac_id" INTEGER NOT NULL,
    "hanh_dong" "HanhDongCongViec" NOT NULL,
    "ly_do" TEXT,
    "lan_bao_xong" INTEGER,
    "du_lieu_truoc" JSONB NOT NULL DEFAULT '{}',
    "du_lieu_sau" JSONB NOT NULL DEFAULT '{}',
    "ket_qua" JSONB NOT NULL,

    CONSTRAINT "lich_su_cong_viec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tep_cong_viec" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cong_viec_id" INTEGER NOT NULL,
    "tai_khoan_tai_id" INTEGER NOT NULL,
    "upload_id" UUID NOT NULL,
    "khoa_luu_tru" VARCHAR(255) NOT NULL,
    "ten_goc" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "kich_thuoc_byte" BIGINT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "loai_tep" "LoaiTepCongViec" NOT NULL,
    "su_kien_bao_xong_id" INTEGER,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tep_cong_viec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thong_bao_cong_viec" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cong_viec_id" INTEGER NOT NULL,
    "version_su_kien" INTEGER NOT NULL,
    "tai_khoan_nhan_id" INTEGER NOT NULL,
    "loai" "LoaiThongBaoCongViec" NOT NULL,
    "da_doc_luc" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "thong_bao_cong_viec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cv_thuc_hien_idx" ON "cong_viec_ho_tro"("company_id", "nguoi_thuc_hien_id", "trang_thai", "updated_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "cv_yeu_cau_idx" ON "cong_viec_ho_tro"("company_id", "nguoi_yeu_cau_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "cv_quan_ly_gui_idx" ON "cong_viec_ho_tro"("company_id", "quan_ly_nguoi_yeu_cau_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "cv_quan_ly_nhan_idx" ON "cong_viec_ho_tro"("company_id", "quan_ly_ben_ho_tro_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cong_viec_ho_tro_id_company_id_key" ON "cong_viec_ho_tro"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_request_key" ON "cong_viec_ho_tro"("company_id", "tai_khoan_tao_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_operation_key" ON "lich_su_cong_viec"("cong_viec_id", "operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_event_version_key" ON "lich_su_cong_viec"("cong_viec_id", "company_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "cv_event_identity_key" ON "lich_su_cong_viec"("id", "cong_viec_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tep_cong_viec_khoa_luu_tru_key" ON "tep_cong_viec"("khoa_luu_tru");

-- CreateIndex
CREATE INDEX "cv_files_idx" ON "tep_cong_viec"("company_id", "cong_viec_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "cv_file_event_idx" ON "tep_cong_viec"("su_kien_bao_xong_id", "cong_viec_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_upload_key" ON "tep_cong_viec"("company_id", "tai_khoan_tai_id", "upload_id");

-- CreateIndex
CREATE INDEX "cv_notification_idx" ON "thong_bao_cong_viec"("company_id", "tai_khoan_nhan_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cv_notification_key" ON "thong_bao_cong_viec"("cong_viec_id", "version_su_kien", "tai_khoan_nhan_id");

-- CreateIndex
CREATE INDEX "nhan_su_company_id_quan_ly_truc_tiep_id_idx" ON "nhan_su"("company_id", "quan_ly_truc_tiep_id");

-- AddForeignKey
ALTER TABLE "nhan_su" ADD CONSTRAINT "nhan_su_quan_ly_truc_tiep_id_company_id_fkey" FOREIGN KEY ("quan_ly_truc_tiep_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_nguoi_yeu_cau_id_company_id_fkey" FOREIGN KEY ("nguoi_yeu_cau_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_tai_khoan_tao_id_company_id_fkey" FOREIGN KEY ("tai_khoan_tao_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_phong_nguoi_yeu_cau_id_company_id_fkey" FOREIGN KEY ("phong_nguoi_yeu_cau_id", "company_id") REFERENCES "phong_ban"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_phong_ho_tro_id_company_id_fkey" FOREIGN KEY ("phong_ho_tro_id", "company_id") REFERENCES "phong_ban"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_nguoi_duoc_yeu_cau_id_company_id_fkey" FOREIGN KEY ("nguoi_duoc_yeu_cau_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_nguoi_thuc_hien_id_company_id_fkey" FOREIGN KEY ("nguoi_thuc_hien_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_quan_ly_nguoi_yeu_cau_id_company_id_fkey" FOREIGN KEY ("quan_ly_nguoi_yeu_cau_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_quan_ly_ben_ho_tro_id_company_id_fkey" FOREIGN KEY ("quan_ly_ben_ho_tro_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "cong_viec_ho_tro" ADD CONSTRAINT "cong_viec_ho_tro_nguoi_nghiem_thu_id_company_id_fkey" FOREIGN KEY ("nguoi_nghiem_thu_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "lich_su_cong_viec" ADD CONSTRAINT "lich_su_cong_viec_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "lich_su_cong_viec" ADD CONSTRAINT "lich_su_cong_viec_cong_viec_id_company_id_fkey" FOREIGN KEY ("cong_viec_id", "company_id") REFERENCES "cong_viec_ho_tro"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "lich_su_cong_viec" ADD CONSTRAINT "lich_su_cong_viec_tai_khoan_thao_tac_id_company_id_fkey" FOREIGN KEY ("tai_khoan_thao_tac_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "lich_su_cong_viec" ADD CONSTRAINT "lich_su_cong_viec_nhan_su_thao_tac_id_company_id_fkey" FOREIGN KEY ("nhan_su_thao_tac_id", "company_id") REFERENCES "nhan_su"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tep_cong_viec" ADD CONSTRAINT "tep_cong_viec_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tep_cong_viec" ADD CONSTRAINT "tep_cong_viec_cong_viec_id_company_id_fkey" FOREIGN KEY ("cong_viec_id", "company_id") REFERENCES "cong_viec_ho_tro"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tep_cong_viec" ADD CONSTRAINT "tep_cong_viec_tai_khoan_tai_id_company_id_fkey" FOREIGN KEY ("tai_khoan_tai_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tep_cong_viec" ADD CONSTRAINT "tep_cong_viec_su_kien_bao_xong_id_cong_viec_id_company_id_fkey" FOREIGN KEY ("su_kien_bao_xong_id", "cong_viec_id", "company_id") REFERENCES "lich_su_cong_viec"("id", "cong_viec_id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "thong_bao_cong_viec" ADD CONSTRAINT "thong_bao_cong_viec_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cong_ty"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "thong_bao_cong_viec" ADD CONSTRAINT "thong_bao_cong_viec_cong_viec_id_company_id_fkey" FOREIGN KEY ("cong_viec_id", "company_id") REFERENCES "cong_viec_ho_tro"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "thong_bao_cong_viec" ADD CONSTRAINT "thong_bao_cong_viec_tai_khoan_nhan_id_company_id_fkey" FOREIGN KEY ("tai_khoan_nhan_id", "company_id") REFERENCES "tai_khoan"("id", "company_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "thong_bao_cong_viec" ADD CONSTRAINT "thong_bao_cong_viec_cong_viec_id_company_id_version_su_kie_fkey" FOREIGN KEY ("cong_viec_id", "company_id", "version_su_kien") REFERENCES "lich_su_cong_viec"("cong_viec_id", "company_id", "version") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Business integrity not expressible by Prisma.
ALTER TABLE nhan_su ADD CONSTRAINT nhan_su_quan_ly_khong_tu CHECK (quan_ly_truc_tiep_id IS DISTINCT FROM id);
CREATE FUNCTION kiem_tra_quan_ly_truc_tiep() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM cong_ty WHERE id=NEW.company_id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(260126, NEW.company_id);
 IF NEW.quan_ly_truc_tiep_id IS NOT NULL AND EXISTS (
  WITH RECURSIVE cap_tren AS (
   SELECT id,quan_ly_truc_tiep_id FROM nhan_su WHERE id=NEW.quan_ly_truc_tiep_id AND company_id=NEW.company_id
   UNION SELECT n.id,n.quan_ly_truc_tiep_id FROM nhan_su n JOIN cap_tren c ON n.id=c.quan_ly_truc_tiep_id WHERE n.company_id=NEW.company_id
  ) SELECT 1 FROM cap_tren WHERE id=NEW.id
 ) THEN RAISE EXCEPTION 'Công việc: quan hệ quản lý tạo vòng lặp.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER nhan_su_quan_ly_cay BEFORE INSERT OR UPDATE OF quan_ly_truc_tiep_id ON nhan_su FOR EACH ROW EXECUTE FUNCTION kiem_tra_quan_ly_truc_tiep();
ALTER TABLE cong_viec_ho_tro
 ADD CONSTRAINT cv_noi_dung CHECK(length(trim(tieu_de))>0 AND length(trim(noi_dung)) BETWEEN 1 AND 20000),
 ADD CONSTRAINT cv_dich CHECK ((loai_dich_nhan='CA_NHAN')=(nguoi_duoc_yeu_cau_id IS NOT NULL)),
 ADD CONSTRAINT cv_nghiem_thu CHECK ((che_do_nghiem_thu='KHONG_CAN')=(nguoi_nghiem_thu_id IS NULL) AND (NOT nghiem_thu_bat_buoc OR che_do_nghiem_thu<>'KHONG_CAN') AND (che_do_nghiem_thu<>'NGUOI_YEU_CAU' OR nguoi_nghiem_thu_id=nguoi_yeu_cau_id) AND (nguoi_thuc_hien_id IS NULL OR nguoi_nghiem_thu_id IS DISTINCT FROM nguoi_thuc_hien_id)),
 ADD CONSTRAINT cv_dem CHECK(version>=1 AND so_lan_bao_xong>=0),
 ADD CONSTRAINT cv_thoi_gian CHECK((han_hoan_thanh IS NULL OR han_hoan_thanh>=bat_dau_luc) AND (bao_xong_luc IS NULL OR (nhan_luc IS NOT NULL AND bao_xong_luc>=nhan_luc AND bao_xong_luc>=bat_dau_luc)) AND (nghiem_thu_luc IS NULL OR (bao_xong_luc IS NOT NULL AND nghiem_thu_luc>=bao_xong_luc)) AND (dong_luc IS NULL OR dong_luc>=created_at)),
 ADD CONSTRAINT cv_trang_thai CHECK (
  (trang_thai IN ('CHO_NHAN','TU_CHOI') AND nguoi_thuc_hien_id IS NULL AND nhan_luc IS NULL AND bao_xong_luc IS NULL AND nghiem_thu_luc IS NULL AND dong_luc IS NULL) OR
  (trang_thai IN ('DANG_THUC_HIEN','CAN_BO_SUNG') AND nguoi_thuc_hien_id IS NOT NULL AND nhan_luc IS NOT NULL AND bao_xong_luc IS NULL AND nghiem_thu_luc IS NULL AND dong_luc IS NULL AND (trang_thai<>'CAN_BO_SUNG' OR so_lan_bao_xong>0)) OR
  (trang_thai='CHO_NGHIEM_THU' AND nguoi_thuc_hien_id IS NOT NULL AND nhan_luc IS NOT NULL AND bao_xong_luc IS NOT NULL AND nghiem_thu_luc IS NULL AND dong_luc IS NULL AND che_do_nghiem_thu<>'KHONG_CAN' AND so_lan_bao_xong>0) OR
  (trang_thai='HOAN_THANH' AND nguoi_thuc_hien_id IS NOT NULL AND nhan_luc IS NOT NULL AND bao_xong_luc IS NOT NULL AND dong_luc IS NOT NULL AND dong_luc>=bao_xong_luc AND ((che_do_nghiem_thu='KHONG_CAN')=(nghiem_thu_luc IS NULL)) AND so_lan_bao_xong>0) OR
  (trang_thai='DA_HUY' AND ((nguoi_thuc_hien_id IS NULL)=(nhan_luc IS NULL)) AND dong_luc IS NOT NULL AND nghiem_thu_luc IS NULL)
 );
ALTER TABLE lich_su_cong_viec ADD CONSTRAINT cv_ls_json CHECK(jsonb_typeof(du_lieu_truoc)='object' AND jsonb_typeof(du_lieu_sau)='object' AND jsonb_typeof(ket_qua)='object'),
 ADD CONSTRAINT cv_ls_vong CHECK(version>=1 AND ((hanh_dong IN ('BAO_XONG','YEU_CAU_BO_SUNG','NGHIEM_THU') AND lan_bao_xong IS NOT NULL AND lan_bao_xong>0) OR (hanh_dong NOT IN ('BAO_XONG','YEU_CAU_BO_SUNG','NGHIEM_THU') AND lan_bao_xong IS NULL))),
 ADD CONSTRAINT cv_ls_ly_do CHECK(hanh_dong NOT IN ('TU_CHOI_CA_NHAN','TU_CHOI_YEU_CAU','CHUYEN_DICH','DOI_NGUOI_NGHIEM_THU','DOI_QUAN_LY','YEU_CAU_BO_SUNG','HUY') OR (ly_do IS NOT NULL AND length(trim(ly_do)) BETWEEN 1 AND 2000));
ALTER TABLE tep_cong_viec ADD CONSTRAINT cv_tep_size CHECK(kich_thuoc_byte BETWEEN 1 AND 10485760), ADD CONSTRAINT cv_tep_mo_ta CHECK(loai_tep<>'MO_TA' OR su_kien_bao_xong_id IS NULL);
CREATE UNIQUE INDEX cv_bao_xong_vong ON lich_su_cong_viec(cong_viec_id,lan_bao_xong) WHERE hanh_dong='BAO_XONG';
CREATE INDEX cv_cho_ca_nhan ON cong_viec_ho_tro(company_id,nguoi_duoc_yeu_cau_id,created_at,id) WHERE trang_thai='CHO_NHAN';
CREATE INDEX cv_cho_phong ON cong_viec_ho_tro(company_id,phong_ho_tro_id,created_at,id) WHERE loai_dich_nhan='PHONG_BAN' AND trang_thai='CHO_NHAN';
CREATE INDEX cv_cho_nghiem_thu ON cong_viec_ho_tro(company_id,nguoi_nghiem_thu_id,created_at,id) WHERE trang_thai='CHO_NGHIEM_THU';
CREATE INDEX cv_han ON cong_viec_ho_tro(company_id,han_hoan_thanh,id) WHERE han_hoan_thanh IS NOT NULL AND trang_thai IN ('CHO_NHAN','DANG_THUC_HIEN','CAN_BO_SUNG');
CREATE INDEX cv_tu_choi ON lich_su_cong_viec(cong_viec_id,nhan_su_thao_tac_id,version DESC) WHERE hanh_dong='TU_CHOI_CA_NHAN';
CREATE INDEX cv_chua_doc ON thong_bao_cong_viec(company_id,tai_khoan_nhan_id,created_at DESC,id DESC) WHERE da_doc_luc IS NULL;
CREATE FUNCTION bao_ve_lich_su_cong_viec() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Công việc: lịch sử chỉ được ghi thêm.'; END $$;
CREATE TRIGGER cv_lich_su_bat_bien BEFORE UPDATE OR DELETE ON lich_su_cong_viec FOR EACH ROW EXECUTE FUNCTION bao_ve_lich_su_cong_viec();
CREATE FUNCTION bao_ve_cong_viec() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Công việc: không xóa cứng.'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.version<>1 OR NEW.so_lan_bao_xong<>0 OR NEW.trang_thai<>'CHO_NHAN' THEN RAISE EXCEPTION 'Công việc: trạng thái tạo không hợp lệ.'; END IF;
 ELSE
  IF ROW(NEW.id,NEW.company_id,NEW.nguoi_yeu_cau_id,NEW.tai_khoan_tao_id,NEW.request_id,NEW.request_hash,NEW.created_at,NEW.nghiem_thu_bat_buoc) IS DISTINCT FROM ROW(OLD.id,OLD.company_id,OLD.nguoi_yeu_cau_id,OLD.tai_khoan_tao_id,OLD.request_id,OLD.request_hash,OLD.created_at,OLD.nghiem_thu_bat_buoc) OR NEW.version<>OLD.version+1 OR NEW.so_lan_bao_xong NOT BETWEEN OLD.so_lan_bao_xong AND OLD.so_lan_bao_xong+1 OR OLD.trang_thai IN ('HOAN_THANH','DA_HUY') THEN RAISE EXCEPTION 'Công việc: thay đổi không hợp lệ.'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cv_bao_ve BEFORE INSERT OR UPDATE OR DELETE ON cong_viec_ho_tro FOR EACH ROW EXECUTE FUNCTION bao_ve_cong_viec();
CREATE FUNCTION kiem_tra_su_kien_cong_viec() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v cong_viec_ho_tro; e lich_su_cong_viec; target_id integer; target_version integer;
BEGIN
 IF TG_TABLE_NAME='cong_viec_ho_tro' THEN target_id:=NEW.id; ELSE target_id:=NEW.cong_viec_id; END IF;
 target_version:=NEW.version;
 SELECT * INTO v FROM cong_viec_ho_tro WHERE id=target_id;
 SELECT * INTO e FROM lich_su_cong_viec WHERE cong_viec_id=target_id AND version=target_version;
 IF e.id IS NULL OR v.version<>target_version OR (target_version=1 AND e.hanh_dong<>'TAO') OR (target_version>1 AND (e.hanh_dong='TAO' OR NOT EXISTS(SELECT 1 FROM lich_su_cong_viec WHERE cong_viec_id=target_id AND version=target_version-1))) THEN RAISE EXCEPTION 'Công việc: thiếu lịch sử hoặc phiên bản không liên tiếp.'; END IF;
 IF e.hanh_dong='BAO_XONG' AND (e.lan_bao_xong<>v.so_lan_bao_xong OR e.lan_bao_xong<>1+(SELECT count(*) FROM lich_su_cong_viec WHERE cong_viec_id=target_id AND hanh_dong='BAO_XONG' AND version<target_version) OR v.trang_thai NOT IN ('CHO_NGHIEM_THU','HOAN_THANH')) THEN RAISE EXCEPTION 'Công việc: vòng báo xong không hợp lệ.'; END IF;
 IF e.hanh_dong IN ('YEU_CAU_BO_SUNG','NGHIEM_THU') AND (e.lan_bao_xong<>v.so_lan_bao_xong OR NOT EXISTS(SELECT 1 FROM lich_su_cong_viec WHERE cong_viec_id=target_id AND hanh_dong='BAO_XONG' AND lan_bao_xong=e.lan_bao_xong AND version<target_version)) THEN RAISE EXCEPTION 'Công việc: không có vòng báo xong.'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER cv_su_kien AFTER INSERT OR UPDATE ON cong_viec_ho_tro DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kiem_tra_su_kien_cong_viec();
CREATE CONSTRAINT TRIGGER cv_lich_su AFTER INSERT ON lich_su_cong_viec DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION kiem_tra_su_kien_cong_viec();
CREATE FUNCTION bao_ve_tep_cong_viec() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Công việc: giữ bằng chứng.'; END IF;
 IF TG_OP='UPDATE' AND (OLD.su_kien_bao_xong_id IS NOT NULL OR NEW.su_kien_bao_xong_id IS NULL OR (to_jsonb(NEW)-'su_kien_bao_xong_id'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'su_kien_bao_xong_id'-'updated_at')) THEN RAISE EXCEPTION 'Công việc: tệp bất biến.'; END IF;
 IF NEW.su_kien_bao_xong_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM lich_su_cong_viec WHERE id=NEW.su_kien_bao_xong_id AND cong_viec_id=NEW.cong_viec_id AND company_id=NEW.company_id AND hanh_dong='BAO_XONG') THEN RAISE EXCEPTION 'Công việc: bằng chứng sai sự kiện.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cv_tep_bao_ve BEFORE INSERT OR UPDATE OR DELETE ON tep_cong_viec FOR EACH ROW EXECUTE FUNCTION bao_ve_tep_cong_viec();
INSERT INTO quyen (phan_he,hanh_dong,pham_vi,ten_quyen,updated_at)
SELECT 'SUPPORT_TASK',a,'ALL','Công việc hỗ trợ: '||a,now() FROM unnest(ARRAY['VIEW','CREATE','EXECUTE','ACCEPT','MANAGE']) a
ON CONFLICT DO NOTHING;

COMMIT;
