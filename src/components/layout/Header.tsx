"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Bell, Search, LogOut, Menu, Shield } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { logoutAction } from "@/actions/auth"
import { SessionUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { NavigationLinks } from "./Sidebar"

export function Header({ session }: { session?: SessionUser | null }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const initials = session?.fullName
    ? session.fullName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD"

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20 transition-all duration-300 shadow-xs">
      {/* Left side: Hamburger on Mobile + Logo */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Drawer Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-xl hover:bg-muted"
            >
              <Menu className="w-5 h-5 text-foreground" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 flex flex-col bg-background">
            <SheetHeader className="h-16 px-6 border-b border-border/50 flex flex-row items-center justify-start gap-2.5">
              <div className="h-8 w-auto flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Tập đoàn Sao Đỏ"
                  width={124}
                  height={75}
                  className="h-7 w-auto object-contain"
                />
              </div>
              <SheetTitle className="text-base font-bold bg-gradient-to-r from-primary to-blue-900 bg-clip-text text-transparent">
                SAO ĐỎ GROUP
              </SheetTitle>
            </SheetHeader>
            <NavigationLinks session={session} onNavigate={() => setMobileOpen(false)} />
            <div className="p-4 border-t border-border/50 text-xs text-muted-foreground text-center">
              Sao Đỏ Group ERP v1.0
            </div>
          </SheetContent>
        </Sheet>

        {/* Brand on Mobile */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/logo.png"
            alt="Tập đoàn Sao Đỏ"
            width={124}
            height={75}
            className="h-6 w-auto object-contain"
          />
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-blue-900 bg-clip-text text-transparent">
            SDG ERP
          </span>
        </Link>

        {/* Responsive Search Input */}
        <div className="hidden sm:flex items-center bg-muted/50 rounded-full px-3.5 py-1.5 border border-border/50 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all w-48 md:w-72 lg:w-80">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm thông tin..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Right side: Actions & User Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Search className="w-4 h-4" />
          <span className="sr-only">Tìm kiếm</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
          <span className="sr-only">Thông báo</span>
        </Button>

        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="sr-only">Đổi giao diện</span>
          </Button>
        )}

        {/* User Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 h-10 px-2 rounded-full hover:bg-muted/70 transition-colors"
            >
              <Avatar className="h-8 w-8 border border-border/60">
                <AvatarFallback className="bg-gradient-to-tr from-primary to-blue-900 text-primary-foreground font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[120px]">
                  {session?.fullName || "Quản trị viên"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {session?.position || "Quản trị"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl shadow-xl border-border/50">
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-foreground">{session?.fullName || "Quản trị viên"}</p>
                <p className="text-xs text-muted-foreground font-mono">{session?.employeeCode || "SDG-ADMIN"}</p>
                {session?.departmentName && (
                  <p className="text-xs text-muted-foreground font-medium">{session.departmentName}</p>
                )}
                <div className="flex items-center gap-1.5 pt-1">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase">
                    {session?.roleCodes?.join(", ") || "ADMIN"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logoutAction();
              }}
              className="flex items-center gap-2 p-2 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất khỏi hệ thống</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
