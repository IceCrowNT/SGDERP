"use server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import {
  workflowActor,
  workflowRecordScope,
  assigneeIssue,
  canWorkflow,
} from "@/lib/workflow-access";
import {
  WorkflowTemplateSchema,
  WorkflowTemplateCommandSchema,
  WorkflowDraftSchema,
  WorkflowCommandSchema,
} from "@/lib/validations/workflow";

type Tx = Prisma.TransactionClient;
function failure(e: unknown) {
  if (e instanceof Error && e.name.startsWith("PrismaClient"))
    return {
      success: false as const,
      message:
        "Không thể lưu. Dữ liệu đã thay đổi hoặc có liên kết không hợp lệ. Hãy tải lại.",
    };
  return {
    success: false as const,
    message: e instanceof Error ? e.message : "Không thể xử lý yêu cầu.",
  };
}
function invalid(e: z.ZodError) {
  return {
    success: false as const,
    message: "Kiểm tra các trường được đánh dấu.",
    fieldErrors: e.flatten().fieldErrors,
  };
}
async function lock(tx: Tx, s: SessionUser) {
  // Same order as HR/head mutations; serializes role revocation and workflow decisions.
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id=${s.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${s.companyId}::int)`;
}
function version(date: Date, expected?: string) {
  if (date.toISOString() !== expected)
    throw Error("Dữ liệu đã thay đổi. Tải lại trước khi thao tác.");
}
async function history(
  tx: Tx,
  s: SessionUser,
  id: number,
  action: string,
  stepId?: number,
  reason?: string,
  detail?: Prisma.InputJsonValue,
) {
  const now = new Date();
  await tx.lich_su_quy_trinh.create({
    data: {
      created_at: now,
      updated_at: now,
      company_id: s.companyId,
      ho_so_quy_trinh_id: id,
      buoc_xu_ly_quy_trinh_id: stepId,
      tai_khoan_thao_tac_id: s.userId,
      nhan_su_thao_tac_id: s.employeeId,
      ten_nguoi_thao_tac_luc_do: s.fullName,
      hanh_dong: action,
      y_kien: reason,
      chi_tiet: detail,
    },
  });
}
async function auditTemplate(
  tx: Tx,
  s: SessionUser,
  id: number,
  action: string,
) {
  await tx.nhat_ky_hoat_dong.create({
    data: {
      company_id: s.companyId,
      account_id: s.userId,
      ten_dang_nhap: s.username,
      ho_ten: s.fullName,
      phan_he: "WORKFLOW",
      hanh_dong: action,
      doi_tuong_id: String(id),
      mo_ta: `${action} mẫu quy trình ${id}`,
    },
  });
}
function refresh() {
  revalidatePath("/workflows", "layout");
}
const templateInclude = {
  danh_sach_buoc: {
    orderBy: { thu_tu: "asc" as const },
    include: { nguoi_chi_dinh: { select: { ho_ten: true } } },
  },
};
function templateDto(
  t: Prisma.mau_quy_trinhGetPayload<{ include: typeof templateInclude }>,
) {
  return {
    id: t.id,
    code: t.ma,
    name: t.ten,
    description: t.mo_ta ?? "",
    revision: t.phien_ban,
    status: t.trang_thai,
    version: t.updated_at.toISOString(),
    steps: t.danh_sach_buoc.map((b) => ({
      id: b.id,
      name: b.ten,
      instructions: b.huong_dan ?? "",
      kind: b.loai_buoc,
      assignment: b.cach_chon_nguoi,
      employeeId: b.nguoi_chi_dinh_id,
      employeeName: b.nguoi_chi_dinh?.ho_ten ?? "",
    })),
  };
}
export async function getWorkflowWorkspace() {
  const s = await getSession();
  if (!s || !canWorkflow(s.workflowActions))
    return {
      success: false as const,
      message:
        "Chưa có quyền quy trình. Người quản lý phân quyền cần cấp quyền tại Vai trò và phân quyền.",
    };
  const manage = canWorkflow(s.workflowActions, "MANAGE");
  const [templates, records, people] = await Promise.all([
    db.mau_quy_trinh.findMany({
      where: {
        company_id: s.companyId,
        ...(!manage ? { trang_thai: "PUBLISHED" as const } : {}),
      },
      include: templateInclude,
      orderBy: [{ ma: "asc" }, { phien_ban: "desc" }],
    }),
    db.ho_so_quy_trinh.findMany({
      where: workflowRecordScope(s),
      include: {
        nguoi_gui: { select: { ho_ten: true } },
        danh_sach_buoc: {
          where: { trang_thai: { in: ["PENDING", "BLOCKED"] } },
          include: {
            buoc_mau: true,
            nguoi_duoc_giao: { select: { ho_ten: true } },
          },
        },
      },
      orderBy: { updated_at: "desc" },
      take: 200,
    }),
    manage
      ? db.nhan_su.findMany({
          where: {
            company_id: s.companyId,
            tinh_trang_lam_viec: "ACTIVE",
          },
          select: { id: true, ho_ten: true, ma_nhan_su: true },
          orderBy: { ho_ten: "asc" },
        })
      : Promise.resolve([]),
  ]);
  return {
    success: true as const,
    actions: s.workflowActions ?? [],
    employeeId: s.employeeId ?? null,
    templates: templates.map(templateDto),
    people: people.map((p) => ({
      id: p.id,
      name: `${p.ho_ten} · ${p.ma_nhan_su}`,
    })),
    records: records.map((r) => ({
      id: r.id,
      code: r.ma,
      title: r.tieu_de,
      status: r.trang_thai,
      requesterId: r.nguoi_gui_id,
      requester: r.nguoi_gui.ho_ten,
      step: r.danh_sach_buoc[0]?.buoc_mau.ten ?? "",
      assigneeId: r.danh_sach_buoc[0]?.nguoi_duoc_giao_id,
      blocked: r.danh_sach_buoc[0]?.trang_thai === "BLOCKED",
    })),
  };
}
export async function saveWorkflowTemplate(input: unknown) {
  const s = await getSession();
  if (!s) return failure(Error("Vui lòng đăng nhập."));
  const p = WorkflowTemplateSchema.safeParse(input);
  if (!p.success) return invalid(p.error);
  const v = p.data;
  try {
    const id = await db.$transaction(
      async (tx) => {
        await lock(tx, s);
        await workflowActor(tx, s, "MANAGE");
        const old = v.id
          ? await tx.mau_quy_trinh.findFirst({
              where: { id: v.id, company_id: s.companyId },
            })
          : null;
        if (v.id && !old) throw Error("Không tìm thấy mẫu.");
        if (old) {
          version(old.updated_at, v.version);
          if (old.trang_thai !== "DRAFT")
            throw Error("Chỉ sửa mẫu nháp. Hãy tạo phiên bản mới.");
          if (old.ma !== v.code) throw Error("Mã mẫu không đổi.");
        } else if (
          await tx.mau_quy_trinh.count({
            where: { company_id: s.companyId, ma: v.code },
          })
        )
          throw Error("Mã mẫu đã tồn tại. Dùng Tạo phiên bản mới.");
        for (const step of v.steps)
          if (step.assignment === "SPECIFIC_EMPLOYEE") {
            if (
              !(await tx.nhan_su.count({
                where: {
                  id: step.employeeId!,
                  company_id: s.companyId,
                  tinh_trang_lam_viec: "ACTIVE",
                },
              }))
            )
              throw Error("Người chỉ định phải đang làm việc và cùng công ty.");
          }
        const t = old
          ? await tx.mau_quy_trinh.update({
              where: { id: old.id },
              data: { ten: v.name, mo_ta: v.description },
            })
          : await tx.mau_quy_trinh.create({
              data: {
                ma: v.code,
                ten: v.name,
                mo_ta: v.description,
                company_id: s.companyId,
                tai_khoan_tao_id: s.userId,
              },
            });
        await tx.buoc_mau_quy_trinh.deleteMany({
          where: { mau_quy_trinh_id: t.id, company_id: s.companyId },
        });
        await tx.buoc_mau_quy_trinh.createMany({
          data: v.steps.map((b, i) => ({
            company_id: s.companyId,
            mau_quy_trinh_id: t.id,
            thu_tu: i + 1,
            ten: b.name,
            huong_dan: b.instructions,
            loai_buoc: b.kind,
            cach_chon_nguoi: b.assignment,
            nguoi_chi_dinh_id:
              b.assignment === "SPECIFIC_EMPLOYEE" ? b.employeeId : null,
          })),
        });
        await auditTemplate(tx, s, t.id, old ? "UPDATE" : "CREATE");
        return t.id;
      },
      { timeout: 15000 },
    );
    refresh();
    return { success: true as const, message: "Đã lưu mẫu nháp.", id };
  } catch (e) {
    return failure(e);
  }
}
export async function changeWorkflowTemplate(input: unknown) {
  const s = await getSession();
  if (!s) return failure(Error("Vui lòng đăng nhập."));
  const p = WorkflowTemplateCommandSchema.safeParse(input);
  if (!p.success) return invalid(p.error);
  const v = p.data;
  try {
    const id = await db.$transaction(
      async (tx) => {
        await lock(tx, s);
        await workflowActor(tx, s, "MANAGE");
        const t = await tx.mau_quy_trinh.findFirst({
          where: { id: v.id, company_id: s.companyId },
          include: templateInclude,
        });
        if (!t) throw Error("Không tìm thấy mẫu.");
        version(t.updated_at, v.version);
        if (v.command === "COPY") {
          const last = await tx.mau_quy_trinh.findFirst({
            where: { ma: t.ma, company_id: s.companyId },
            orderBy: { phien_ban: "desc" },
          });
          const copy = await tx.mau_quy_trinh.create({
            data: {
              ma: t.ma,
              ten: t.ten,
              mo_ta: t.mo_ta,
              phien_ban: last!.phien_ban + 1,
              company_id: s.companyId,
              tai_khoan_tao_id: s.userId,
            },
          });
          await tx.buoc_mau_quy_trinh.createMany({
            data: t.danh_sach_buoc.map((b) => ({
              mau_quy_trinh_id: copy.id,
              company_id: s.companyId,
              thu_tu: b.thu_tu,
              ten: b.ten,
              huong_dan: b.huong_dan,
              loai_buoc: b.loai_buoc,
              cach_chon_nguoi: b.cach_chon_nguoi,
              nguoi_chi_dinh_id: b.nguoi_chi_dinh_id,
            })),
          });
          await auditTemplate(tx, s, copy.id, "COPY");
          return copy.id;
        }
        if (v.command === "PUBLISH") {
          if (t.trang_thai !== "DRAFT" || !t.danh_sach_buoc.length)
            throw Error("Mẫu cần ở trạng thái nháp và có bước xử lý.");
          for (const b of t.danh_sach_buoc)
            if (b.cach_chon_nguoi === "SPECIFIC_EMPLOYEE") {
              const issue = await assigneeIssue(
                tx,
                s.companyId,
                b.nguoi_chi_dinh_id,
                b.loai_buoc,
              );
              if (issue) throw Error(`${b.ten}: ${issue}`);
            }
          await tx.mau_quy_trinh.updateMany({
            where: {
              ma: t.ma,
              company_id: s.companyId,
              trang_thai: "PUBLISHED",
            },
            data: { trang_thai: "RETIRED" },
          });
          await tx.mau_quy_trinh.update({
            where: { id: t.id },
            data: { trang_thai: "PUBLISHED", thoi_diem_phat_hanh: new Date() },
          });
        } else {
          if (t.trang_thai !== "PUBLISHED")
            throw Error("Chỉ ngừng mẫu đang phát hành.");
          await tx.mau_quy_trinh.update({
            where: { id: t.id },
            data: { trang_thai: "RETIRED" },
          });
        }
        await auditTemplate(tx, s, t.id, v.command);
        return t.id;
      },
      { timeout: 15000 },
    );
    refresh();
    return {
      success: true as const,
      message: "Đã cập nhật mẫu quy trình.",
      id,
    };
  } catch (e) {
    return failure(e);
  }
}
export async function saveWorkflowDraft(input: unknown) {
  const s = await getSession();
  if (!s) return failure(Error("Vui lòng đăng nhập."));
  const p = WorkflowDraftSchema.safeParse(input);
  if (!p.success) return invalid(p.error);
  const v = p.data;
  try {
    const id = await db.$transaction(async (tx) => {
      await lock(tx, s);
      const actor = await workflowActor(tx, s, "CREATE");
      const person = actor.account.nhan_su;
      if (
        person?.tinh_trang_lam_viec !== "ACTIVE" ||
        !person.department_id
      )
        throw Error(
          "Cần hồ sơ nhân sự đang làm việc và có phòng ban để tạo yêu cầu.",
        );
      if (
        !(await tx.mau_quy_trinh.count({
          where: {
            id: v.templateId,
            company_id: s.companyId,
            trang_thai: "PUBLISHED",
          },
        }))
      )
        throw Error("Chọn mẫu đang phát hành.");
      const old = v.id
        ? await tx.ho_so_quy_trinh.findFirst({
            where: {
              id: v.id,
              company_id: s.companyId,
              nguoi_gui_id: person.id,
              trang_thai: "DRAFT",
            },
          })
        : null;
      if (v.id && !old) throw Error("Chỉ sửa hồ sơ nháp của mình.");
      if (old) version(old.updated_at, v.version);
      if (
        v.previousId &&
        (old ||
          !(await tx.ho_so_quy_trinh.count({
            where: {
              id: v.previousId,
              company_id: s.companyId,
              nguoi_gui_id: person.id,
              trang_thai: "REJECTED",
            },
          })))
      )
        throw Error("Chỉ lập lại hồ sơ bị từ chối của mình.");
      const data = {
        tieu_de: v.title,
        noi_dung: v.content,
        mau_quy_trinh_id: v.templateId,
        phong_nguoi_gui_id: person.department_id,
      };
      const r = old
        ? await tx.ho_so_quy_trinh.update({
            where: { id: old.id },
            data,
          })
        : await tx.ho_so_quy_trinh.create({
            data: {
              ...data,
              company_id: s.companyId,
              nguoi_gui_id: person.id,
              tai_khoan_tao_id: s.userId,
              ho_so_truoc_id: v.previousId,
            },
          });
      await history(
        tx,
        { ...s, employeeId: person.id },
        r.id,
        old ? "DRAFT_UPDATED" : "DRAFT_CREATED",
      );
      return r.id;
    });
    refresh();
    return { success: true as const, message: "Đã lưu hồ sơ nháp.", id };
  } catch (e) {
    return failure(e);
  }
}
const recordInclude = {
  mau: { include: templateInclude },
  nguoi_gui: { select: { ho_ten: true } },
  phong_nguoi_gui: { select: { ten_phong_ban: true } },
  danh_sach_buoc: {
    include: { buoc_mau: true, nguoi_duoc_giao: { select: { ho_ten: true } } },
    orderBy: { buoc_mau: { thu_tu: "asc" as const } },
  },
  danh_sach_lich_su: {
    orderBy: [{ created_at: "asc" as const }, { id: "asc" as const }],
  },
};
export async function getWorkflowDetail(input: unknown) {
  const s = await getSession();
  if (!s || !canWorkflow(s.workflowActions))
    return failure(Error("Không có quyền xem quy trình."));
  const p = z.number().int().positive().safeParse(input);
  if (!p.success) return failure(Error("Hồ sơ không hợp lệ."));
  const r = await db.ho_so_quy_trinh.findFirst({
    where: { ...workflowRecordScope(s), id: p.data },
    include: recordInclude,
  });
  if (!r)
    return failure(Error("Không tìm thấy hồ sơ hoặc không có quyền xem."));
  const active = r.danh_sach_buoc.find(
    (b) => b.trang_thai === "PENDING" || b.trang_thai === "BLOCKED",
  );
  const issue = active
    ? (active.ly_do_tam_dung ??
      (await assigneeIssue(
        db,
        s.companyId,
        active.nguoi_duoc_giao_id,
        active.buoc_mau.loai_buoc,
        r.nguoi_gui_id,
      )))
    : null;
  return {
    success: true as const,
    record: {
      id: r.id,
      code: r.ma,
      title: r.tieu_de,
      content: r.noi_dung,
      status: r.trang_thai,
      template: templateDto(r.mau),
      requesterId: r.nguoi_gui_id,
      requester: r.nguoi_gui.ho_ten,
      department: r.phong_nguoi_gui.ten_phong_ban,
      previousId: r.ho_so_truoc_id,
      version: r.updated_at.toISOString(),
      issue,
      steps: r.danh_sach_buoc.map((b) => ({
        id: b.id,
        name: b.buoc_mau.ten,
        instructions: b.buoc_mau.huong_dan,
        kind: b.buoc_mau.loai_buoc,
        status: b.trang_thai,
        employeeId: b.nguoi_duoc_giao_id,
        employeeName: b.nguoi_duoc_giao?.ho_ten,
      })),
      history: r.danh_sach_lich_su.map((h) => ({
        id: h.id,
        action: h.hanh_dong,
        actor: h.ten_nguoi_thao_tac_luc_do,
        reason: h.y_kien,
        time: h.created_at.toISOString(),
        details: h.chi_tiet,
      })),
    },
    actions: s.workflowActions ?? [],
    employeeId: s.employeeId ?? null,
  };
}
async function resolveEmployee(
  tx: Tx,
  companyId: number,
  departmentId: number,
  b: { cach_chon_nguoi: string; nguoi_chi_dinh_id: number | null },
) {
  if (b.cach_chon_nguoi === "SPECIFIC_EMPLOYEE")
    return b.nguoi_chi_dinh_id;
  return (
    (
      await tx.phong_ban.findFirst({
        where: { id: departmentId, company_id: companyId },
        select: { nguoi_phu_trach_id: true },
      })
    )?.nguoi_phu_trach_id ?? null
  );
}
async function activateNext(
  tx: Tx,
  s: SessionUser,
  request: {
    id: number;
    phong_nguoi_gui_id: number;
    nguoi_gui_id: number;
  },
) {
  const next = await tx.buoc_xu_ly_quy_trinh.findFirst({
    where: {
      ho_so_quy_trinh_id: request.id,
      company_id: s.companyId,
      trang_thai: "WAITING",
    },
    include: { buoc_mau: true },
    orderBy: { buoc_mau: { thu_tu: "asc" } },
  });
  if (!next) {
    await tx.ho_so_quy_trinh.update({
      where: { id: request.id },
      data: { trang_thai: "COMPLETED", thoi_diem_ket_thuc: new Date() },
    });
    await history(tx, s, request.id, "FINISHED");
    return;
  }
  const employeeId = await resolveEmployee(
    tx,
    s.companyId,
    request.phong_nguoi_gui_id,
    next.buoc_mau,
  );
  const issue = await assigneeIssue(
    tx,
    s.companyId,
    employeeId,
    next.buoc_mau.loai_buoc,
    request.nguoi_gui_id,
  );
  await tx.buoc_xu_ly_quy_trinh.update({
    where: { id: next.id },
    data: {
      nguoi_duoc_giao_id: employeeId,
      trang_thai: issue ? "BLOCKED" : "PENDING",
      ly_do_tam_dung: issue,
      thoi_diem_bat_dau: new Date(),
    },
  });
  await history(
    tx,
    s,
    request.id,
    issue ? "BLOCKED" : "STEP_ASSIGNED",
    next.id,
    issue ?? undefined,
    { employeeId },
  );
}
export async function actOnWorkflow(input: unknown) {
  const s = await getSession();
  if (!s) return failure(Error("Vui lòng đăng nhập."));
  const p = WorkflowCommandSchema.safeParse(input);
  if (!p.success) return invalid(p.error);
  const v = p.data;
  try {
    await db.$transaction(
      async (tx) => {
        await lock(tx, s);
        await tx.$queryRaw`SELECT id FROM ho_so_quy_trinh WHERE id=${v.id} AND company_id=${s.companyId} FOR UPDATE`;
        const actor = await workflowActor(tx, s, "VIEW");
        const person = actor.account.nhan_su;
        const current = {
          ...s,
          employeeId: person?.id ?? null,
          workflowActions: actor.actions,
        };
        const r = await tx.ho_so_quy_trinh.findFirst({
          where: { ...workflowRecordScope(current), id: v.id },
          include: recordInclude,
        });
        if (!r)
          throw Error("Không tìm thấy hồ sơ hoặc không có quyền thao tác.");
        version(r.updated_at, v.version);
        const owns = person?.id === r.nguoi_gui_id;
        const requireAction = (action: "CREATE" | "APPROVE" | "EXECUTE") => {
          if (
            person?.tinh_trang_lam_viec !== "ACTIVE" ||
            !canWorkflow(actor.actions, action)
          )
            throw Error("Tài khoản cần đúng quyền và hồ sơ đang làm việc.");
        };
        if (v.command === "SUBMIT") {
          requireAction("CREATE");
          if (!owns || r.trang_thai !== "DRAFT")
            throw Error("Chỉ gửi hồ sơ nháp của mình.");
          if (r.mau.trang_thai !== "PUBLISHED")
            throw Error("Mẫu đã ngừng phát hành. Sửa nháp để chọn mẫu mới.");
          if (!person!.department_id)
            throw Error("Người gửi chưa có phòng ban.");
          for (const b of r.mau.danh_sach_buoc) {
            const employeeId = await resolveEmployee(
              tx,
              s.companyId,
              person!.department_id,
              b,
            );
            const issue = await assigneeIssue(
              tx,
              s.companyId,
              employeeId,
              b.loai_buoc,
              person!.id,
            );
            if (issue) throw Error(`${b.ten}: ${issue}`);
          }
          if (!r.mau.danh_sach_buoc.length) throw Error("Mẫu chưa có bước.");
          const sent = await tx.ho_so_quy_trinh.update({
            where: { id: r.id },
            data: {
              trang_thai: "IN_PROGRESS",
              phong_nguoi_gui_id: person!.department_id,
              thoi_diem_gui: new Date(),
            },
          });
          await tx.buoc_xu_ly_quy_trinh.createMany({
            data: r.mau.danh_sach_buoc.map((b) => ({
              company_id: s.companyId,
              ho_so_quy_trinh_id: r.id,
              mau_quy_trinh_id: r.mau_quy_trinh_id,
              buoc_mau_quy_trinh_id: b.id,
            })),
          });
          await history(tx, current, r.id, "SUBMITTED");
          await activateNext(tx, current, sent);
          return;
        }
        if (v.command === "CANCEL") {
          if (r.trang_thai === "DRAFT") {
            requireAction("CREATE");
            if (!owns) throw Error("Chỉ hủy nháp của mình.");
          } else if (
            r.trang_thai !== "IN_PROGRESS" ||
            !canWorkflow(actor.actions, "MANAGE")
          )
            throw Error("Chỉ người điều phối được hủy hồ sơ đang xử lý.");
          await tx.buoc_xu_ly_quy_trinh.updateMany({
            where: {
              ho_so_quy_trinh_id: r.id,
              company_id: s.companyId,
              trang_thai: { in: ["WAITING", "PENDING", "BLOCKED"] },
            },
            data: { trang_thai: "CANCELLED", thoi_diem_ket_thuc: new Date() },
          });
          await tx.ho_so_quy_trinh.update({
            where: { id: r.id },
            data: { trang_thai: "CANCELLED", thoi_diem_ket_thuc: new Date() },
          });
          await history(
            tx,
            current,
            r.id,
            "CANCELLED",
            undefined,
            v.reason,
          );
          return;
        }
        if (r.trang_thai !== "IN_PROGRESS")
          throw Error("Hồ sơ không ở trạng thái đang xử lý.");
        const step = r.danh_sach_buoc.find(
          (b) =>
            b.id === v.stepId &&
            ["PENDING", "BLOCKED"].includes(b.trang_thai),
        );
        if (!step) throw Error("Bước xử lý đã thay đổi hoặc chưa đến lượt.");
        if (v.command === "REASSIGN") {
          if (!canWorkflow(actor.actions, "MANAGE"))
            throw Error("Không có quyền điều phối.");
          const issue = await assigneeIssue(
            tx,
            s.companyId,
            v.employeeId!,
            step.buoc_mau.loai_buoc,
            r.nguoi_gui_id,
          );
          if (issue) throw Error(issue);
          await tx.buoc_xu_ly_quy_trinh.update({
            where: { id: step.id },
            data: {
              nguoi_duoc_giao_id: v.employeeId,
              trang_thai: "PENDING",
              ly_do_tam_dung: null,
              thoi_diem_bat_dau: step.thoi_diem_bat_dau ?? new Date(),
            },
          });
          await history(
            tx,
            current,
            r.id,
            "REASSIGNED",
            step.id,
            v.reason,
            {
              fromEmployeeId: step.nguoi_duoc_giao_id,
              toEmployeeId: v.employeeId!,
            },
          );
          await history(
            tx,
            current,
            r.id,
            "STEP_ASSIGNED",
            step.id,
            undefined,
            { employeeId: v.employeeId! },
          );
        } else {
          const approval = v.command === "APPROVE" || v.command === "REJECT";
          requireAction(approval ? "APPROVE" : "EXECUTE");
          if (
            step.trang_thai !== "PENDING" ||
            step.nguoi_duoc_giao_id !== person!.id ||
            step.buoc_mau.loai_buoc !== (approval ? "APPROVAL" : "TASK")
          )
            throw Error("Không đúng người được giao hoặc loại bước.");
          const issue = await assigneeIssue(
            tx,
            s.companyId,
            person!.id,
            step.buoc_mau.loai_buoc,
            r.nguoi_gui_id,
          );
          if (issue) throw Error(issue);
          const status =
            v.command === "APPROVE"
              ? "APPROVED"
              : v.command === "REJECT"
                ? "REJECTED"
                : "COMPLETED";
          await tx.buoc_xu_ly_quy_trinh.update({
            where: { id: step.id },
            data: { trang_thai: status, thoi_diem_ket_thuc: new Date() },
          });
          await history(
            tx,
            current,
            r.id,
            v.command === "COMPLETE" ? "TASK_COMPLETED" : status,
            step.id,
            v.reason,
          );
          if (v.command === "REJECT") {
            await tx.buoc_xu_ly_quy_trinh.updateMany({
              where: {
                ho_so_quy_trinh_id: r.id,
                company_id: s.companyId,
                trang_thai: "WAITING",
              },
              data: { trang_thai: "CANCELLED", thoi_diem_ket_thuc: new Date() },
            });
            await tx.ho_so_quy_trinh.update({
              where: { id: r.id },
              data: { trang_thai: "REJECTED", thoi_diem_ket_thuc: new Date() },
            });
          } else await activateNext(tx, current, r);
        }
        // Version changes on every successful decision or reassignment, including intermediate steps.
        await tx.ho_so_quy_trinh.updateMany({
          where: {
            id: r.id,
            company_id: s.companyId,
            trang_thai: "IN_PROGRESS",
          },
          data: { updated_at: new Date() },
        });
      },
      { timeout: 20000 },
    );
    refresh();
    return { success: true as const, message: "Đã cập nhật hồ sơ." };
  } catch (e) {
    return failure(e);
  }
}
