import type { InventoryTransactionInput } from "@/lib/validations/inventory";
export const INVENTORY_LABELS: Record<InventoryTransactionInput["operation"], string> = {
  TON_DAU: "Ghi tồn đầu", NHAP: "Nhập hàng", CAP_PHAT: "Cấp phát", THU_HOI: "Thu hồi", CHUYEN_NOI_GIU: "Chuyển nơi giữ",
  DIEU_CHINH_TANG: "Điều chỉnh tăng", DIEU_CHINH_GIAM: "Điều chỉnh giảm", GIAM_DANG_CAP: "Ghi giảm đang cấp", DAO_GIAO_DICH: "Đảo giao dịch",
};
export function createInventoryRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // getRandomValues also works on the local network over HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function inventoryDbMessage(error: unknown): string | null {
  // Only expose our bounded business messages, never SQL/context/connection strings.
  const raw = error instanceof Error ? error.message : "";
  const match = raw.match(/Vật tư: ([^\n\r"']{1,250}\.)/u);
  return match?.[1] ?? null;
}
