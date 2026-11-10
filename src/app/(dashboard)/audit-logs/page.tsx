import { Metadata } from "next";
import { History, Shield, Search, ArrowLeft, Clock, Laptop, Users } from "lucide-react";
import Link from "next/link";
import { getAuditLogs } from "@/lib/audit";
import { getSession, hasPermission } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeatureOverview, PersonInitials } from "@/components/ui/feature-overview";
import { Input } from "@/components/ui/input";
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
  if (!hasPermission(session, "AUDIT")) return <p>Không có quyền xem nhật ký.</p>;
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

  const moduleNames: Record<string, string> = { ALL: "Tất cả", AUTH: "Đăng nhập", HR: "Nhân sự", DEPARTMENT: "Phòng ban", ROLE: "Phân quyền", SYSTEM: "Hệ thống" };
  const getActionBadge = (action: string) => {
    const labels: Record<string, string> = { LOGIN: "Đăng nhập", LOGOUT: "Đăng xuất", LOGIN_FAILED: "Đăng nhập lỗi", CREATE: "Thêm mới", UPDATE: "Cập nhật", DELETE: "Xóa", PERMISSION_CHANGE: "Đổi quyền", STATUS_CHANGE: "Đổi trạng thái", CONSOLIDATE: "Thu gọn vai trò" };
    return <Badge variant={action === "LOGIN_FAILED" || action === "DELETE" ? "destructive" : "secondary"}>{labels[action] ?? action}</Badge>;
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
            Lịch sử thao tác trong phạm vi công ty của bạn
          </p>
        </div>


      </div>

      <FeatureOverview items={[
        { label: "Bản ghi khớp bộ lọc", value: pagination.total, icon: History },
        { label: "Bản ghi trên trang", value: logs.length, icon: Shield },
        { label: "Tên đăng nhập trên trang", value: new Set(logs.map((log) => log.ten_dang_nhap)).size, icon: Users },
      ]} />
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border/50 shadow-xs">
        <form method="GET" className="flex min-w-0 flex-1 gap-2">
          <input type="hidden" name="module" value={moduleFilter} />
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              aria-label="Tìm nhật ký"
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Tìm theo người thực hiện, nội dung hoặc đối tượng..."
              className="h-10 pl-9 text-base sm:text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="h-10 rounded-xl px-4 text-xs font-semibold">
            Tìm kiếm
          </Button>
        </form>

        <div className="flex max-w-full flex-wrap items-center gap-1.5 text-xs">
          {["ALL", "AUTH", "HR", "DEPARTMENT", "ROLE", "SYSTEM"].map((mod) => {
            const isActive = moduleFilter === mod;
            return (
              <Button
                key={mod}
                asChild
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`rounded-xl text-xs h-10 px-3 ${isActive ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Link href={`/audit-logs?module=${mod}${search ? `&search=${encodeURIComponent(search)}` : ""}`}>
                  {moduleNames[mod] ?? mod}
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
          <div className="hidden overflow-x-auto md:block">
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
                  const initials = log.ho_ten
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  const timeStr = new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "medium",
                    timeZone: "Asia/Ho_Chi_Minh",
                  }).format(new Date(log.created_at));

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
                            <p className="font-semibold text-foreground leading-tight">{log.ho_ten}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">@{log.ten_dang_nhap}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.hanh_dong)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-border/60">
                          {moduleNames[log.phan_he] ?? log.phan_he}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        {log.mo_ta.length > 140 ? <details><summary className="cursor-pointer font-medium">{log.mo_ta.slice(0, 90)}…</summary><p className="mt-2 break-words text-sm">{log.mo_ta}</p></details> : <p className="text-foreground font-medium">{log.mo_ta}</p>}
                        {log.ten_doi_tuong && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Đối tượng: <span className="font-semibold text-foreground/80">{log.ten_doi_tuong}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap hidden md:table-cell text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 opacity-60" />
                          <span>{log.dia_chi_ip || "Không ghi nhận"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3 p-3 md:hidden">
          {logs.map((log) => <article key={log.id} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3"><PersonInitials name={log.ho_ten} /><div className="min-w-0"><h2 className="break-words font-semibold">{log.ho_ten}</h2><p className="break-all text-xs text-muted-foreground">@{log.ten_dang_nhap}</p></div></div>
            <div className="flex flex-wrap gap-2">{getActionBadge(log.hanh_dong)}<Badge variant="outline">{moduleNames[log.phan_he] ?? log.phan_he}</Badge></div>
            {log.mo_ta.length > 140 ? <details className="text-sm"><summary className="cursor-pointer break-words">{log.mo_ta.slice(0, 90)}…</summary><p className="mt-2 break-words">{log.mo_ta}</p></details> : <p className="text-sm break-words">{log.mo_ta}</p>}
            {log.ten_doi_tuong && <p className="text-xs text-muted-foreground break-words">Đối tượng: {log.ten_doi_tuong}</p>}
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden="true" />{new Date(log.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Thông tin kết nối</summary><p className="mt-2 break-all">IP: {log.dia_chi_ip || "Không ghi nhận"}</p></details>
          </article>)}
        </div>

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
