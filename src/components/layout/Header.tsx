"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, Menu, X } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { NavigationLinks, getPageContext } from "./Sidebar";

const subscribe = () => () => {};

export function Header({ session, collapsed, onToggleSidebar }: {
  session?: SessionUser | null;
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = session?.fullName
    ? session.fullName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between gap-3 px-3 sm:px-6 sticky top-0 z-40 shadow-xs">
      {/* Global navigation and brand remain visible in both sidebar states. */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-expanded={!collapsed} aria-controls="desktop-navigation"
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="hidden size-10 shrink-0 rounded-xl hover:bg-muted hover:text-foreground lg:inline-flex">
          <Menu aria-hidden="true" className="size-5" />
        </Button>
        {/* Mobile Drawer Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 shrink-0 rounded-xl hover:bg-muted hover:text-foreground"
            >
              <Menu className="w-5 h-5 text-foreground" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="gap-0 p-0 w-72 max-w-[90vw] flex flex-col bg-background"
          >
            <SheetHeader className="h-16 shrink-0 px-4 border-b border-border/50 flex flex-row items-center justify-start gap-2">
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
              <SheetClose asChild><Button variant="ghost" size="icon" className="ml-auto size-10 shrink-0" aria-label="Đóng menu"><X aria-hidden="true" className="size-4" /></Button></SheetClose>
              <SheetDescription className="sr-only">Chọn khu vực làm việc.</SheetDescription>
            </SheetHeader>
            <NavigationLinks
              session={session}
              onNavigate={() => setMobileOpen(false)}
            />

          </SheetContent>
        </Sheet>

        <Link href="/" aria-label="Sao Đỏ Group — Bàn làm việc"
          className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Image src="/logo.png" alt="" width={124} height={75} priority
            className="h-7 w-auto object-contain sm:h-8" />
          <span className="flex flex-col">
            <span className="font-bold text-xs tracking-tight text-primary sm:text-sm">SAO ĐỎ GROUP</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ERP System</span>
          </span>
        </Link>
        <p className="hidden truncate border-l border-border pl-4 text-sm font-medium text-muted-foreground xl:block">{getPageContext(pathname)}</p>
      </div>

      {/* Right side: Actions & User Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span className="sr-only">Đổi giao diện</span>
          </Button>
        )}

        {/* User Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Menu tài khoản"
              className="flex items-center gap-2.5 h-10 px-2 rounded-lg hover:bg-muted/70 transition-colors"
            >
              <Avatar className="h-8 w-8 border border-border/60">
                <AvatarImage
                  src={session?.avatarUrl ?? undefined}
                  alt={session?.fullName ?? "Ảnh đại diện"}
                />
                <AvatarFallback className="bg-gradient-to-tr from-primary to-blue-900 text-primary-foreground font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-semibold leading-tight text-foreground truncate max-w-[180px]">
                  {session?.fullName || "Quản trị viên"}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {session?.position || "Tài khoản nội bộ"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 p-2 rounded-2xl shadow-xl border-border/50"
          >
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-foreground">
                  {session?.fullName || "Quản trị viên"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.username}
                </p>
                {session?.departmentName && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {session.departmentName}
                  </p>
                )}

              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="min-h-10">Hồ sơ của tôi</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await logoutAction();
              }}
              className="flex min-h-10 items-center gap-2 p-2 rounded-xl text-destructive hover:bg-destructive/10 text-xs font-semibold cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất khỏi hệ thống</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
