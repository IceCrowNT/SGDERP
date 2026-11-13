import { Boxes, Users, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { cn } from "@/lib/utils";
import { matchesSearchText } from "@/lib/search-text";
import { AssetCategoryIcon } from "./AssetCategoryIcon";
import type { AssetGroup, AssetOverview } from "./types";

export type AssetGrouping = "byCategory" | "byEmployee" | "byLocation";
const modes = [
  { value: "byCategory", label: "Theo loại", icon: Boxes },
  { value: "byEmployee", label: "Theo người", icon: Users },
  { value: "byLocation", label: "Theo vị trí", icon: MapPin },
] as const;

export function AssetGroups({ overview, grouping, onGrouping, search, onSearch, onOpen, onAll, disabled }: {
  overview: AssetOverview; grouping: AssetGrouping; onGrouping: (mode: AssetGrouping) => void;
  search: string; onSearch: (value: string) => void; onOpen: (group: AssetGroup) => void; onAll: () => void; disabled: boolean;
}) {
  const groups = overview[grouping].filter(group => matchesSearchText(`${group.label} ${group.description}`, search));
  return <section aria-label="Nhóm tài sản" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Nhóm tài sản theo" className="flex rounded-lg bg-muted p-1">{modes.map(mode => <Button key={mode.value} variant={grouping === mode.value ? "secondary" : "ghost"} className="min-h-10 gap-1.5 px-2.5 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm sm:px-3" aria-pressed={grouping === mode.value} disabled={disabled} onClick={() => onGrouping(mode.value)}><mode.icon aria-hidden="true" className="size-4" />{mode.label}</Button>)}</div>
      <Button variant="ghost" className="min-h-10" onClick={onAll} disabled={disabled}>Xem tất cả<ChevronRight aria-hidden="true" className="size-4" /></Button>
    </div>
    {(grouping !== "byCategory" || overview[grouping].length > 12) && <Input aria-label="Tìm nhóm tài sản" placeholder={grouping === "byEmployee" ? "Tìm người sử dụng…" : grouping === "byLocation" ? "Tìm vị trí…" : "Tìm loại tài sản…"} value={search} onChange={e => onSearch(e.target.value)} className="max-w-md text-base" />}
    {!groups.length ? <EmptyPanel title={search ? "Không có nhóm phù hợp" : overview.total ? "Chưa có nhóm tài sản" : "Chưa có hồ sơ tài sản"} description={search ? "Thử từ khóa khác." : undefined} /> : <div className={grouping === "byCategory" ? "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "divide-y overflow-hidden rounded-xl border bg-card"}>{groups.map(group => <Button key={group.id} variant={grouping === "byCategory" ? "outline" : "ghost"} data-group-id={group.id} aria-label={`Mở nhóm ${group.label}`} disabled={disabled} onClick={() => onOpen(group)} className={cn("group w-full justify-between gap-4 text-left whitespace-normal hover:bg-muted/40 hover:text-foreground", grouping === "byCategory" ? "h-full min-h-40 flex-col items-stretch rounded-xl border-border bg-card p-5 hover:border-primary/40" : "h-auto min-h-16 rounded-none p-4")}>
      <span className="flex min-w-0 items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">{grouping === "byCategory" ? <AssetCategoryIcon code={group.icon} className="size-6" /> : grouping === "byEmployee" ? <Users aria-hidden="true" className="size-6 text-muted-foreground" /> : <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />}</span><span className="min-w-0 flex-1"><span className="line-clamp-2 break-words text-base font-semibold">{group.label}</span>{group.description && <span className="mt-1 line-clamp-2 break-words text-xs font-normal text-muted-foreground">{group.description}</span>}</span></span>
      <span className={cn("flex items-end justify-between", grouping !== "byCategory" && "shrink-0 gap-4")}><span className="flex items-baseline gap-2"><span className={cn("font-semibold tabular-nums", grouping === "byCategory" ? "text-3xl" : "text-base")}>{group.count.toLocaleString("vi-VN")}</span><span className="text-sm font-normal text-muted-foreground">tài sản</span></span><ChevronRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
    </Button>)}</div>}
  </section>;
}
