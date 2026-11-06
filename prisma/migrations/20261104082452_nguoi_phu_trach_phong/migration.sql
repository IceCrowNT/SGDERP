-- AlterTable
ALTER TABLE "phong_ban" ADD COLUMN     "dinh_danh_nguoi_phu_trach" INTEGER;

-- CreateIndex
CREATE INDEX "phong_ban_dinh_danh_nguoi_phu_trach_dinh_danh_cong_ty_idx" ON "phong_ban"("dinh_danh_nguoi_phu_trach", "dinh_danh_cong_ty");

-- AddForeignKey
ALTER TABLE "phong_ban" ADD CONSTRAINT "phong_ban_dinh_danh_nguoi_phu_trach_dinh_danh_cong_ty_fkey" FOREIGN KEY ("dinh_danh_nguoi_phu_trach", "dinh_danh_cong_ty") REFERENCES "nhan_su"("dinh_danh", "dinh_danh_cong_ty") ON DELETE RESTRICT ON UPDATE CASCADE;
