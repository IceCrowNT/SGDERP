"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { canViewSystemOverview } from "@/lib/system-access"
import { canManageAccounts } from "@/lib/account-access"
import type { SessionUser } from "@/lib/auth"
import { canTask } from "@/lib/support-task"
import { canAdministerAi } from "@/lib/role-catalog"
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
  Map,
  GitBranch,
  MapPin,
  Package,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface SubMenuItem {
  label: string
  shortLabel?: string
  href: string
  icon: LucideIcon
  badge?: string
  requiredModule?: string
}

export interface MenuGroup {
  id: string
  title: string
  href?: string
  shortLabel?: string
  icon: LucideIcon
  requiredModule?: string
  defaultOpen?: boolean
  items: SubMenuItem[]
}

// 1. Menu Tổng quan chính độc lập ở trên cùng
export const mainOverviewItem: SubMenuItem = {
  label: "Bàn làm việc",
  href: "/",
  icon: LayoutDashboard,
}

// 2. Các nhóm Sub-menu theo từng Phân hệ nghiệp vụ
export const menuGroups: MenuGroup[] = [
  {
    id: "building", title: "Bản đồ 3D", icon: Map, requiredModule: "LOCATIONS",
    items: [{ label: "Bản đồ 3D", href: "/office-3d", icon: Map }],
  },
  {
    id: "hr",
    title: "Nhân sự",
    href: "/hr",
    icon: Users,
    requiredModule: "HR",
    defaultOpen: true,
    items: [
      { label: "Tổng quan nhân sự", href: "/hr", icon: LayoutDashboard },
      { label: "Hồ sơ nhân sự", href: "/employees", icon: Users },
      { label: "Cơ cấu phòng ban", href: "/departments", icon: Building2 },
    ],
  },
  {
    id: "workflow", title: "Quy trình", icon: GitBranch, requiredModule: "WORKFLOW", defaultOpen: true,
    items: [{label: "Quy trình", href: "/workflows", icon: GitBranch, badge: "Thử"}],
  },
  {
    id: "tasks",
    title: "Công việc",
    icon: ListTodo,
    requiredModule: "SUPPORT_TASK",
    defaultOpen: false,
    items: [
      { label: "Công việc của tôi", href: "/tasks", icon: ListTodo },
      { label: "Việc phòng ban", href: "/tasks/department", icon: FolderKanban },
    ],
  },
  {
    id: "system",
    href: "/system",
    title: "Quản trị hệ thống",
    shortLabel: "Quản trị",
    icon: ShieldCheck,
    defaultOpen: true,
    items: [
      { label: "Tổng quan quản trị", href: "/system", icon: LayoutDashboard },
      { label: "Tài khoản đăng nhập", href: "/accounts", icon: Users },
      { label: "Phân quyền vai trò", href: "/roles", icon: ShieldCheck, requiredModule: "ROLES" },
      { label: "Vị trí & không gian", href: "/locations", icon: MapPin, requiredModule: "LOCATIONS" },
      { label: "Nhật ký hoạt động", href: "/audit-logs", icon: History, requiredModule: "AUDIT" },
      { label: "Cài đặt chung", href: "/settings", icon: Settings },
    ],
  },
]

export function getVisibleMenuGroups(session?: SessionUser | null) {
  return menuGroups.map(group => ({ ...group, items: group.items.filter(item => {
    if (session?.mustChangePassword) return false;
    if (group.id === "tasks") return canTask(session?.taskActions);
    if (item.href === "/system") return canViewSystemOverview(session);
    if (item.href === "/accounts") return canManageAccounts(session);
    if (item.href === "/settings") return canAdministerAi(session);
    const moduleCode = item.requiredModule ?? group.requiredModule;
    return !moduleCode || ["VIEW", "MANAGE"].includes(session?.permissions[moduleCode] ?? "");
  }) })).filter(group => group.items.length > 0);
}

const selectedNavigation = "bg-primary/10 text-primary font-semibold hover:bg-primary/15 hover:text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary";
const railIcon = "size-6 shrink-0 stroke-[1.75]";

interface NavigationLinksProps {
  session?: SessionUser | null
  onNavigate?: () => void
  collapsed?: boolean
}

export function NavigationLinks({ session, onNavigate, collapsed = false }: NavigationLinksProps) {
  const pathname = usePathname()
  const navigationId = useId()
  const [flyout, setFlyout] = useState<string | null>(null)

  // Explicit choices are retained while navigating. Unvisited groups follow the current route.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const toggleGroup = (id: string, currentlyOpen: boolean) => {
    setOpenGroups(prev => ({ ...prev, [id]: !currentlyOpen }))
  }

  const visibleGroups = getVisibleMenuGroups(session)

  const isMainActive = pathname === "/"
  const canViewAssets = !session?.mustChangePassword && ["ASSETS", "INVENTORY"].some(module => ["VIEW", "MANAGE"].includes(session?.permissions[module] ?? ""));
  const assetAreaActive = ["/asset-management", "/assets", "/inventory"].some(path => pathname === path || pathname.startsWith(path + "/"));

  const itemLink = (item: SubMenuItem, active: boolean) => {
    const link = (
      <Link href={item.href} onClick={onNavigate}
        aria-current={active ? "page" : undefined} aria-label={collapsed ? item.label : undefined}
        className={cn("relative flex min-h-10 items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          collapsed ? "min-h-16 flex-col justify-center gap-1 px-1" : "px-3",
          active ? selectedNavigation : "text-foreground/85 hover:bg-muted hover:text-foreground")}>
        <item.icon aria-hidden="true" className={cn("shrink-0", collapsed ? railIcon : "size-4")} />
        {collapsed && <span className="w-full text-center text-[11px] leading-tight">{item.shortLabel ?? item.label}</span>}
        {!collapsed && <span className="min-w-0 flex-1">{item.label}</span>}
        {!collapsed && item.badge && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{item.badge}</span>}
      </Link>
    )
    return <div key={item.href}>{link}</div>
  }

  return (
    <nav aria-label="Điều hướng chính" className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
      {itemLink(mainOverviewItem, isMainActive)}
      {visibleGroups.find(group => group.id === "building")?.items.map(item => itemLink(item, matchesRoute(pathname, item.href)))}
      {canViewAssets && itemLink({ label: "Tài sản & vật tư", shortLabel: "Tài sản", href: "/asset-management", icon: Package }, assetAreaActive)}
      {visibleGroups.filter(group => group.id !== "building").map(group => {
        const active = group.items.some(item => matchesRoute(pathname, item.href))
        // Single-destination groups do not require a redundant expand/collapse step.
        if (group.items.length === 1) return <div key={group.id}>{itemLink(group.items[0], active)}</div>
        if (collapsed) return <RailGroup key={`${group.id}-${pathname}`} group={group} active={active} pathname={pathname}
          open={flyout === group.id} onOpenChange={open => setFlyout(current => open ? group.id : current === group.id ? null : current)} onNavigate={onNavigate} />
        const isOpen = openGroups[group.id] ?? (active || Boolean(group.defaultOpen))
        return (
          <div key={group.id}>
            {group.href ? <div className="flex items-center rounded-lg">
              <Link href={group.href} onClick={onNavigate} aria-current={pathname === group.href ? "page" : undefined}
                className={cn("flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", pathname === group.href && "bg-primary/10 text-primary")}>
                <group.icon aria-hidden="true" className="size-4 shrink-0" /><span>{group.title}</span>
              </Link>
              <Button variant="ghost" size="icon" aria-label={`Mở/đóng nhóm ${group.title}`} aria-expanded={isOpen} aria-controls={`${navigationId}-${group.id}`} onClick={() => toggleGroup(group.id, isOpen)} className="size-10 shrink-0 hover:bg-muted hover:text-foreground">
                <ChevronDown aria-hidden="true" className={cn("size-4 text-muted-foreground", !isOpen && "-rotate-90")} />
              </Button>
            </div> : <>
            <Button variant="ghost" onClick={() => toggleGroup(group.id, isOpen)}
              aria-expanded={isOpen} aria-controls={`${navigationId}-${group.id}`}
              className="min-h-10 h-auto w-full justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted">
              <group.icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1 text-left">{group.title}</span>
              <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} />
            </Button>
            </>}
            <div id={`${navigationId}-${group.id}`} hidden={!isOpen} className="ml-3 space-y-0.5 border-l border-border pl-2">
              {group.items.map(item => itemLink(item, matchesRoute(pathname, item.href) && !group.items.some(other => other.href.length > item.href.length && matchesRoute(pathname, other.href))))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

/** Keep hover menus non-modal: opening them must not steal focus from the page. */
function RailGroup({ group, active, pathname, open, onOpenChange, onNavigate }: {
  group: MenuGroup; active: boolean; pathname: string; open: boolean
  onOpenChange: (open: boolean) => void; onNavigate?: () => void
}) {
  const opening = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverOnly = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const clearTimers = () => { if (opening.current) clearTimeout(opening.current); if (closing.current) clearTimeout(closing.current) }
  useEffect(() => () => clearTimers(), [])
  const leave = () => {
    clearTimers()
    if (hoverOnly.current) closing.current = setTimeout(() => onOpenChange(false), 300)
  }
  return (
    <Popover modal={false} open={open} onOpenChange={value => { clearTimers(); onOpenChange(value) }}>
      <div onPointerEnter={event => {
        if (event.pointerType !== "mouse") return
        clearTimers()
        if (!open) opening.current = setTimeout(() => { hoverOnly.current = true; onOpenChange(true) }, 200)
      }} onPointerLeave={leave} onPointerDown={() => { clearTimers(); hoverOnly.current = false }}
        onKeyDown={event => {
          clearTimers(); hoverOnly.current = false
          if (event.key === "ArrowDown") {
            event.preventDefault()
            if (!open) onOpenChange(true)
            else content.current?.querySelector<HTMLElement>('a[href]')?.focus()
          }
        }}>
        {group.href ? <PopoverAnchor asChild>
          <Link ref={node => { trigger.current = node }} href={group.href} aria-label={group.title} aria-current={pathname === group.href ? "page" : undefined}
            aria-haspopup="dialog" aria-expanded={open} onClick={() => { clearTimers(); onOpenChange(false); onNavigate?.() }}
            className={cn("relative flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-sm font-medium hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", active ? selectedNavigation : "text-foreground")}>
            <group.icon aria-hidden="true" className={railIcon} /><span className="w-full text-center text-[11px] leading-tight">{group.shortLabel ?? group.title}</span>
          </Link>
        </PopoverAnchor> : <PopoverTrigger asChild>
          <Button ref={node => { trigger.current = node }} variant="ghost" aria-label={group.title}
            className={cn("relative h-auto min-h-16 w-full flex-col justify-center gap-1 whitespace-normal rounded-lg px-1 py-2 hover:bg-muted hover:text-foreground dark:hover:bg-muted", active ? selectedNavigation : "text-foreground")}>
            <group.icon aria-hidden="true" className={railIcon} /><span className="w-full text-center text-[11px] leading-tight">{group.shortLabel ?? group.title}</span>
          </Button>
        </PopoverTrigger>}
      </div>
      <PopoverContent ref={content} side="right" align="start" sideOffset={8} className="w-64" aria-label={group.title}
        onPointerEnter={clearTimers} onPointerLeave={leave}
        onKeyDown={event => {
          clearTimers(); hoverOnly.current = false
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
          const links = Array.from(content.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])
          if (!links.length) return
          event.preventDefault()
          const index = links.indexOf(document.activeElement as HTMLAnchorElement)
          const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length
          links[next].focus()
        }}
        onOpenAutoFocus={event => { if (hoverOnly.current) event.preventDefault() }}
        onCloseAutoFocus={event => { if (hoverOnly.current || group.href) event.preventDefault() }}
        onEscapeKeyDown={() => { clearTimers(); hoverOnly.current = false; trigger.current?.focus() }}>
        <p className="border-b px-3 py-2 text-sm font-semibold">{group.title}</p>
        {group.items.map(item => {
          const selected = matchesRoute(pathname, item.href) && !group.items.some(other => other.href.length > item.href.length && matchesRoute(pathname, other.href))
          return <Link key={item.href} className={cn("m-1 flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring", selected && "bg-primary/10 text-primary")} href={item.href} onClick={() => { clearTimers(); onOpenChange(false); onNavigate?.() }} aria-current={selected ? "page" : undefined}>
              <item.icon aria-hidden="true" className="size-4" /><span className="flex-1">{item.label}</span>
              {item.badge && <span className="text-xs text-muted-foreground">{item.badge}</span>}
            </Link>
        })}
      </PopoverContent>
    </Popover>
  )
}

/** Segment boundaries avoid selecting unrelated routes with the same prefix. */
export function matchesRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
}

export function getPageContext(pathname: string) {
  if (pathname === "/" || matchesRoute(pathname, "/profile")) return "Không gian cá nhân"
  if (["/asset-management", "/assets", "/inventory"].some(path => matchesRoute(pathname, path))) return "Tài sản & vật tư"
  return menuGroups.find(group => group.items.some(item => matchesRoute(pathname, item.href)))?.title ?? "SDG ERP"
}

export function Sidebar({ session, collapsed }: { session?: SessionUser | null; collapsed: boolean }) {
  return (
    <aside id="desktop-navigation" aria-label="Menu ứng dụng" className={cn("hidden lg:flex border-r border-border/50 bg-background/80 backdrop-blur-xl h-[calc(100dvh-4rem)] sticky top-16 flex-col shrink-0 z-30", collapsed ? "w-22" : "w-64")}>
      <NavigationLinks session={session} collapsed={collapsed} />
    </aside>
  )
}
