"use server";
import { createHash, randomUUID } from "node:crypto";
import {
  Prisma,
  type cong_viec_ho_tro,
  type HanhDongCongViec,
  type LoaiThongBaoCongViec,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  CreateTaskSchema,
  TaskMutationSchema,
  TaskListSchema,
  TASK_EVENTS,
  canTask,
  type TaskFailure,
  type TaskFailureCode,
} from "@/lib/support-task";
import {
  taskActor,
  taskScope,
  taskButtons,
  eligiblePerson,
  resolveTaskTarget,
  validateTaskCreation,
  accountTaskWhere,
  resolveTaskManager,
  TaskError,
  type TaskActor,
} from "@/lib/support-task-access";
import {
  loadManagerGraph,
  createManagerResolver,
} from "@/lib/employee-manager-resolution";
function failure(
  e: unknown,
  operation: "load" | "save",
  action: string,
  knownCode?: TaskFailureCode,
): TaskFailure {
  if (e instanceof TaskError) {
    // Keep existing business messages intact. Only classify known actor/version failures.
    const code =
      knownCode ??
      (e.message === "Vui lòng đăng nhập."
        ? "UNAUTHENTICATED"
        : e.message.startsWith("Công việc vừa thay đổi.")
          ? "CONFLICT"
          : [
                "Bạn chưa có quyền thực hiện thao tác này.",
                "Phiên hoặc quyền truy cập đã thay đổi. Vui lòng tải lại trang.",
                "Không tìm thấy công việc hoặc không còn quyền.",
                "Không tìm thấy công việc hoặc bạn không còn quyền xem.",
                "Không có quyền tải tệp.",
              ].includes(e.message)
            ? "FORBIDDEN"
            : "BUSINESS_RULE");
    return {
      success: false,
      message: e.message,
      code,
      reference: null,
      recovery:
        code === "UNAUTHENTICATED"
          ? "sign_in"
          : code === "CONFLICT" || code === "FORBIDDEN"
            ? "reload"
            : "none",
    };
  }
  const reference = `CV-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const error =
    e && typeof e === "object"
      ? (e as { code?: unknown; meta?: { code?: unknown } })
      : null;
  const prismaCode =
    typeof error?.code === "string" && /^P\d{4}$/.test(error.code)
      ? error.code
      : null;
  const sqlState =
    typeof error?.meta?.code === "string" &&
    /^[0-9A-Z]{5}$/.test(error.meta.code)
      ? error.meta.code
      : null;
  // Never log the Error object/message: Prisma may include SQL, row values or connection details.
  console.error("support_task_failure", {
    reference,
    action,
    operation,
    prismaCode,
    sqlState,
  });
  return {
    success: false,
    message:
      operation === "load"
        ? "Chưa tải được dữ liệu công việc. Hãy thử tải lại."
        : "Chưa xác nhận được việc lưu công việc. Hãy giữ nội dung đang nhập và thử lại thao tác này.",
    code: operation === "load" ? "LOAD_FAILED" : "SAVE_FAILED",
    reference,
    recovery: "retry",
  };
}
function hash(v: unknown) {
  return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}
function json(v: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(v));
}
function refresh(id?: number) {
  revalidatePath("/tasks");
  revalidatePath("/tasks/department");
  revalidatePath("/");
  if (id) revalidatePath(`/tasks/${id}`);
}
const names = { select: { id: true, ho_ten: true } } as const;
const taskInclude = {
  nguoi_yeu_cau: names,
  nguoi_duoc_yeu_cau: names,
  nguoi_thuc_hien: names,
  nguoi_nghiem_thu: names,
  quan_ly_nguoi_yeu_cau: names,
  quan_ly_ben_ho_tro: names,
  phong_ho_tro: { select: { id: true, ten_phong_ban: true } },
} as const;
// All writes use the same company/RBAC lock before the task row and event.
export async function getTaskOptions() {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getTaskOptions", code);
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s);
      const [people, departments] = await Promise.all([
        tx.nhan_su.findMany({
          where: { company_id: s.companyId, tinh_trang_lam_viec: "ACTIVE" },
          select: {
            id: true,
            ho_ten: true,
            ma_nhan_su: true,
            chuc_vu: true,
            department_id: true,
            quan_ly_truc_tiep_id: true,
            phong_ban: { select: { ten_phong_ban: true, ma_phong_ban: true } },
          },
          orderBy: { ho_ten: "asc" },
        }),
        tx.phong_ban.findMany({
          where: { company_id: s.companyId },
          select: {
            id: true,
            ma_phong_ban: true,
            ten_phong_ban: true,
            nguoi_phu_trach_id: true,
          },
          orderBy: { ten_phong_ban: "asc" },
        }),
      ]);
      const accounts = await tx.tai_khoan.findMany({
        where: accountTaskWhere(s.companyId),
        select: { employee_id: true },
      });
      const [receivers, coordinators, reviewers, graph] = await Promise.all([
        tx.tai_khoan.findMany({
          where: accountTaskWhere(s.companyId, "EXECUTE"),
          select: { employee_id: true },
        }),
        tx.tai_khoan.findMany({
          where: accountTaskWhere(s.companyId, "MANAGE"),
          select: { employee_id: true },
        }),
        tx.tai_khoan.findMany({
          where: accountTaskWhere(s.companyId, "ACCEPT"),
          select: { employee_id: true },
        }),
        loadManagerGraph(tx, s.companyId),
      ]);
      const canReceive = new Set(receivers.map((x) => x.employee_id));
      const canCoordinate = new Set(coordinators.map((x) => x.employee_id));
      const visible = new Set(accounts.map((x) => x.employee_id));
      const canAccept = new Set(reviewers.map((x) => x.employee_id));
      const resolver = createManagerResolver(graph);
      const managerInfo = (id: number) => {
        const r = resolver.resolve(id);
        return {
          managerId: r.managerId,
          managerSource: r.source,
          managerError:
            r.error ||
            (r.managerId && !visible.has(r.managerId)
              ? "Quản lý chưa có tài khoản hoạt động với quyền xem công việc."
              : null),
        };
      };
      return {
        success: true as const,
        me: {
          id: a.person.id,
          name: a.person.ho_ten,
          ...managerInfo(a.person.id),
        },
        actions: a.actions,
        people: people.map((p) => {
          const manager = managerInfo(p.id);
          const unavailableReason = !canReceive.has(p.id)
            ? "Chưa có tài khoản hoạt động với quyền nhận việc."
            : !p.department_id
              ? "Chưa được gắn phòng ban."
              : manager.managerError;
          return {
            id: p.id,
            name: p.ho_ten,
            code: p.ma_nhan_su,
            position: p.chuc_vu ?? "",
            departmentCode: p.phong_ban?.ma_phong_ban ?? "",
            departmentId: p.department_id,
            department: p.phong_ban?.ten_phong_ban ?? "",
            ...manager,
            canAccept: canAccept.has(p.id),
            canView: visible.has(p.id),
            unavailableReason,
            canReceive: !unavailableReason,
          };
        }),
        departments: departments.map((d) => ({
          id: d.id,
          name: d.ten_phong_ban,
          code: d.ma_phong_ban,
          unavailableReason: !d.nguoi_phu_trach_id
            ? "Chưa khai báo người phụ trách phòng."
            : !canCoordinate.has(d.nguoi_phu_trach_id)
              ? "Người phụ trách phòng chưa có tài khoản hoạt động với quyền phân công."
              : !people.some(
                    (p) => p.department_id === d.id && visible.has(p.id),
                  )
                ? "Phòng chưa có thành viên đủ điều kiện nhận thông báo công việc."
                : null,
          managerId: d.nguoi_phu_trach_id,
          canReceive:
            canCoordinate.has(d.nguoi_phu_trach_id) &&
            people.some((p) => p.department_id === d.id && visible.has(p.id)),
          unavailable: people.filter(
            (p) => p.department_id === d.id && !visible.has(p.id),
          ).length,
        })),
      };
    });
  } catch (e) {
    return fail(e);
  }
}
export async function getSupportTasks(input: unknown = {}) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getSupportTasks", code);
  const parsed = TaskListSchema.safeParse(input);
  if (!parsed.success)
    return fail(new TaskError("Bộ lọc không hợp lệ."), "VALIDATION");
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s),
        f = parsed.data,
        id = a.person.id;
      const actionable: Prisma.cong_viec_ho_troWhereInput[] = [];
      if (canTask(a.actions, "EXECUTE"))
        actionable.push(
          { trang_thai: "CHO_NHAN", nguoi_duoc_yeu_cau_id: id },
          {
            trang_thai: { in: ["DANG_THUC_HIEN", "CAN_BO_SUNG"] },
            nguoi_thuc_hien_id: id,
          },
        );
      if (canTask(a.actions, "ACCEPT"))
        actionable.push({
          trang_thai: "CHO_NGHIEM_THU",
          nguoi_nghiem_thu_id: id,
        });
      const tab: Prisma.cong_viec_ho_troWhereInput =
        f.tab === "actionable"
          ? actionable.length ? { OR: actionable } : { id: { in: [] } }
          : f.tab === "receive"
            ? { trang_thai: "CHO_NHAN", nguoi_duoc_yeu_cau_id: id }
            : f.tab === "doing"
              ? {
                  nguoi_thuc_hien_id: id,
                  trang_thai: {
                    in: ["DANG_THUC_HIEN", "CAN_BO_SUNG"],
                  },
                }
              : f.tab === "waiting"
                ? { nguoi_thuc_hien_id: id, trang_thai: "CHO_NGHIEM_THU" }
                : f.tab === "accept"
                  ? { nguoi_nghiem_thu_id: id, trang_thai: "CHO_NGHIEM_THU" }
                  : f.tab === "requested"
                    ? { nguoi_yeu_cau_id: id }
                    : f.tab === "closed"
                      ? { trang_thai: { in: ["HOAN_THANH", "DA_HUY"] } }
                      : f.tab === "department"
                        ? {
                            phong_ho_tro_id: {
                              in: [
                                ...new Set([
                                  ...a.managed,
                                  ...(a.person.department_id
                                    ? [a.person.department_id]
                                    : []),
                                ]),
                              ],
                            },
                          }
                        : {};
      const where: Prisma.cong_viec_ho_troWhereInput = {
        AND: [
          taskScope(a),
          tab,
          ...(f.search
            ? [
                {
                  tieu_de: { contains: f.search, mode: "insensitive" as const },
                },
              ]
            : []),
          ...(f.category !== "ALL" ? [{ hang_muc: f.category }] : []),
          ...(f.status !== "ALL" ? [{ trang_thai: f.status }] : []),
          ...(f.overdue
            ? [
                {
                  han_hoan_thanh: { lt: new Date() },
                  trang_thai: {
                    in: [
                      "CHO_NHAN",
                      "DANG_THUC_HIEN",
                      "CAN_BO_SUNG",
                    ] as const as (
                      "CHO_NHAN" | "DANG_THUC_HIEN" | "CAN_BO_SUNG"
                    )[],
                  },
                },
              ]
            : []),
        ],
      };
      const total = await tx.cong_viec_ho_tro.count({ where });
      const page = Math.min(f.page, Math.max(1, Math.ceil(total / 20)));
      const rows = await tx.cong_viec_ho_tro.findMany({
        where,
        include: taskInclude,
        orderBy: [{ updated_at: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 20,
      });
      return {
        success: true as const,
        rows,
        actions: a.actions,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / 20)),
      };
    });
  } catch (e) {
    return fail(e);
  }
}
export async function getSupportTask(id: number, historyPage = 1) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getSupportTask", code);
  if (
    !z.number().int().positive().safeParse(id).success ||
    !z.number().int().min(1).max(100000).safeParse(historyPage).success
  )
    return fail(new TaskError("Công việc không hợp lệ."), "VALIDATION");
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s),
        task = await tx.cong_viec_ho_tro.findFirst({
          where: { AND: [taskScope(a), { id }] },
          include: taskInclude,
        });
      if (!task)
        throw new TaskError(
          "Không tìm thấy công việc hoặc bạn không còn quyền xem.",
        );
      const [history, count, files, latestSupplement] = await Promise.all([
        tx.lich_su_cong_viec.findMany({
          where: { cong_viec_id: id, company_id: s.companyId },
          select: {
            id: true,
            version: true,
            hanh_dong: true,
            ly_do: true,
            lan_bao_xong: true,
            du_lieu_truoc: true,
            du_lieu_sau: true,
            created_at: true,
            nhan_su_thao_tac: names,
          },
          orderBy: { version: "desc" },
          take: 30,
          skip: (historyPage - 1) * 30,
        }),
        tx.lich_su_cong_viec.count({
          where: { cong_viec_id: id, company_id: s.companyId },
        }),
        tx.tep_cong_viec.findMany({
          where: { cong_viec_id: id, company_id: s.companyId },
          select: {
            id: true,
            ten_goc: true,
            mime_type: true,
            kich_thuoc_byte: true,
            loai_tep: true,
            su_kien_bao_xong_id: true,
            tai_khoan_tai_id: true,
            created_at: true,
          },
          orderBy: { id: "asc" },
        }),
        task.trang_thai === "CAN_BO_SUNG"
          ? tx.lich_su_cong_viec.findFirst({
              where: {
                cong_viec_id: id,
                company_id: s.companyId,
                hanh_dong: "YEU_CAU_BO_SUNG",
              },
              select: {
                ly_do: true,
                created_at: true,
                nhan_su_thao_tac: names,
              },
              orderBy: { version: "desc" },
            })
          : null,
      ]);
      return {
        success: true as const,
        task,
        buttons: taskButtons(task, a),
        history,
        latestSupplement,
        historyPages: Math.max(1, Math.ceil(count / 30)),
        files: files.map((f) => ({
          ...f,
          kich_thuoc_byte: Number(f.kich_thuoc_byte),
          mine: f.tai_khoan_tai_id === s.userId,
        })),
        actions: a.actions,
      };
    });
  } catch (e) {
    return fail(e);
  }
}
async function notify(
  tx: Prisma.TransactionClient,
  t: cong_viec_ho_tro,
  action: HanhDongCongViec,
  actorId: number,
  previousRecipients: number[] = [],
) {
  if (action === "THEM_TEP") return;
  const ids = [
    t.nguoi_yeu_cau_id,
    t.nguoi_duoc_yeu_cau_id,
    t.nguoi_thuc_hien_id,
    t.quan_ly_nguoi_yeu_cau_id,
    t.quan_ly_ben_ho_tro_id,
    t.nguoi_nghiem_thu_id,
    ...previousRecipients,
  ].filter((id): id is number => id !== null);
  const members: Prisma.tai_khoanWhereInput[] = [{ employee_id: { in: ids } }];
  if (t.loai_dich_nhan === "PHONG_BAN" && t.trang_thai === "CHO_NHAN")
    members.push({
      nhan_su: {
        department_id: t.phong_ho_tro_id,
        tinh_trang_lam_viec: "ACTIVE",
      },
    });
  const recipients = await tx.tai_khoan.findMany({
    where: {
      AND: [
        accountTaskWhere(t.company_id),
        { OR: members },
        { employee_id: { not: actorId } },
      ],
    },
    select: { id: true, employee_id: true },
  });
  await tx.thong_bao_cong_viec.createMany({
    data: recipients.map((r) => ({
      company_id: t.company_id,
      cong_viec_id: t.id,
      version_su_kien: t.version,
      tai_khoan_nhan_id: r.id,
      loai: (action === "TAO"
        ? "YEU_CAU_MOI"
        : t.trang_thai === "HOAN_THANH"
          ? "HOAN_THANH"
          : t.trang_thai === "DA_HUY"
            ? "DA_HUY"
            : action === "BAO_XONG" && r.employee_id === t.nguoi_nghiem_thu_id
              ? "CAN_NGHIEM_THU"
              : action === "YEU_CAU_BO_SUNG"
                ? "CAN_BO_SUNG"
                : "CAP_NHAT") as LoaiThongBaoCongViec,
    })),
  });
}
async function event(
  tx: Prisma.TransactionClient,
  a: TaskActor,
  t: cong_viec_ho_tro,
  action: HanhDongCongViec,
  operationId: string,
  requestHash: string,
  before: unknown,
  reason: string,
  extra: object = {},
) {
  const previous = json(before) as Record<string, Prisma.InputJsonValue>;
  const next = json({
    ...t,
    request_hash: undefined,
    request_id: undefined,
  }) as Record<string, Prisma.InputJsonValue>;
  const changed = Object.keys(next).filter(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
  );
  const oldValues = Object.fromEntries(
    changed.filter((key) => key in previous).map((key) => [key, previous[key]]),
  );
  const newValues = Object.fromEntries(changed.map((key) => [key, next[key]]));
  const e = await tx.lich_su_cong_viec.create({
    data: {
      company_id: t.company_id,
      cong_viec_id: t.id,
      version: t.version,
      operation_id: operationId,
      request_hash: requestHash,
      tai_khoan_thao_tac_id: a.session.userId,
      nhan_su_thao_tac_id: a.person.id,
      hanh_dong: action,
      ly_do: reason || null,
      lan_bao_xong: ["BAO_XONG", "NGHIEM_THU", "YEU_CAU_BO_SUNG"].includes(
        action,
      )
        ? t.so_lan_bao_xong
        : null,
      du_lieu_truoc: json(oldValues),
      du_lieu_sau: json({ ...newValues, ...extra }),
      ket_qua: { id: t.id, version: t.version, status: t.trang_thai },
    },
  });
  await tx.nhat_ky_hoat_dong.create({
    data: {
      company_id: t.company_id,
      account_id: a.session.userId,
      ten_dang_nhap: a.session.username,
      ho_ten: a.person.ho_ten,
      phan_he: "SUPPORT_TASK",
      hanh_dong: action,
      doi_tuong_id: `cong_viec:${t.id}`,
      mo_ta: "Cập nhật công việc hỗ trợ",
      du_lieu_moi: { id: t.id, version: t.version },
    },
  });
  const previousRecipients =
    "ban_giao" in extra && extra.ban_giao === true
      ? [previous.nguoi_thuc_hien_id, previous.quan_ly_ben_ho_tro_id].filter(
          (id): id is number => typeof id === "number",
        )
      : [];
  await notify(tx, t, action, a.person.id, previousRecipients);
  return e;
}
export async function createSupportTask(input: unknown) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "save", "createSupportTask", code);
  const p = CreateTaskSchema.safeParse(input);
  if (!p.success)
    return {
      ...fail(
        new TaskError("Kiểm tra các trường được đánh dấu."),
        "VALIDATION",
      ),
      fieldErrors: p.error.flatten().fieldErrors,
    };
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    const result = await db.$transaction(
      async (tx) => {
        const a = await taskActor(tx, s, "CREATE", true),
          v = p.data,
          h = hash(v);
        const old = await tx.cong_viec_ho_tro.findUnique({
          where: {
            company_id_tai_khoan_tao_id_request_id: {
              company_id: s.companyId,
              tai_khoan_tao_id: s.userId,
              request_id: v.requestId,
            },
          },
        });
        if (old) {
          if (old.request_hash !== h)
            throw new TaskError(
              "Mã gửi đã dùng với nội dung khác. Hãy mở yêu cầu đã tạo.",
            );
          return { id: old.id, version: old.version };
        }
        const { manager, target, reviewer, now, start, deadline } =
          await validateTaskCreation(tx, a, v);
        const t = await tx.cong_viec_ho_tro.create({
          data: {
            company_id: s.companyId,
            tieu_de: v.title,
            noi_dung: v.description,
            hang_muc: v.category,
            tinh_chat: v.nature,
            muc_do: v.priority,
            nguoi_yeu_cau_id: a.person.id,
            tai_khoan_tao_id: s.userId,
            phong_nguoi_yeu_cau_id: a.person.department_id,
            quan_ly_nguoi_yeu_cau_id: manager?.id ?? null,
            ...target,
            che_do_nghiem_thu: v.acceptance,
            nghiem_thu_bat_buoc: v.acceptance !== "KHONG_CAN",
            nguoi_nghiem_thu_id: reviewer?.id ?? null,
            bat_dau_luc: start,
            han_hoan_thanh: deadline,
            created_at: now,
            request_id: v.requestId,
            request_hash: h,
          },
        });
        await event(tx, a, t, "TAO", v.requestId, h, {}, "");
        return { id: t.id, version: t.version };
      },
      { timeout: 15000 },
    );
    refresh(result.id);
    return { success: true as const, ...result };
  } catch (e) {
    return fail(e);
  }
}
export async function mutateSupportTask(input: unknown) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "save", p.success ? p.data.action : "mutateSupportTask", code);
  const p = TaskMutationSchema.safeParse(input);
  if (!p.success)
    return {
      ...fail(new TaskError("Nội dung thao tác chưa hợp lệ."), "VALIDATION"),
      fieldErrors: p.error.flatten().fieldErrors,
    };
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    const result = await db.$transaction(
      async (tx) => {
        const v = p.data,
          required = ["NHAN", "TU_CHOI_CA_NHAN", "BAO_XONG"].includes(v.action)
            ? "EXECUTE"
            : ["NGHIEM_THU", "YEU_CAU_BO_SUNG"].includes(v.action)
              ? "ACCEPT"
              : v.action === "SUA"
                ? "CREATE"
                : "VIEW";
        const a = await taskActor(tx, s, required, true);
        await tx.$queryRaw`SELECT id FROM cong_viec.cong_viec_ho_tro WHERE id=${v.id} AND company_id=${s.companyId} FOR UPDATE`;
        const t = await tx.cong_viec_ho_tro.findFirst({
          where: { AND: [taskScope(a), { id: v.id }] },
        });
        if (!t)
          throw new TaskError("Không tìm thấy công việc hoặc không còn quyền.");
        const h = hash({ ...v, version: undefined }),
          old = await tx.lich_su_cong_viec.findUnique({
            where: {
              cong_viec_id_operation_id: {
                cong_viec_id: t.id,
                operation_id: v.operationId,
              },
            },
          });
        if (old) {
          if (old.request_hash !== h || old.tai_khoan_thao_tac_id !== s.userId)
            throw new TaskError("Mã thao tác đã dùng cho nội dung khác.");
          return { id: t.id, version: t.version };
        }
        if (t.version !== v.version)
          throw new TaskError(
            "Công việc vừa thay đổi. Tải lại để xem trạng thái mới; nội dung đang nhập được giữ.",
          );
        const b = taskButtons(t, a),
          data: Prisma.cong_viec_ho_troUncheckedUpdateInput = {
            version: { increment: 1 },
          },
          now = new Date();
        const requireReason = [
          "TU_CHOI_CA_NHAN",
          "TU_CHOI_YEU_CAU",
          "YEU_CAU_BO_SUNG",
          "HUY",
          "CHUYEN_DICH",
          "BAN_GIAO",
          "DOI_NGUOI_NGHIEM_THU",
          "DOI_QUAN_LY",
        ].includes(v.action);
        if (requireReason && !v.reason)
          throw new TaskError("Nhập lý do cho thao tác này.");
        const requireAllowed = (allowed: boolean) => {
          if (!allowed)
            throw new TaskError(
              "Bạn không được thực hiện thao tác ở trạng thái hiện tại.",
            );
        };
        if (v.action === "NHAN") {
          requireAllowed(b.receive);
          const manager = await resolveTaskManager(
            tx,
            s.companyId,
            a.person.id,
          );
          if (t.nguoi_nghiem_thu_id === a.person.id)
            throw new TaskError(
              "Cần đổi người nghiệm thu trước khi nhận việc.",
            );
          Object.assign(data, {
            nguoi_thuc_hien_id: a.person.id,
            nhan_luc: now,
            quan_ly_ben_ho_tro_id: manager?.id ?? null,
            trang_thai: "DANG_THUC_HIEN",
          });
        }
        if (v.action === "TU_CHOI_CA_NHAN") {
          requireAllowed(b.personalDecline);
        }
        if (v.action === "TU_CHOI_YEU_CAU") {
          requireAllowed(b.receive || b.assign);
          data.trang_thai = "TU_CHOI";
        }
        if (v.action === "SUA") {
          requireAllowed(b.edit);
          const start = v.startAt ? new Date(v.startAt) : t.bat_dau_luc,
            deadline =
              v.deadline === undefined
                ? t.han_hoan_thanh
                : v.deadline
                  ? new Date(v.deadline)
                  : null;
          if (deadline && deadline < start)
            throw new TaskError("Hạn phải từ thời gian bắt đầu trở đi.");
          Object.assign(data, {
            tieu_de: v.title ?? t.tieu_de,
            noi_dung: v.description ?? t.noi_dung,
            bat_dau_luc: start,
            han_hoan_thanh: deadline,
          });
        }
        if (v.action === "CHUYEN_DICH") {
          requireAllowed(b.assign);
          if (!v.targetType || !v.targetId)
            throw new TaskError("Chọn người/phòng nhận.");
          const target = await resolveTaskTarget(
            tx,
            s.companyId,
            v.targetType,
            v.targetId,
          );
          if (
            t.loai_dich_nhan === "PHONG_BAN" &&
            v.targetType === "CA_NHAN" &&
            target.phong_ho_tro_id !== t.phong_ho_tro_id
          )
            throw new TaskError(
              "Chọn nhân viên thuộc phòng đang nhận yêu cầu.",
            );
          if (target.nguoi_duoc_yeu_cau_id === t.nguoi_nghiem_thu_id)
            throw new TaskError(
              "Cần chọn người nghiệm thu khác người thực hiện.",
            );
          Object.assign(data, target, { trang_thai: "CHO_NHAN" });
        }
        if (v.action === "BAN_GIAO") {
          requireAllowed(b.handoff);
          if (!v.personId || v.personId === t.nguoi_thuc_hien_id)
            throw new TaskError(
              "Chọn người tiếp nhận khác người đang thực hiện.",
            );
          const target = await resolveTaskTarget(
            tx,
            s.companyId,
            "CA_NHAN",
            v.personId,
          );
          if (target.phong_ho_tro_id !== t.phong_ho_tro_id)
            throw new TaskError("Chọn người tiếp nhận thuộc phòng đang xử lý.");
          if (target.nguoi_duoc_yeu_cau_id === t.nguoi_nghiem_thu_id)
            throw new TaskError(
              "Người nghiệm thu không được tự thực hiện công việc.",
            );
          Object.assign(data, target, {
            trang_thai: "CHO_NHAN",
            nguoi_thuc_hien_id: null,
            nhan_luc: null,
            bao_xong_luc: null,
          });
        }
        if (v.action === "DOI_NGUOI_NGHIEM_THU") {
          requireAllowed(b.manage);
          const person = await eligiblePerson(
            tx,
            s.companyId,
            v.personId,
            "ACCEPT",
          );
          if (person.id !== t.nguoi_yeu_cau_id) {
            const manager = await resolveTaskManager(
              tx,
              s.companyId,
              t.nguoi_yeu_cau_id,
            );
            if (person.id !== manager?.id)
              throw new TaskError(
                "Chỉ chọn người yêu cầu hoặc quản lý hiện tại của người yêu cầu để nghiệm thu.",
              );
          }
          if (
            person.id === t.nguoi_thuc_hien_id ||
            person.id === t.nguoi_duoc_yeu_cau_id
          )
            throw new TaskError("Người thực hiện không được tự nghiệm thu.");
          Object.assign(data, {
            nguoi_nghiem_thu_id: person.id,
            che_do_nghiem_thu:
              person.id === t.nguoi_yeu_cau_id ? "NGUOI_YEU_CAU" : "QUAN_LY",
          });
        }
        if (v.action === "DOI_QUAN_LY") {
          requireAllowed(b.manage);
          if (!v.managerSide)
            throw new TaskError("Chọn bên cần chuyển quản lý.");
          const person = await eligiblePerson(tx, s.companyId, v.personId);
          Object.assign(
            data,
            v.managerSide === "REQUESTER"
              ? { quan_ly_nguoi_yeu_cau_id: person.id }
              : { quan_ly_ben_ho_tro_id: person.id },
          );
        }
        if (v.action === "BAO_XONG") {
          requireAllowed(b.work);
          if (now < t.bat_dau_luc)
            throw new TaskError("Chưa đến thời gian bắt đầu công việc.");
          let mode = t.che_do_nghiem_thu,
            reviewer = t.nguoi_nghiem_thu_id;
          if (v.addAcceptance && v.addAcceptance !== mode) {
            if (mode !== "KHONG_CAN")
              throw new TaskError(
                "Không được bỏ hoặc thay nghiệm thu đã yêu cầu.",
              );
            mode = v.addAcceptance;
            reviewer =
              mode === "NGUOI_YEU_CAU"
                ? t.nguoi_yeu_cau_id
                : mode === "QUAN_LY"
                  ? t.quan_ly_nguoi_yeu_cau_id
                  : null;
          }
          if (mode !== "KHONG_CAN") {
            const person = await eligiblePerson(
              tx,
              s.companyId,
              reviewer,
              "ACCEPT",
            );
            if (person.id === a.person.id)
              throw new TaskError("Người thực hiện không được tự nghiệm thu.");
          }
          Object.assign(data, {
            che_do_nghiem_thu: mode,
            nguoi_nghiem_thu_id: reviewer,
            bao_xong_luc: now,
            so_lan_bao_xong: { increment: 1 },
            trang_thai: mode === "KHONG_CAN" ? "HOAN_THANH" : "CHO_NGHIEM_THU",
            dong_luc: mode === "KHONG_CAN" ? now : null,
          });
          const ids = [...new Set(v.evidenceIds)];
          const count = await tx.tep_cong_viec.count({
            where: {
              id: { in: ids },
              cong_viec_id: t.id,
              company_id: s.companyId,
              loai_tep: "BANG_CHUNG",
              su_kien_bao_xong_id: null,
              tai_khoan_tai_id: s.userId,
            },
          });
          if (count !== ids.length)
            throw new TaskError(
              "Có bằng chứng không hợp lệ hoặc đã gửi trong lần báo xong trước.",
            );
        }
        if (v.action === "NGHIEM_THU") {
          requireAllowed(b.accept);
          Object.assign(data, {
            trang_thai: "HOAN_THANH",
            nghiem_thu_luc: now,
            dong_luc: now,
          });
        }
        if (v.action === "YEU_CAU_BO_SUNG") {
          requireAllowed(b.accept);
          Object.assign(data, {
            trang_thai: "CAN_BO_SUNG",
            bao_xong_luc: null,
          });
        }
        if (v.action === "HUY") {
          requireAllowed(b.manage);
          Object.assign(data, { trang_thai: "DA_HUY", dong_luc: now });
        }
        const updated = await tx.cong_viec_ho_tro.update({
          where: { id: t.id },
          data,
        });
        const before = json({
          ...t,
          request_id: undefined,
          request_hash: undefined,
        });
        const e = await event(
          tx,
          a,
          updated,
          v.action === "BAN_GIAO" ? "CHUYEN_DICH" : v.action,
          v.operationId,
          h,
          before,
          v.reason,
          {
            evidenceIds: v.evidenceIds,
            ...(v.action === "BAN_GIAO" ? { ban_giao: true } : {}),
          },
        );
        if (v.action === "BAO_XONG" && v.evidenceIds.length)
          await tx.tep_cong_viec.updateMany({
            where: {
              id: { in: v.evidenceIds },
              cong_viec_id: t.id,
              company_id: s.companyId,
            },
            data: { su_kien_bao_xong_id: e.id },
          });
        return { id: t.id, version: updated.version };
      },
      { timeout: 15000 },
    );
    refresh(result.id);
    return { success: true as const, ...result };
  } catch (e) {
    return fail(e);
  }
}
export async function getTaskNotifications(page = 1) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getTaskNotifications", code);
  if (!z.number().int().min(1).max(100000).safeParse(page).success)
    return fail(new TaskError("Trang không hợp lệ."), "VALIDATION");
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s);
      const where = { company_id: s.companyId, tai_khoan_nhan_id: s.userId };
      const [rows, unread, total] = await Promise.all([
        tx.thong_bao_cong_viec.findMany({
          where,
          orderBy: { id: "desc" },
          skip: (page - 1) * 20,
          take: 20,
          select: {
            id: true,
            cong_viec_id: true,
            loai: true,
            da_doc_luc: true,
            created_at: true,
            su_kien: {
              select: {
                hanh_dong: true,
                du_lieu_sau: true,
                nhan_su_thao_tac: names,
              },
            },
          },
        }),
        tx.thong_bao_cong_viec.count({ where: { ...where, da_doc_luc: null } }),
        tx.thong_bao_cong_viec.count({ where }),
      ]);
      const tasks = await tx.cong_viec_ho_tro.findMany({
        where: {
          AND: [taskScope(a), { id: { in: rows.map((r) => r.cong_viec_id) } }],
        },
        select: {
          id: true,
          tieu_de: true,
          trang_thai: true,
          nguoi_nghiem_thu_id: true,
        },
      });
      return {
        success: true as const,
        unread,
        total,
        rows: rows.map(({ su_kien, ...r }) => {
          const currentTask = tasks.find((t) => t.id === r.cong_viec_id);
          const title = currentTask?.tieu_de ?? null;
          const handed =
            su_kien.du_lieu_sau &&
            typeof su_kien.du_lieu_sau === "object" &&
            !Array.isArray(su_kien.du_lieu_sau) &&
            su_kien.du_lieu_sau.ban_giao === true;
          return {
            ...r,
            title,
            needsReview: Boolean(
              currentTask?.trang_thai === "CHO_NGHIEM_THU" &&
              currentTask.nguoi_nghiem_thu_id === a.person.id &&
              a.actions.includes("ACCEPT"),
            ),
            summary: title
              ? `${su_kien.nhan_su_thao_tac.ho_ten} · ${handed ? "Bàn giao công việc" : TASK_EVENTS[su_kien.hanh_dong]}`
              : null,
          };
        }),
      };
    });
  } catch (e) {
    return fail(e);
  }
}
export async function readTaskNotification(id: number) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "save", "readTaskNotification", code);
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  if (!z.number().int().positive().safeParse(id).success)
    return fail(new TaskError("Thông báo không hợp lệ."), "VALIDATION");
  try {
    await db.$transaction(async (tx) => {
      await taskActor(tx, s, "VIEW", true);
      await tx.thong_bao_cong_viec.updateMany({
        where: {
          id,
          company_id: s.companyId,
          tai_khoan_nhan_id: s.userId,
          da_doc_luc: null,
        },
        data: { da_doc_luc: new Date() },
      });
    });
    return { success: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function uploadTaskFile(form: FormData) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "save", "uploadTaskFile", code);
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      version: z.coerce.number().int().positive(),
      uploadId: z.string().uuid(),
    })
    .strict()
    .safeParse({
      id: form.get("id"),
      version: form.get("version"),
      uploadId: form.get("uploadId"),
    });
  const file = form.get("file");
  if (
    !parsed.success ||
    !(file instanceof File) ||
    [...form.keys()].some(
      (k) => !["id", "version", "uploadId", "file"].includes(k),
    )
  )
    return fail(
      new TaskError("Tệp hoặc công việc không hợp lệ."),
      "VALIDATION",
    );
  try {
    // Authenticate and authorize before parsing bytes; repeat after upload under the write lock.
    await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s);
      const t = await tx.cong_viec_ho_tro.findFirst({
        where: { AND: [taskScope(a), { id: parsed.data.id }] },
      });
      if (!t) throw new TaskError("Không có quyền tải tệp.");
      const b = taskButtons(t, a);
      if (!b.work && !b.edit)
        throw new TaskError("Không thể thêm tệp ở trạng thái hiện tại.");
    });
    const { validateTaskFile, storeTaskBytes } =
      await import("@/lib/support-task-storage");
    const data = await validateTaskFile(file);
    // Bytes remain private if commit fails; do not delete blindly after a network timeout.
    const key = await storeTaskBytes(data.bytes);
    const result = await db.$transaction(
      async (tx) => {
        const a = await taskActor(tx, s, "VIEW", true),
          v = parsed.data;
        await tx.$queryRaw`SELECT id FROM cong_viec.cong_viec_ho_tro WHERE id=${v.id} AND company_id=${s.companyId} FOR UPDATE`;
        const t = await tx.cong_viec_ho_tro.findFirst({
          where: { AND: [taskScope(a), { id: v.id }] },
        });
        if (!t) throw new TaskError("Không có quyền tải tệp.");
        const old = await tx.tep_cong_viec.findUnique({
          where: {
            company_id_tai_khoan_tai_id_upload_id: {
              company_id: s.companyId,
              tai_khoan_tai_id: s.userId,
              upload_id: v.uploadId,
            },
          },
        });
        if (old) {
          if (
            old.cong_viec_id !== t.id ||
            old.sha256 !== data.sha ||
            old.ten_goc !== data.name
          )
            throw new TaskError("Mã tải đã được dùng với tệp khác.");
          return { id: t.id, fileId: old.id, version: t.version };
        }
        const b = taskButtons(t, a);
        if (!b.edit && !b.work)
          throw new TaskError("Không thể thêm tệp ở trạng thái hiện tại.");
        if (t.version !== v.version)
          throw new TaskError(
            "Công việc vừa thay đổi. Tải lại rồi thử tải tệp.",
          );
        const total = await tx.tep_cong_viec.aggregate({
          where: { cong_viec_id: t.id, company_id: s.companyId },
          _sum: { kich_thuoc_byte: true },
        });
        if (
          Number(total._sum.kich_thuoc_byte ?? 0) + data.bytes.length >
          50 * 1024 * 1024
        )
          throw new TaskError("Tổng tệp của một công việc không vượt 50 MiB.");
        const f = await tx.tep_cong_viec.create({
          data: {
            company_id: s.companyId,
            cong_viec_id: t.id,
            tai_khoan_tai_id: s.userId,
            upload_id: v.uploadId,
            khoa_luu_tru: key,
            ten_goc: data.name,
            mime_type: data.mime,
            kich_thuoc_byte: data.bytes.length,
            sha256: data.sha,
            loai_tep: b.work ? "BANG_CHUNG" : "MO_TA",
          },
        });
        const updated = await tx.cong_viec_ho_tro.update({
          where: { id: t.id },
          data: { version: { increment: 1 } },
        });
        await event(
          tx,
          a,
          updated,
          "THEM_TEP",
          v.uploadId,
          hash({ id: t.id, sha: data.sha, name: data.name }),
          t,
          "",
          { file: { id: f.id, name: data.name } },
        );
        return { id: t.id, fileId: f.id, version: updated.version };
      },
      { timeout: 15000 },
    );
    refresh(result.id);
    return { success: true as const, ...result };
  } catch (e) {
    return fail(e);
  }
}

export async function getSupportTaskCounts() {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getSupportTaskCounts", code);
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s),
        scope = taskScope(a);
      const [receive, doing, accept] = await Promise.all([
        tx.cong_viec_ho_tro.count({
          where: {
            AND: [
              scope,
              { trang_thai: "CHO_NHAN", nguoi_duoc_yeu_cau_id: a.person.id },
            ],
          },
        }),
        tx.cong_viec_ho_tro.count({
          where: {
            AND: [
              scope,
              {
                trang_thai: {
                  in: ["DANG_THUC_HIEN", "CAN_BO_SUNG"],
                },
                nguoi_thuc_hien_id: a.person.id,
              },
            ],
          },
        }),
        tx.cong_viec_ho_tro.count({
          where: {
            AND: [
              scope,
              {
                trang_thai: "CHO_NGHIEM_THU",
                nguoi_nghiem_thu_id: a.person.id,
              },
            ],
          },
        }),
      ]);
      return { success: true as const, receive, doing, accept };
    });
  } catch (e) {
    return fail(e);
  }
}

export async function getCreatedTaskByRequest(requestId: string) {
  const fail = (e: unknown, code?: TaskFailureCode) =>
    failure(e, "load", "getCreatedTaskByRequest", code);
  const s = await getSession();
  if (!s) return fail(new TaskError("Vui lòng đăng nhập."));
  if (!z.string().uuid().safeParse(requestId).success)
    return fail(new TaskError("Yêu cầu không hợp lệ."), "VALIDATION");
  try {
    return await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s, "CREATE");
      const task = await tx.cong_viec_ho_tro.findFirst({
        where: {
          AND: [
            taskScope(a),
            {
              company_id: s.companyId,
              tai_khoan_tao_id: s.userId,
              request_id: requestId,
            },
          ],
        },
        select: { id: true, tieu_de: true },
      });
      return { success: true as const, task };
    });
  } catch (e) {
    return fail(e);
  }
}
