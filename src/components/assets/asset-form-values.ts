import type { z } from "zod";
import type { SaveAssetSchema } from "@/lib/validations/asset";
import { dateInput } from "@/lib/asset-depreciation";
import type { AssetRow } from "./types";

export function assetFormValues(row: AssetRow): z.input<typeof SaveAssetSchema> {
  return {
    id: row.id, version: row.updated_at.toISOString(), name: row.ten_tai_san, categoryId: row.loai_tai_san_id,
    condition: row.tinh_trang, usage: row.hinh_thuc_su_dung, employeeId: row.nguoi_su_dung_id,
    departmentId: row.phong_quan_ly_id, locationId: row.vi_tri_id,
    serial: row.so_serial, model: row.hang_model, notes: row.ghi_chu,
    purchaseDate: dateInput(row.ngay_mua) || null, purchasePrice: row.gia_mua,
    depreciationMonths: row.thoi_gian_khau_hao_thang, warrantyUntil: dateInput(row.han_bao_hanh) || null,
  };
}
