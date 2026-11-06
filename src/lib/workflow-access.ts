import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  canWorkflow,
  workflowActions,
  type WorkflowAction,
} from "@/lib/role-catalog";
export { canWorkflow } from "@/lib/role-catalog";
export async function workflowActor(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  action: WorkflowAction,
) {
  const account = await tx.tai_khoan.findFirst({
    where: { id: session.userId, company_id: session.companyId },
    include: {
      nhan_su: true,
      danh_sach_vai_tro: {
        include: {
          vai_tro: {
            include: { danh_sach_quyen: { include: { quyen: true } } },
          },
        },
      },
    },
  });
  const actions = workflowActions(
    account?.danh_sach_vai_tro
      .filter((r) => r.vai_tro.company_id === session.companyId)
      .flatMap((r) => r.vai_tro.danh_sach_quyen.map((p) => p.quyen)) ?? [],
  );
  if (
    !account?.cho_phep_dang_nhap ||
    account.bat_buoc_doi_mat_khau ||
    account.phien_ban_dang_nhap !== session.sessionVersion ||
    account.nhan_su?.tinh_trang_lam_viec === "LEFT" ||
    !canWorkflow(actions, action)
  )
    throw Error(
      "Không có quyền thao tác quy trình hoặc phiên đã hết hiệu lực.",
    );
  return { account, actions };
}
export function workflowRecordScope(
  session: SessionUser,
): Prisma.ho_so_quy_trinhWhereInput {
  return {
    company_id: session.companyId,
    ...(canWorkflow(session.workflowActions, "MANAGE")
      ? {}
      : {
          OR: [
            { nguoi_gui_id: session.employeeId ?? -1 },
            {
              danh_sach_buoc: {
                some: { nguoi_duoc_giao_id: session.employeeId ?? -1 },
              },
            },
          ],
        }),
  };
}
// Eligibility needs VIEW + the step action on one active account, never their union across accounts.
export async function assigneeIssue(
  tx: Prisma.TransactionClient,
  companyId: number,
  employeeId: number | null,
  kind: "APPROVAL" | "TASK",
  requesterId?: number,
): Promise<string | null> {
  if (!employeeId) return "Chưa chọn người xử lý/người phụ trách phòng.";
  if (kind === "APPROVAL" && employeeId === requesterId)
    return "Người gửi không được tự duyệt hồ sơ của mình.";
  const person = await tx.nhan_su.findFirst({
    where: { id: employeeId, company_id: companyId },
    include: {
      danh_sach_tai_khoan: {
        where: { cho_phep_dang_nhap: true, company_id: companyId },
        include: {
          danh_sach_vai_tro: {
            include: {
              vai_tro: {
                include: { danh_sach_quyen: { include: { quyen: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!person || person.tinh_trang_lam_viec !== "ACTIVE")
    return "Người xử lý không còn ở trạng thái đang làm việc.";
  const enough = person.danh_sach_tai_khoan.some((a) =>
    canWorkflow(
      workflowActions(
        a.danh_sach_vai_tro
          .filter((r) => r.vai_tro.company_id === companyId)
          .flatMap((r) => r.vai_tro.danh_sach_quyen.map((p) => p.quyen)),
      ),
      kind === "APPROVAL" ? "APPROVE" : "EXECUTE",
    ),
  );
  return enough
    ? null
    : "Người xử lý chưa có tài khoản đang mở đủ quyền xem và xử lý bước này.";
}
