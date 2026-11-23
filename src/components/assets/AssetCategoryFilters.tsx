import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AssetCategoryIcon } from "./AssetCategoryIcon";
import type { AssetGroup } from "./types";

export function AssetCategoryFilters({ groups, value, onChange, disabled }: {
  groups: AssetGroup[]; value?: number; onChange: (id?: number) => void; disabled: boolean;
}) {
  return <div role="group" aria-label="Lọc theo loại tài sản" className="flex min-w-0 items-center gap-2">
    <Button className="min-h-10 shrink-0" variant={!value ? "secondary" : "ghost"} aria-pressed={!value} disabled={disabled} onClick={() => onChange()}>Tất cả</Button>
    <div className="hidden min-w-0 items-center gap-1 xl:flex">
      {groups.slice(0, 3).map(g => <Button key={g.id} aria-label={`Lọc loại ${g.label}`} title={g.label} className="min-h-10 min-w-0 max-w-44" variant={value === g.query.categoryId ? "secondary" : "ghost"} aria-pressed={value === g.query.categoryId} disabled={disabled} onClick={() => onChange(g.query.categoryId)}><AssetCategoryIcon code={g.icon} className="size-4 shrink-0" /><span className="truncate">{g.label}</span></Button>)}
    </div>
    <div className="min-w-0 max-w-xs flex-1"><SearchableSelect className="h-10 [&>span>span]:truncate [&>span>span]:whitespace-nowrap [&>span>span+span]:hidden" label="Chọn loại tài sản" placeholder="Chọn loại…" searchPlaceholder="Tìm tên hoặc mã loại…" disabled={disabled} value={value ? String(value) : undefined} onValueChange={v => onChange(Number(v))} options={groups.map(g => ({ value: String(g.query.categoryId), label: g.label, keywords: g.icon, description: `${g.count} tài sản${g.description ? ` · ${g.description}` : ""}`, icon: <AssetCategoryIcon code={g.icon} className="size-4" /> }))} /></div>
  </div>;
}
