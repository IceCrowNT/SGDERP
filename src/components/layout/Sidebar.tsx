"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Receipt, FileText, Settings, Users } from "lucide-react"

const routes = [
  { label: "Tổng quan", icon: LayoutDashboard, href: "/" },
  { label: "Đề nghị thanh toán", icon: Receipt, href: "/payments" },
  { label: "Quản lý nhân sự", icon: Users, href: "/hr" },
  { label: "Tài liệu", icon: FileText, href: "/docs" },
  { label: "Cài đặt", icon: Settings, href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-background/80 backdrop-blur-xl h-screen sticky top-0 flex flex-col transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">SDG ERP</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              pathname === route.href
                ? "text-primary bg-primary/10 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {pathname === route.href && (
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
            )}
            <route.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", pathname === route.href ? "text-primary" : "text-muted-foreground")} />
            {route.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
