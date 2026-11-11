export type WorkLocation = {
  id: number;
  parent_id: number | null;
  ten_vi_tri: string;
  loai_vi_tri: string;
  dang_su_dung: boolean;
};
export type LocationEmployee = {
  id: number;
  name: string;
  department: string | null;
  status: string;
  locationId: number | null;
  version: string;
};

export class WorkLocationError extends Error {
  constructor(
    message: string,
    public readonly code: "STALE" | "CONFIRM_MOVE" | "INVALID",
  ) {
    super(message);
  }
}

// Both entry points use the same transition rules; DB writes stay in actions.
export function assertWorkLocationChange(input: {
  currentId: number | null;
  targetId: number | null;
  currentVersion: string;
  expectedVersion?: string;
  status: string;
  confirmMove?: boolean;
}) {
  if (input.currentVersion !== input.expectedVersion)
    throw new WorkLocationError(
      "Hồ sơ đã thay đổi. Hãy chọn lại nhân sự để xác nhận vị trí mới nhất.",
      "STALE",
    );
  if (input.currentId === input.targetId) return;
  if (input.targetId !== null && input.status !== "ACTIVE")
    throw new WorkLocationError("Chỉ gán vị trí mới cho nhân sự đang làm việc.", "INVALID");
  if (input.currentId !== null && input.targetId !== null && !input.confirmMove)
    throw new WorkLocationError("Nhân sự đã có vị trí. Vui lòng xác nhận chuyển vị trí.", "CONFIRM_MOVE");
}
export function isAvailableWorkLocation(id: number, rows: WorkLocation[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  let current = byId.get(id);
  if (
    !current ||
    !["PHONG", "KHU_VUC", "CHO_NGOI"].includes(current.loai_vi_tri)
  )
    return false;
  const seen = new Set<number>();
  while (current) {
    if (!current.dang_su_dung || seen.has(current.id)) return false;
    seen.add(current.id);
    if (current.parent_id === null) return true;
    current = byId.get(current.parent_id);
  }
  return false;
}
