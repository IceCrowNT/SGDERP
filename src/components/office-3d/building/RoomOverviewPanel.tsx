"use client";

import { ArrowUpRight, ChevronRight, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AssetCategoryIcon } from "@/components/assets/AssetCategoryIcon";
import { ASSET_CONDITIONS } from "@/lib/asset-labels";
import type { BuildingRoomData, BuildingAsset } from "@/lib/office-3d/building-mapping";

export type RoomTab = "people" | "assets";

export function RoomOverviewPanel({ room, placed, canViewEmployees, canViewAssets, tab, onTabChange,
  onEnter, onPerson, onAsset }: {
  room: BuildingRoomData;
  placed: boolean;
  canViewEmployees: boolean;
  canViewAssets: boolean;
  tab?: RoomTab;
  onTabChange: (tab: RoomTab) => void;
  onEnter?: () => void;
  onPerson: (point: string, id: number) => void;
  onAsset: (point: string, id: number) => void;
}) {
  const people = room.occupants ?? [], assets = room.assets ?? [];
  const activeTab = tab === "assets" && canViewAssets ? "assets" : canViewEmployees ? "people" : "assets";
  const groups = new Map<string, BuildingAsset[]>();
  const names = new Map<string, number>();
  for (const asset of assets) {
    groups.set(asset.categoryCode, [...(groups.get(asset.categoryCode) ?? []), asset]);
    names.set(asset.name, (names.get(asset.name) ?? 0) + 1);
  }
  function assetRow(asset: BuildingAsset) {
    const info = <>
      <AssetCategoryIcon code={asset.categoryCode} className="size-4" />
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium">{asset.name}</span>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{asset.location}{names.get(asset.name)! > 1 ? ` · ${asset.code}` : ""}</span>
        {asset.condition !== "BINH_THUONG" && <Badge variant="secondary" className="mt-1 whitespace-normal text-left">{ASSET_CONDITIONS[asset.condition]}</Badge>}
      </span>
    </>;
    return <li key={asset.id}>
      {asset.pointKey ? <Button variant="ghost" className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-2 py-3 text-left"
        aria-label={`Xem vị trí tài sản ${asset.name}${names.get(asset.name)! > 1 ? ` ${asset.code}` : ""}`}
        onClick={() => onAsset(asset.pointKey!, asset.id)}>{info}<ChevronRight className="size-4 shrink-0 text-muted-foreground" /></Button>
        : <details className="rounded-lg px-2 py-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 rounded focus-visible:outline-ring">{info}<ChevronRight className="size-4 shrink-0 text-muted-foreground" /></summary>
          <div className="space-y-1 pt-3 text-sm"><p>{asset.code} · {asset.category}</p>{asset.condition === "BINH_THUONG" && <p>{ASSET_CONDITIONS[asset.condition]}</p>}<p className="text-xs text-muted-foreground">Vị trí này chưa có điểm chọn trên mô hình.</p></div>
        </details>}
    </li>;
  }
  return <section className="space-y-4" aria-label="Thông tin phòng" aria-live="polite">
    {room.state !== "active" && <p role="status" className="rounded-lg border p-3 text-sm">
      {room.state === "inactive" ? "Phòng hoặc tầng đã ngừng sử dụng." : "Bố cục tham khảo · Chưa có dữ liệu vị trí."}
    </p>}
    {!placed && <p className="text-sm text-muted-foreground">Chưa xác định vị trí trên mặt bằng mới.</p>}
    {onEnter && <Button variant="outline" className="min-h-11 w-full" onClick={onEnter}>Vào phòng<ArrowUpRight className="size-4" /></Button>}
    {room.state === "active" && (canViewEmployees || canViewAssets) && <Tabs value={activeTab} onValueChange={value => onTabChange(value as RoomTab)}>
      <TabsList className="w-full min-h-11" aria-label="Dữ liệu trong phòng">
        {canViewEmployees && <TabsTrigger value="people" className="min-h-10 text-foreground"><Users className="size-4" />Nhân sự · {people.length}</TabsTrigger>}
        {canViewAssets && <TabsTrigger value="assets" className="min-h-10 text-foreground"><Package className="size-4" />Tài sản · {assets.length}</TabsTrigger>}
      </TabsList>
      {canViewEmployees && <TabsContent value="people">
        {people.length ? <ul className="divide-y" aria-label="Nhân sự đã gán trong phòng">{people.map(person => <li key={person.id}>
          {person.pointKey ? <Button variant="ghost" className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal px-2 py-3 text-left"
            aria-label={`Xem vị trí của ${person.name}`} onClick={() => onPerson(person.pointKey!, person.id)}>
            <span className="min-w-0 flex-1 break-words font-medium">{person.name}</span>
            <span className="max-w-[40%] text-right text-xs font-normal text-muted-foreground">{person.location}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Button> : <details className="px-2 py-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded focus-visible:outline-ring"><span className="min-w-0 flex-1 break-words text-sm font-medium">{person.name}</span><span className="max-w-[40%] text-right text-xs text-muted-foreground">{person.location}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></summary>
            <div className="space-y-1 pt-3 text-sm"><p>{[person.position, person.department].filter(Boolean).join(" · ") || "Chưa có thông tin chức vụ/phòng ban."}</p><p className="text-xs text-muted-foreground">Vị trí này chưa có điểm chọn trên mô hình.</p></div>
          </details>}
        </li>)}</ul> : <p className="px-2 py-4 text-sm text-muted-foreground">Chưa có nhân sự đang làm việc được gán trong phòng.</p>}
      </TabsContent>}
      {canViewAssets && <TabsContent value="assets">
        {!assets.length ? <p className="px-2 py-4 text-sm text-muted-foreground">Chưa có hồ sơ tài sản được gán trong phòng.</p>
          : assets.length > 12 && groups.size > 1 ? <div className="space-y-2">{Array.from(groups, ([code, rows]) => <details key={code} className="rounded-lg border p-2" open>
            <summary className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium"><AssetCategoryIcon code={code} className="size-4" />{rows[0].category}<span className="ml-auto text-muted-foreground">{rows.length}</span></summary><ul className="divide-y">{rows.map(assetRow)}</ul>
          </details>)}</div> : <ul className="divide-y" aria-label="Tài sản đã gán trong phòng">{assets.map(assetRow)}</ul>}
      </TabsContent>}
    </Tabs>}
    {room.description && <details className="border-t pt-3"><summary className="min-h-10 cursor-pointer rounded py-2 text-sm font-medium focus-visible:outline-ring">Ghi chú phòng</summary><p className="whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">{room.description}</p></details>}
  </section>;
}
