"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SessionUser } from "@/lib/auth"
import {
  LayoutDashboard,
  Users,
  Building2,
  ListTodo,
  FolderKanban,
  ShieldCheck,
  History,
  Settings,
  ChevronDown,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export interface SubMenuItem {
  label: string
  href: string
  icon: any
  badge?: string
  requiredModule?: string
}

export interface MenuGroup {
  id: string
  title: string
  icon: any
  requiredModule?: string
  defaultOpen?: boolean
  items: SubMenuItem[]
}

// 1. Menu Tổng quan chính độc lập ở trên cùng
export const mainOverviewItem: SubMenuItem = {
  label: "Tổng quan",
  href: "/",
  icon: LayoutDashboard,
}

// 2. Các nhóm Sub-menu theo từng Phân hệ nghiệp vụ
export const menuGroups: MenuGroup[] = [
  {
    id: "hr",
    title: "QUẢN TRỊ NHÂN SỰ",
    icon: Users,
    requiredModule: "HR",
    defaultOpen: true,
    items: [
      { label: "Hồ sơ nhân sự", href: "/employees", icon: Users },
      { label: "Cơ cấu phòng ban", href: "/departments", icon: Building2 },
    ],
  },
  {
    id: "tasks",
    title: "QUẢN LÝ CÔNG VIỆC",
    icon: ListTodo,
    requiredModule: "TASK",
    defaultOpen: false,
    items: [
      { label: "Công việc của tôi", href: "/tasks", icon: ListTodo },
      { label: "Việc phòng ban & DA", href: "/tasks/department", icon: FolderKanban },
    ],
  },
  {
    id: "system",
    title: "HỆ THỐNG & CẤU HÌNH",
    icon: ShieldCheck,
    requiredModule: "SYSTEM",
    defaultOpen: true,
    items: [
      { label: "Phân quyền vai trò", href: "/roles", icon: ShieldCheck },
      { label: "Nhật ký hoạt động", href: "/audit-logs", icon: History },
      { label: "Cài đặt chung", href: "/settings", icon: Settings },
    ],
  },
]

interface NavigationLinksProps {
  session?: SessionUser | null
  onNavigate?: () => void
}

export function NavigationLinks({ session, onNavigate }: NavigationLinksProps) {
  const pathname = usePathname()

  // Khởi tạo trạng thái đóng/mở của các nhóm
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuGroups.forEach((g) => {
      initial[g.id] = g.defaultOpen ?? true
    })
    return initial
  })

  // Tự động mở nhóm nếu đường dẫn hiện tại thuộc nhóm đó
  useEffect(() => {
    menuGroups.forEach((group) => {
      const hasActiveChild = group.items.some(
        (item) => item.href !== "/" && pathname.startsWith(item.href)
      )
      if (hasActiveChild) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }))
      }
    })
  }, [pathname])

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Lọc các nhóm theo quyền session
  const visibleGroups = menuGroups.filter((group) => {
    if (!group.requiredModule) return true
    if (!session?.permissions) return true // Mặc định hiển thị nếu chưa có session
    const level = session.permissions[group.requiredModule]
    return level && level !== "NONE"
  })

  const isMainActive = pathname === "/"

  return (
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
      {/* 1. Menu Tổng quan chính độc lập */}
      <div>
        <Link
          href={mainOverviewItem.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden select-none",
            isMainActive
              ? "text-primary bg-primary/10 shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {isMainActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
          )}
          <mainOverviewItem.icon
            className={cn(
              "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
              isMainActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <span className="truncate">{mainOverviewItem.label}</span>
        </Link>
      </div>

      {/* 2. Danh sách các Sub-menu Phân hệ */}
      <div className="space-y-3 pt-1">
        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? true
          const hasActiveChild = group.items.some(
            (item) => item.href !== "/" && pathname.startsWith(item.href)
          )

          return (
            <div key={group.id} className="space-y-1">
              {/* Tiêu đề nhóm (Group Header) có thể click để thu gọn / mở rộng */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-colors group cursor-pointer",
                  hasActiveChild
                    ? "text-primary/90 hover:text-primary"
                    : "text-muted-foreground/75 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <group.icon className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                  <span className="truncate">{group.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200 shrink-0 opacity-60 group-hover:opacity-100",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              {/* Danh sách các Menu con (Sub-items) */}
              {isOpen && (
                <div className="space-y-1 pl-2.5 ml-2 border-l border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                  {group.items.map((subItem) => {
                    const isActive =
                      pathname === subItem.href ||
                      (subItem.href !== "/" && pathname.startsWith(subItem.href))

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 group relative select-none",
                          isActive
                            ? "text-primary bg-primary/10 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <subItem.icon
                            className={cn(
                              "w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="truncate">{subItem.label}</span>
                        </div>
                        {subItem.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-normal">
                            {subItem.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export function Sidebar({ session }: { session?: SessionUser | null }) {
  const initials = session?.fullName
    ? session.fullName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD"

  const primaryRole = session?.roleCodes?.[0] || "ADMIN"

  return (
    <aside className="hidden lg:flex w-64 border-r border-border/50 bg-background/80 backdrop-blur-xl h-screen sticky top-0 flex-col shrink-0 z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
            SDG
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold bg-gradient-to-r from-primary to-blue-900 bg-clip-text text-transparent">
              SAO ĐỎ GROUP
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold -mt-1">
              ERP System
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation List with Sub-menus */}
      <NavigationLinks session={session} />

      {/* Logged in User Profile Footer */}
      {session && (
        <div className="p-3 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-card border border-border/40 shadow-xs">
            <Avatar className="h-9 w-9 border border-border/50 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate text-foreground leading-tight">
                {session.fullName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {session.employeeCode}
                </span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary font-medium">
                  {primaryRole}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Version Info */}
      <div className="px-4 py-2 border-t border-border/30 text-[11px] text-muted-foreground/75 text-center">
        Sao Đỏ Group ERP • v1.0
      </div>
    </aside>
  )
}
