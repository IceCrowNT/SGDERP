"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, Users, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { scopedRooms, sceneSuggestions, type AssetSceneCategory, type SceneSuggestion } from "@/lib/office-3d/scene-filter";
import type { FloorSelection } from "@/lib/office-3d/building-layout";

export function SceneSearch({ building, onSelect, disabled }: {
  building: BuildingData; onSelect: (item: SceneSuggestion) => void; disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { items, more } = useMemo(() => sceneSuggestions(building, query), [building, query]);
  const expanded = open && Boolean(query.trim()) && !disabled;
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);
  function select(item: SceneSuggestion) {
    setQuery("");
    setOpen(false);
    onSelect(item);
  }
  return <div ref={root} className="relative min-w-0 min-[380px]:static sm:relative" data-testid="scene-search"
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/95 p-0.5">
      <Search aria-hidden="true" className="ml-2 size-4 shrink-0 text-muted-foreground" />
      <Input ref={input} role="combobox" aria-label="Tìm nhân sự hoặc tài sản" aria-autocomplete="list"
        aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && items[active] ? `${listId}-${active}` : undefined}
        autoComplete="off" placeholder="Tìm người, tài sản…" disabled={disabled} value={query}
        className="h-10 min-w-0 flex-1 border-0 shadow-none"
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(Boolean(event.target.value.trim())); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape" && expanded) {
            event.preventDefault(); event.stopPropagation(); setOpen(false);
          } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && query.trim()) {
            event.preventDefault(); setOpen(true);
            const next = expanded ? (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length) : 0;
            setActive(next);
            document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
          } else if (event.key === "Enter" && expanded) {
            event.preventDefault(); if (items[active]) select(items[active]);
          } else if (event.key === "Tab") setOpen(false);
        }} />
      {query && <Button disabled={disabled} variant="ghost" size="icon" className="size-10 shrink-0"
        aria-label="Xóa nội dung tìm kiếm" title="Xóa nội dung tìm kiếm"
        onClick={() => { setQuery(""); setOpen(false); input.current?.focus(); }}><X className="size-4" /></Button>}
    </div>
    {expanded && <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
      <div id={listId} role="listbox" aria-label="Gợi ý đối tượng 3D" className="max-h-64 overflow-y-auto overscroll-contain">
        {items.map((item, index) => <Button key={`${item.kind}:${item.id}`} id={`${listId}-${index}`} role="option"
          aria-label={item.name} aria-describedby={`${listId}-${index}-detail`} aria-selected={index === active} variant="ghost" tabIndex={-1}
          className={cn("h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left hover:bg-muted hover:text-foreground dark:hover:bg-muted", index === active && "bg-muted text-foreground")}
          onMouseDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => select(item)}>
          {item.kind === "person" ? <Users className="size-4 shrink-0" /> : <Package className="size-4 shrink-0" />}
          <span className="min-w-0"><span className="block break-words">{item.name}</span>
            <span id={`${listId}-${index}-detail`} className="mt-1 line-clamp-2 text-xs font-normal text-muted-foreground">{item.description}</span></span>
        </Button>)}
      </div>
      {!items.length && <p role="status" className="p-3 text-sm text-muted-foreground">Không tìm thấy kết quả phù hợp.</p>}
      {more && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Nhập cụ thể hơn để thu hẹp kết quả.</p>}
    </div>}
  </div>;
}

export function SceneFilterResults({ building, category, floor, room, onRecord, onRoom, onClear }: {
  building: BuildingData; category: AssetSceneCategory; floor: FloorSelection; room: string | null;
  onRecord: (point: string, id: number, kind: "person" | "asset") => void;
  onRoom: (key: string) => void; onClear: () => void;
}) {
  const rooms = scopedRooms(building, floor, room);
  const records = rooms.flatMap(r => (building.canViewAssets ? r.assets ?? [] : [])
    .filter(a => a.categoryCode === category.code)
    .map(a => ({ ...a, roomKey: r.key, roomName: r.name })));
  const title = category.name;
  return <section aria-label="Kết quả lọc 3D" className="space-y-3">
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{title} · {records.length}</h3>
      <Button variant="ghost" size="sm" onClick={onClear}>Bỏ lọc</Button></div>
    <p role="status" className="text-sm text-muted-foreground">{room ? rooms[0]?.name : floor === "all" ? "Toàn tòa nhà" : `Tầng ${floor}`} · {records.filter(r => r.pointKey).length} hồ sơ có điểm trên mô hình</p>
    {!records.length && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa có tài sản loại này được gán trong không gian đang xem.</p>}
    {records.map(r => <Button key={r.id} variant="outline"
      className="h-auto min-h-12 w-full justify-start whitespace-normal p-3 text-left"
      onClick={() => r.pointKey ? onRecord(r.pointKey, r.id, "asset") : onRoom(r.roomKey)}>
      <Package className="size-4 shrink-0"/>
      <span className="min-w-0"><span className="block break-words">{r.name}</span>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{room ? r.location : `${r.roomName} · ${r.location}`}</span>
        {!r.pointKey && <span className="mt-1 block text-xs font-normal text-muted-foreground">Chưa có điểm mô hình · Xem phòng</span>}
      </span>
    </Button>)}
    <p className="text-xs leading-5 text-muted-foreground">Giữ sàn, tường và bàn để dễ định hướng. Số lượng thiết bị lấy từ hồ sơ.</p>
  </section>;
}
