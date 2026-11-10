import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

/** Present only the already-authorized dataset supplied by the feature. */
export function FeatureOverview({ items }: { items: { label: string; value: number | string; icon: LucideIcon }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" aria-label="Tóm tắt dữ liệu">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 sm:flex-1 sm:p-4">
          <span className="hidden rounded-xl bg-primary/10 p-2.5 text-primary sm:block"><Icon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0"><dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt><dd className="text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</dd></div>
        </div>
      ))}
    </dl>
  );
}
export function FeatureHelp({ title = "Hướng dẫn", children }: { title?: string; children: ReactNode }) {
  return <details className="rounded-xl border bg-muted/20 px-4 py-3 text-sm"><summary className="cursor-pointer font-medium focus-visible:outline-ring">{title}</summary><div className="mt-3 space-y-2 text-muted-foreground">{children}</div></details>;
}
export function EmptyPanel({ title, description }: { title: string; description?: string }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/10 p-6 text-center"><Inbox className="size-8 text-muted-foreground" aria-hidden="true" /><p className="font-medium">{title}</p>{description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}</div>;
}
export function PersonInitials({ name }: { name: string }) {
  return <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi")}</span>;
}
