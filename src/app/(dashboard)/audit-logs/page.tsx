import { Metadata } from "next";
import { History, Shield, Search, ArrowLeft, Clock, Laptop, User } from "lucide-react";
import Link from "next/link";
import { getAuditLogs } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const metadata: Metadata = {
  title: "Nhật ký hoạt động | SDG ERP - Sao Đỏ Group",
  description: "Lịch sử kiểm toán và theo dõi thao tác người dùng trong hệ thống",
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  const resolvedParams = await searchParams;

  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : "";
  const moduleFilter = typeof resolvedParams.module === "string" ? resolvedParams.module : "ALL";

  const { logs, pagination } = await getAuditLogs({
    page,
    limit: 25,
    search,
    module: moduleFilter,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium">Đăng nhập</Badge>;
      case "LOGOUT":
        return <Badge variant="secondary" className="font-medium">Đăng xuất</Badge>;
      case "LOGIN_FAILED":
        return <Badge variant="destructive" className="font-medium">Đăng nhập lỗi</Badge>;
      case "CREATE":
        return <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-medium">Thêm mới</Badge>;
      case "UPDATE":
        return <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-medium">Cập nhật</Badge>;
      case "DELETE":
        return <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-medium">Xoá</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Tổng quan
            </Link>
            <span>/</span>
            <span>Hệ thống</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Nhật ký hoạt động</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="w-7 h-7 text-primary" />
            Nhật ký hoạt động hệ thống
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Ghi vết kiểm toán tự động mọi thao tác người dùng, đăng nhập và biến động dữ liệu toàn tập đoàn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-card border border-border/50 shadow-xs flex items-center gap-2 text-xs">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Tổng số bản ghi:</span>
            <span className="font-bold text-foreground font-mono">{pagination.total.toLocaleString("vi-VN")}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border/50 shadow-xs">
        <form method="GET" className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Tìm theo người thực hiện, nội dung hoặc đối tượng..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-muted/40 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl px-4 text-xs font-semibold">
            Tìm kiếm
          </Button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {["ALL", "AUTH", "HR", "DEPARTMENT", "ROLE", "SYSTEM"].map((mod) => {
            const isActive = moduleFilter === mod;
            return (
              <Button
                key={mod}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`rounded-xl text-xs h-8 px-3 ${isActive ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Link href={`/audit-logs?module=${mod}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                  {mod === "ALL" ? "Tất cả" : mod}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <History className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Chưa có nhật ký hoạt động nào</p>
            <p className="text-xs text-muted-foreground">
              Các thao tác của người dùng như Đăng nhập, Thêm, Sửa, Xoá dữ liệu sẽ tự động được ghi nhận tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Phân hệ</th>
                  <th className="py-3 px-4 min-w-[280px]">Nội dung chi tiết</th>
                  <th className="py-3 px-4 hidden md:table-cell">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => {
                  const initials = log.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  const timeStr = new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  }).format(new Date(log.createdAt));

                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 opacity-60" />
                          <span>{timeStr}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border/40">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {initials || "HT"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground leading-tight">{log.fullName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">@{log.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-border/60">
                          {log.module}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <p className="text-foreground font-medium">{log.description}</p>
                        {log.targetName && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Đối tượng: <span className="font-semibold text-foreground/80">{log.targetName}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap hidden md:table-cell text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 opacity-60" />
                          <span>{log.ipAddress || "localhost"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                  <Link href={`/audit-logs?page=${pagination.page - 1}&module=${moduleFilter}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                    Trang trước
                  </Link>
                </Button>
              )}
              {pagination.page < pagination.totalPages && (
                <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                  <Link href={`/audit-logs?page=${pagination.page + 1}&module=${moduleFilter}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                    Trang tiếp
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
