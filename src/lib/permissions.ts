import { db } from "@/lib/db";
import { SessionUser } from "@/lib/auth";

/**
 * Trả về danh sách Department IDs mà user có quyền truy cập dữ liệu (Data Scope Cascade)
 * - Nếu là ADMIN, IT_ADMIN, hoặc có quyền MANAGE ở phân hệ chỉ định: trả về null (toàn quyền truy cập mọi phòng ban).
 * - Nếu là Quản lý cấp Cha: tự động bao quát ID phòng cha + toàn bộ ID bộ phận con trực thuộc.
 * - Nếu là Cán bộ nhân viên: chỉ truy cập trong phạm vi phòng ban / bộ phận của mình.
 */
export async function getAccessibleDepartmentIds(
  session: SessionUser,
  targetModule: "HR" | "TASK" = "HR"
): Promise<number[] | null> {
  // 1. Quản trị viên tối cao hoặc có quyền MANAGE phân hệ -> Toàn quyền toàn Tập đoàn
  if (
    session.roleCodes.includes("ADMIN") ||
    session.roleCodes.includes("IT_ADMIN") ||
    session.permissions[targetModule] === "MANAGE"
  ) {
    return null;
  }

  // 2. Nếu người dùng chưa được gắn phòng ban
  if (!session.departmentId) {
    return [];
  }

  // 3. Truy vấn phòng ban của user kèm toàn bộ các bộ phận con trực thuộc
  const userDept = await db.department.findUnique({
    where: { id: session.departmentId },
    include: {
      children: {
        select: { id: true },
      },
    },
  });

  if (!userDept) {
    return [session.departmentId];
  }

  const childIds = userDept.children.map((c) => c.id);
  return [userDept.id, ...childIds];
}
