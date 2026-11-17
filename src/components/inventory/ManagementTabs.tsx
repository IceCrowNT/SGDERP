import Link from "next/link";
import { Package, Boxes, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
export function ManagementTabs({ active, assets, inventory }: { active: "assets" | "consumable" | "accessory"; assets: boolean; inventory: boolean }) {
  const tabs = [
    { key: "assets", label: "Tài sản", href: "/assets", icon: Package, visible: assets },
    { key: "consumable", label: "Vật tư tiêu hao", href: "/inventory?kind=consumable", icon: Boxes, visible: inventory },
    { key: "accessory", label: "Phụ kiện", href: "/inventory?kind=accessory", icon: Paperclip, visible: inventory },
  ];
  return <nav aria-label="Hạng mục quản lý" className="mb-6 flex max-w-full gap-1 overflow-x-auto border-b pb-2">{tabs.filter(t => t.visible).map(t => <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined} className={cn("flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", active === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><t.icon className="size-4" aria-hidden="true" />{t.label}</Link>)}</nav>;
}
