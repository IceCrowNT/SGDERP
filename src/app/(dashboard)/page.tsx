import { Metadata } from "next";
import Link from "next/link";
import { Users, Building2, ShieldCheck, CheckCircle2, ArrowUpRight, Sparkles, UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


export const metadata: Metadata = {
  title: "Tổng quan | SDG ERP - Sao Đỏ Group",
  description: "Trang tổng quan tình hình nhân sự và tổ chức Sao Đỏ Group",
};

export default async function DashboardPage() {
  const session = await getSession();

  // Truy vấn dữ liệu thực tế từ PostgreSQL
  const [totalUsers, activeUsers, totalDepartments, totalRoles, recentUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.department.count(),
    db.role.count(),
    db.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { department: true },
    }),
  ]);

  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100;

  const statCards = [
    {
      title: "Tổng số nhân sự",
      value: totalUsers.toLocaleString("vi-VN"),
      subtitle: `${activeUsers} đang hoạt động`,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      progress: activeRate,
      href: "/employees",
    },
    {
      title: "Phòng ban & Ban QLDA",
      value: totalDepartments.toLocaleString("vi-VN"),
      subtitle: "Đơn vị trực thuộc tập đoàn",
      icon: Building2,
      color: "text-blue-900 dark:text-blue-400",
      bgColor: "bg-blue-900/10 dark:bg-blue-400/10",
      progress: 100,
      href: "/departments",
    },
    {
      title: "Nhóm vai trò (RBAC)",
      value: totalRoles.toLocaleString("vi-VN"),
      subtitle: "Ma trận phân quyền hệ thống",
      icon: ShieldCheck,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-600/10 dark:bg-amber-400/10",
      progress: 100,
      href: "/roles",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-primary/95 via-primary to-blue-950 text-primary-foreground shadow-lg shadow-primary/10">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sao Đỏ Group ERP v1.0 • Trực tuyến</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Xin chào, {session?.fullName || "Quản trị viên"}!
          </h1>
          <p className="text-white/80 text-sm sm:text-base font-normal">
            Hệ thống đã đồng bộ toàn bộ dữ liệu thực tế của Tập đoàn với {totalUsers} hồ sơ nhân sự và {totalDepartments} phòng ban trực thuộc.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Real Statistics Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="p-5 sm:p-6 rounded-2xl border border-border/50 bg-card text-card-foreground shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">{card.title}</p>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{card.value}</h3>
                </div>
              </div>
              <Link href={card.href} className="text-muted-foreground group-hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-muted/80">
                <ArrowUpRight className="w-4 h-4" />
                <span className="sr-only">Xem chi tiết {card.title}</span>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{card.subtitle}</span>
                <span className="font-semibold text-foreground">{card.progress}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${card.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Recent Employees + Quick Management Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Employees Table / List */}
        <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h2 className="text-lg font-bold text-foreground">Hồ sơ nhân sự tiêu biểu</h2>
              <p className="text-xs text-muted-foreground">Các cán bộ nhân viên đã đồng bộ từ CSDL</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
              <Link href="/employees">Xem tất cả ({totalUsers})</Link>
            </Button>
          </div>

          <div className="divide-y divide-border/40">
            {recentUsers.map((u) => {
              const initials = u.fullName
                .split(" ")
                .filter(Boolean)
                .slice(-2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div key={u.id} className="py-3 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initials || "NV"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.position || "Nhân viên"} • <span className="text-foreground/75 font-mono">{u.employeeCode}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {u.department && (
                      <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal border-border/60">
                        {u.department.name}
                      </Badge>
                    )}
                    <Badge variant={u.isActive ? "default" : "secondary"} className={`text-[10px] h-5 px-2 ${u.isActive ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}`}>
                      {u.isActive ? "Hoạt động" : "Nghỉ việc"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System & Architecture Status Card */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground">Trạng thái hệ sinh thái</h2>
              <p className="text-xs text-muted-foreground">Kiến trúc kỹ thuật SDG ERP</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">PostgreSQL Multi-tenant</p>
                  <p className="text-muted-foreground">Đã di trú lược đồ chuẩn Prisma v6</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Simplified JSON RBAC</p>
                  <p className="text-muted-foreground">Phân quyền 3 cấp độ (NONE, VIEW, MANAGE)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">100% TypeScript & Shadcn UI</p>
                  <p className="text-muted-foreground">Tối ưu tương thích điện thoại & máy tính</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button asChild className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
              <Link href="/employees">
                <UserCheck className="w-4 h-4 mr-2" />
                Truy cập Quản lý Nhân sự
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
