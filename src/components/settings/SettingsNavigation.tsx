"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const items = [
  { href: "/settings", label: "Tổng quan cài đặt", icon: LayoutGrid },
  { href: "/settings/ai", label: "Quản trị AI", icon: Bot },
];

export function SettingsNavigation() {
  const pathname = usePathname(), router = useRouter();
  return <>
    <div className="lg:hidden"><Select value={pathname} onValueChange={href => { if (items.some(item => item.href === href)) router.push(href); }}>
      <SelectTrigger aria-label="Mục cài đặt" className="min-h-11 w-full bg-card text-base"><SelectValue /></SelectTrigger>
      <SelectContent>{items.map(item => <SelectItem key={item.href} value={item.href}>{item.label}</SelectItem>)}</SelectContent>
    </Select></div>
    <nav aria-label="Điều hướng cài đặt" className="hidden space-y-1 lg:block">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
        className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-ring", pathname === href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
      </Link>)}
    </nav>
  </>;
}
