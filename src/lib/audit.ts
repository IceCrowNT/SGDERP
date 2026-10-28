import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

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
  oldData?: any;
  newData?: any;
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
      const defaultCompany = await db.company.findFirst({ select: { id: true } });
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

    await db.auditLog.create({
      data: {
        userId: userId || null,
        username: username || "anonymous",
        fullName: fullName || "Khách",
        action: params.action,
        module: params.module,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        description: params.description,
        oldData: params.oldData ? JSON.parse(JSON.stringify(params.oldData)) : undefined,
        newData: params.newData ? JSON.parse(JSON.stringify(params.newData)) : undefined,
        ipAddress,
        userAgent,
        companyId,
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

  const where: any = {};

  if (params.module && params.module !== "ALL") {
    where.module = params.module;
  }

  if (params.action && params.action !== "ALL") {
    where.action = params.action;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { targetName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            employee: { select: { employeeCode: true, avatarUrl: true, position: true } },
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
