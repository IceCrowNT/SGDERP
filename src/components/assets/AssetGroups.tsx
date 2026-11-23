import { Users, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { matchesSearchText } from "@/lib/search-text";
import type { AssetGroup, AssetOverview } from "./types";

export type AssetGrouping = "byCategory" | "byEmployee" | "byLocation";

export function AssetGroups({ overview, grouping, search, onSearch, onOpen, onAll, disabled }: {
  overview: AssetOverview; grouping: AssetGrouping;
  search: string; onSearch: (value: string) => void; onOpen: (group: AssetGroup) => void; onAll: () => void; disabled: boolean;
}) {
  const groups = overview[grouping].filter(group => matchesSearchText(`${group.label} ${group.description}`, search));
  return <section aria-label="Nhóm tài sản" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Input aria-label="Tìm nhóm tài sản" placeholder={grouping === "byEmployee" ? "Tìm người sử dụng…" : "Tìm vị trí…"} value={search} onChange={e => onSearch(e.target.value)} className="max-w-md text-base" />
      <Button variant="ghost" className="min-h-10" onClick={onAll} disabled={disabled}>Xem tất cả<ChevronRight aria-hidden="true" className="size-4" /></Button>
    </div>
    {!groups.length ? <EmptyPanel title={search ? "Không có nhóm phù hợp" : overview.total ? "Chưa có nhóm tài sản" : "Chưa có hồ sơ tài sản"} description={search ? "Thử từ khóa khác." : undefined} /> : <div className="divide-y overflow-hidden rounded-xl border bg-card">{groups.map(group => <Button key={group.id} variant="ghost" data-group-id={group.id} aria-label={`Mở nhóm ${group.label}`} disabled={disabled} onClick={() => onOpen(group)} className="h-auto min-h-16 w-full justify-between gap-4 rounded-none p-4 text-left whitespace-normal hover:bg-muted/40 hover:text-foreground">
      <span className="flex min-w-0 items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">{grouping === "byEmployee" ? <Users aria-hidden="true" className="size-6 text-muted-foreground" /> : <MapPin aria-hidden="true" className="size-6 text-muted-foreground" />}</span><span className="min-w-0 flex-1"><span className="line-clamp-2 break-words text-base font-semibold">{group.label}</span>{group.description && <span className="mt-1 line-clamp-2 break-words text-xs font-normal text-muted-foreground">{group.description}</span>}</span></span>
      <span className="flex shrink-0 items-center gap-3"><span className="font-semibold tabular-nums">{group.count.toLocaleString("vi-VN")}</span><ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" /></span>
    </Button>)}</div>}
  </section>;
}
