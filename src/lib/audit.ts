import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "PERMISSION_CHANGE";

export type AuditModule =
  | "AUTH"
  | "HR"
  | "DEPARTMENT"
  | "ROLE"
  | "TASK"
  | "SYSTEM";

export interface LogActivityParams {
  userId?: number | null;
  username?: string;
  fullName?: string;
  companyId?: number;
  action: AuditAction;
  module: AuditModule;
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  oldData?: unknown;
  newData?: unknown;
}

/**
 * Ghi nhật ký hoạt động (Audit Log) toàn hệ thống
 * Non-blocking, không làm gián đoạn hoặc chậm luồng nghiệp vụ chính
 */
export async function logActivity(params: LogActivityParams) {
  try {
    let { userId, username, fullName, companyId } = params;

    // Nếu không truyền thông tin user, cố gắng lấy từ Session hiện tại
    if (!userId || !companyId) {
      const session = await getSession();
      if (session) {
        userId = userId || session.userId;
        username = username || session.username;
        fullName = fullName || session.fullName;
        companyId = companyId || session.companyId;
      }
    }

    // Nếu vẫn không có companyId (ví dụ sự kiện login thất bại), lấy default company
    if (!companyId) {
      const defaultCompany = await db.cong_ty.findFirst({ select: { id: true } });
      companyId = defaultCompany?.id || 1;
    }

    // Trích xuất IP và User-Agent từ Header
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const headerList = await headers();
      ipAddress =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerList.get("x-real-ip") ||
        null;
      userAgent = headerList.get("user-agent") || null;
    } catch {
      // Bỏ qua nếu chạy ngoài request context
    }

    await db.nhat_ky_hoat_dong.create({
      data: {
        account_id: userId || null,
        ten_dang_nhap: username || "anonymous",
        ho_ten: fullName || "Khách",
        hanh_dong: params.action,
        phan_he: params.module,
        doi_tuong_id: params.targetId || null,
        ten_doi_tuong: params.targetName || null,
        mo_ta: params.description,
        du_lieu_cu: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        du_lieu_moi: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
        dia_chi_ip: ipAddress,
        thong_tin_trinh_duyet: userAgent,
        company_id: companyId,
      },
    });
  } catch (error) {
    // Log lỗi console nhưng không ném exception để bảo vệ luồng chính
    console.error("⚠️ Lỗi khi ghi Audit Log:", error);
  }
}

/**
 * Lấy danh sách lịch sử Audit Logs có phân trang và bộ lọc
 */
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  search?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const session = await getSession();
  if (!session || !hasPermission(session, "AUDIT")) throw Error("Không có quyền xem nhật ký.");
  const where: Prisma.nhat_ky_hoat_dongWhereInput = { company_id: session.companyId };

  if (params.module && params.module !== "ALL") {
    where.phan_he = params.module;
  }

  if (params.action && params.action !== "ALL") {
    where.hanh_dong = params.action;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { ho_ten: { contains: q, mode: "insensitive" } },
      { ten_dang_nhap: { contains: q, mode: "insensitive" } },
      { mo_ta: { contains: q, mode: "insensitive" } },
      { ten_doi_tuong: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.nhat_ky_hoat_dong.count({ where }),
    db.nhat_ky_hoat_dong.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        tai_khoan: {
          select: {
            nhan_su: { select: { ma_nhan_su: true, duong_dan_anh_dai_dien: true, chuc_vu: true } },
          },
        },
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
