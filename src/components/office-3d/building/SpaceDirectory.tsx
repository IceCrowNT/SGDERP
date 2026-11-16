"use client";
import { useState } from "react";
import { ChevronRight, DoorOpen, Layers3, MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUILDING_ROOMS, type FloorSelection } from "@/lib/office-3d/building-layout";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import { matchesSearchText } from "@/lib/search-text";

const shapes = new Map(BUILDING_ROOMS.map(room => [room.key, room]));

export function SpaceDirectory({ building, floor, selected, forceOpen, onSelect }: {
  building: BuildingData; floor: FloorSelection; selected: string | null;
  forceOpen: boolean; onSelect: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const groups = building.floors.filter(f => floor === "all" || f.floor === floor).map(f => ({
    ...f, rooms: building.rooms.filter(room => {
      const shape = shapes.get(room.key);
      // Keep working rooms and linked locations; auxiliary geometry is context,
      // not another department to browse. Do not hide a real managed location.
      return shape?.floor === f.floor
        && (room.state !== "unlinked" || shape.kind === "room" || shape.kind === "reception")
        && matchesSearchText(room.name, query);
    }),
  })).filter(f => f.rooms.length);
  return <section aria-label="Danh sách không gian" className="space-y-3">
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input aria-label="Tìm không gian trong mô hình" placeholder="Tìm không gian…" value={query}
        className="h-10 pl-9 pr-10 shadow-none" onChange={event => setQuery(event.target.value)} />
      {query && <Button variant="ghost" size="icon" className="absolute right-0 top-0 size-10" aria-label="Xóa tìm kiếm không gian"
        onClick={() => setQuery("")}><X className="size-4" /></Button>}
    </div>
    <div className="divide-y">
      {groups.map(group => <details key={`${group.floor}:${query.trim()}:${forceOpen}`} data-testid={`spaces-floor-${group.floor}`}
        open={floor !== "all" || Boolean(query.trim()) || forceOpen} className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-md py-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          <Layers3 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{group.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">{group.rooms.length} không gian</span>
        </summary>
        <ul className="mb-2 space-y-1 border-l pl-2">
          {group.rooms.map(room => {
            const shape = shapes.get(room.key)!;
            const Icon = shape.kind === "room" ? DoorOpen : MapPin;
            const note = room.state === "inactive" ? "Ngừng sử dụng"
              : !shape.placed ? "Chưa xác định trên mặt bằng"
              : room.state === "unlinked" ? "Không gian tham khảo" : null;
            return <li key={room.key}><Button variant={selected === room.key ? "secondary" : "ghost"}
              aria-label={`Xem không gian ${room.name}, tầng ${group.floor}`} aria-pressed={selected === room.key}
              className="h-auto min-h-11 w-full justify-start whitespace-normal px-2 py-2 text-left hover:bg-muted hover:text-foreground dark:hover:bg-muted"
              onClick={() => onSelect(room.key)}>
              <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0"><span className="block break-words">{room.name}</span>
                {note && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{note}</span>}
              </span>
            </Button></li>;
          })}
        </ul>
      </details>)}
      {!groups.length && <p role="status" className="py-3 text-sm text-muted-foreground">{query.trim() ? "Không tìm thấy không gian phù hợp." : "Chưa có không gian trong phạm vi này."}</p>}
    </div>
  </section>;
}
