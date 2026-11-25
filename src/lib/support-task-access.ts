import {
  loadManagerGraph,
  createManagerResolver,
} from "./employee-manager-resolution";
import type { z } from "zod";
import type { TaskFields } from "./support-task";
import type { Prisma, cong_viec_ho_tro } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { taskActions, canTask, type TaskAction } from "./support-task";
export class TaskError extends Error {}
export async function taskActor(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  action: TaskAction = "VIEW",
  lock = false,
) {
  if (lock) {
    await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id=${session.companyId} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126,${session.companyId}::int)`;
  }
  try {
    const a = await currentActor(tx, session, "SUPPORT_TASK", action);
    const actions = taskActions(a.grants);
    if (!canTask(actions, action))
      throw new TaskError("Bạn chưa có quyền thực hiện thao tác này.");
    const account = await tx.tai_khoan.findFirst({
      where: { id: session.userId, company_id: session.companyId },
      select: { employee_id: true, nhan_su: true },
    });
    const person = account?.nhan_su;
    if (!person || person.tinh_trang_lam_viec !== "ACTIVE")
      throw new TaskError("Cần liên kết tài khoản với nhân sự đang làm việc.");
    const departments = canTask(actions, "MANAGE")
      ? await tx.phong_ban.findMany({
          where: {
            company_id: session.companyId,
            nguoi_phu_trach_id: person.id,
          },
          select: { id: true },
        })
      : [];
    return { session, person, actions, managed: departments.map((d) => d.id) };
  } catch (e) {
    if (e instanceof TaskError) throw e;
    if (
      e instanceof Error &&
      e.message === "Quyền truy cập đã thay đổi. Vui lòng tải lại trang."
    )
      throw new TaskError(
        "Phiên hoặc quyền truy cập đã thay đổi. Vui lòng tải lại trang.",
      );
    // Database/runtime failures must reach the action's diagnostics, not look like permission loss.
    throw e;
  }
}
export type TaskActor = Awaited<ReturnType<typeof taskActor>>;
export function taskScope(a: TaskActor): Prisma.cong_viec_ho_troWhereInput {
  const id = a.person.id;
  return {
    company_id: a.session.companyId,
    OR: [
      { nguoi_yeu_cau_id: id },
      { nguoi_duoc_yeu_cau_id: id },
      { nguoi_thuc_hien_id: id },
      { nguoi_nghiem_thu_id: id },
      { quan_ly_nguoi_yeu_cau_id: id },
      { quan_ly_ben_ho_tro_id: id },
      { phong_ho_tro_id: { in: a.managed } },
      {
        loai_dich_nhan: "PHONG_BAN",
        trang_thai: "CHO_NHAN",
        phong_ho_tro_id: a.person.department_id ?? -1,
      },
    ],
  };
}
export function taskButtons(t: cong_viec_ho_tro, a: TaskActor) {
  const active = ["DANG_THUC_HIEN", "CAN_BO_SUNG"].includes(t.trang_thai),
    manage =
      canTask(a.actions, "MANAGE") && a.managed.includes(t.phong_ho_tro_id);
  return {
    receive:
      canTask(a.actions, "EXECUTE") &&
      t.trang_thai === "CHO_NHAN" &&
      t.nguoi_duoc_yeu_cau_id === a.person.id,
    personalDecline:
      canTask(a.actions, "EXECUTE") &&
      t.trang_thai === "CHO_NHAN" &&
      t.loai_dich_nhan === "PHONG_BAN" &&
      t.phong_ho_tro_id === a.person.department_id,
    work:
      canTask(a.actions, "EXECUTE") &&
      active &&
      t.nguoi_thuc_hien_id === a.person.id,
    accept:
      canTask(a.actions, "ACCEPT") &&
      t.trang_thai === "CHO_NGHIEM_THU" &&
      t.nguoi_nghiem_thu_id === a.person.id &&
      t.nguoi_thuc_hien_id !== a.person.id,
    edit:
      canTask(a.actions, "CREATE") &&
      t.trang_thai === "CHO_NHAN" &&
      t.nguoi_yeu_cau_id === a.person.id,
    manage: manage && !["HOAN_THANH", "DA_HUY"].includes(t.trang_thai),
    assign: manage && ["CHO_NHAN", "TU_CHOI"].includes(t.trang_thai),
    handoff: manage && active,
  };
}
export function accountTaskWhere(
  companyId: number,
  action: TaskAction = "VIEW",
): Prisma.tai_khoanWhereInput {
  return {
    company_id: companyId,
    cho_phep_dang_nhap: true,
    nhan_su: { tinh_trang_lam_viec: "ACTIVE" },
    AND: [...new Set(["VIEW", action])].map((hanh_dong) => ({
      danh_sach_vai_tro: {
        some: {
          vai_tro: {
            company_id: companyId,
            danh_sach_quyen: {
              some: {
                quyen: { phan_he: "SUPPORT_TASK", hanh_dong, pham_vi: "ALL" },
              },
            },
          },
        },
      },
    })),
  };
}
export async function eligiblePerson(
  tx: Prisma.TransactionClient,
  companyId: number,
  id: number | null | undefined,
  action: TaskAction = "VIEW",
) {
  if (!id)
    throw new TaskError(
      "Chưa khai báo quản lý trực tiếp hoặc người phụ trách phòng. Hãy cập nhật tại Nhân sự.",
    );
  const p = await tx.nhan_su.findFirst({
    where: {
      id,
      company_id: companyId,
      tinh_trang_lam_viec: "ACTIVE",
      danh_sach_tai_khoan: { some: accountTaskWhere(companyId, action) },
    },
  });
  if (!p)
    throw new TaskError(
      "Người liên quan chưa có tài khoản hoạt động hoặc quyền Công việc phù hợp. Hãy kiểm tra Nhân sự và Vai trò.",
    );
  return p;
}
export async function resolveTaskManager(
  tx: Prisma.TransactionClient,
  companyId: number,
  personId: number,
) {
  const resolution = createManagerResolver(
    await loadManagerGraph(tx, companyId),
  ).resolve(personId);
  if (resolution.error) throw new TaskError(resolution.error);
  if (resolution.source === "TOP_LEVEL") return null;
  return eligiblePerson(tx, companyId, resolution.managerId);
}
export async function resolveTaskTarget(
  tx: Prisma.TransactionClient,
  companyId: number,
  type: "CA_NHAN" | "PHONG_BAN",
  targetId: number,
) {
  if (type === "CA_NHAN") {
    const p = await eligiblePerson(tx, companyId, targetId, "EXECUTE");
    if (!p.department_id)
      throw new TaskError("Người hỗ trợ chưa được gắn phòng ban.");
    const manager = await resolveTaskManager(tx, companyId, p.id);
    return {
      loai_dich_nhan: type,
      phong_ho_tro_id: p.department_id,
      nguoi_duoc_yeu_cau_id: p.id,
      quan_ly_ben_ho_tro_id: manager?.id ?? null,
    };
  }
  const department = await tx.phong_ban.findFirst({
    where: { id: targetId, company_id: companyId },
  });
  if (!department) throw new TaskError("Phòng hỗ trợ không hợp lệ.");
  // The explicitly assigned department head coordinates the queue; not inferred as individual line manager.
  const manager = await eligiblePerson(
    tx,
    companyId,
    department.nguoi_phu_trach_id,
    "MANAGE",
  );
  const count = await tx.tai_khoan.count({
    where: {
      ...accountTaskWhere(companyId),
      nhan_su: { department_id: department.id, tinh_trang_lam_viec: "ACTIVE" },
    },
  });
  if (!count)
    throw new TaskError("Phòng hỗ trợ chưa có tài khoản nhận thông báo.");
  return {
    loai_dich_nhan: type,
    phong_ho_tro_id: department.id,
    nguoi_duoc_yeu_cau_id: null,
    quan_ly_ben_ho_tro_id: manager?.id ?? null,
  };
}

export async function validateTaskCreation(
  tx: Prisma.TransactionClient,
  a: TaskActor,
  v: z.infer<typeof TaskFields>,
) {
  const manager = await resolveTaskManager(
      tx,
      a.session.companyId,
      a.person.id,
    ),
    target = await resolveTaskTarget(
      tx,
      a.session.companyId,
      v.targetType,
      v.targetId,
    );
  const reviewer =
    v.acceptance === "KHONG_CAN"
      ? null
      : await eligiblePerson(
          tx,
          a.session.companyId,
          v.acceptance === "NGUOI_YEU_CAU" ? a.person.id : manager?.id,
          "ACCEPT",
        );
  if (reviewer && reviewer.id === target.nguoi_duoc_yeu_cau_id)
    throw new TaskError(
      "Người thực hiện không được tự nghiệm thu. Chọn chế độ nghiệm thu khác.",
    );
  const now = new Date(),
    start = v.startAt ? new Date(v.startAt) : now,
    deadline = v.deadline ? new Date(v.deadline) : null;
  if (deadline && deadline < start)
    throw new TaskError("Hạn hoàn thành phải từ thời gian bắt đầu trở đi.");

  return { manager, target, reviewer, now, start, deadline };
}
