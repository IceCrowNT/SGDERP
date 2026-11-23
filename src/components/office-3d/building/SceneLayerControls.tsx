"use client";
import { EyeOff, Package, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BuildingData } from "@/lib/office-3d/building-mapping";
import type { AssetSceneCategory, SceneLayers } from "@/lib/office-3d/scene-filter";

export function SceneLayerControls({ building, layers, onToggle, onCategory, disabled, showRoomLabels, onRoomLabels }: {
  showRoomLabels: boolean; onRoomLabels: (value: boolean) => void;
  building: BuildingData; layers: SceneLayers; disabled: boolean;
  onToggle: (layer: "people" | "assets") => void;
  onCategory: (category: AssetSceneCategory | null) => void;
}) {
  return <div role="group" aria-label="Lớp hiển thị 3D" className="flex shrink-0 rounded-lg border border-border/60 bg-card/95 p-0.5">
    {([{ key: "people", label: "nhân sự", allowed: building.canViewEmployees, Icon: Users },
      { key: "assets", label: "tài sản", allowed: building.canViewAssets, Icon: Package }] as const)
      .filter(layer => layer.allowed).map(({ key, label, Icon }) => <Button key={key} disabled={disabled}
        size="icon" variant={layers[key] ? "secondary" : "ghost"} className="relative size-10 hover:bg-muted hover:text-foreground dark:hover:bg-muted"
        aria-label={`Hiển thị ${label}`} title={`${layers[key] ? "Ẩn" : "Hiện"} ${label}`} aria-pressed={layers[key]}
        onClick={() => onToggle(key)}><Icon className="size-4" />
        {!layers[key] && <EyeOff aria-hidden="true" className="absolute bottom-1 right-1 size-3 rounded bg-card text-muted-foreground" />}
      </Button>)}
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon" variant={layers.assets && layers.category ? "secondary" : "ghost"}
        className="size-10" disabled={disabled} aria-label="Tùy chọn hiển thị"
        title="Tùy chọn hiển thị">
        <SlidersHorizontal className="size-4" />
      </Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
        <DropdownMenuCheckboxItem className="min-h-10" checked={showRoomLabels} onCheckedChange={onRoomLabels}>Tên phòng</DropdownMenuCheckboxItem>
        {building.canViewAssets && <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Loại tài sản</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={layers.category ? `category:${layers.category.code}` : "all"}
          onValueChange={value => onCategory(building.assetCategories?.find(category => `category:${category.code}` === value) ?? null)}>
          <DropdownMenuRadioItem disabled={!layers.assets} className="min-h-10" value="all">Tất cả loại tài sản</DropdownMenuRadioItem>
          {building.assetCategories?.map(category => <DropdownMenuRadioItem disabled={!layers.assets} className="min-h-10" key={category.code} value={`category:${category.code}`}>{category.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
