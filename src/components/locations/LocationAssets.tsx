"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, MapPin, Package, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { assignAssetLocation, getAssetLocationCandidates } from "@/actions/asset";
import { getLocationOptions } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ASSET_CONDITIONS } from "@/lib/asset-labels";
import { isAvailableAssetLocation, type AssetLocation, type LocationAsset } from "@/lib/asset-location";
import { locationPath } from "@/lib/location-tree";
import { cn } from "@/lib/utils";

type Candidate = LocationAsset & { locationName: string };
type Destination = { id: number; name: string };
type Picker = { kind: "asset" }
  | { kind: "location"; asset: Candidate }
  | { kind: "confirm"; asset: Candidate; target: Destination | null };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

export function LocationAssets({ location, assets, canManage, selectedAssetId }: {
  location: Destination & { active: boolean };
  assets: LocationAsset[];
  canManage: boolean;
  selectedAssetId?: number | null;
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [locations, setLocations] = useState<AssetLocation[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const kind = picker?.kind;
  const orderedAssets = selectedAssetId
    ? [...assets].sort((a, b) => Number(b.id === selectedAssetId) - Number(a.id === selectedAssetId))
    : assets;

  useEffect(() => {
    if (!canManage || (kind !== "asset" && kind !== "location")) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (kind === "asset") {
          const result = await getAssetLocationCandidates({ search, page });
          if (cancelled) return;
          if (!result.success) throw Error(result.message);
          setCandidates(result.rows);
          setHasMore(result.hasMore);
        } else {
          const result = await getLocationOptions();
          if (cancelled) return;
          if (!result.success) throw Error(result.message);
          setLocations(result.rows);
        }
        setLoadError("");
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally { if (!cancelled) setLoading(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [kind, search, page, retry, canManage]);

  function open(value: Picker) {
    setSearch(""); setPage(1); setError(""); setLoadError("");
    setLoading(value.kind !== "confirm"); setPicker(value);
  }
  function save(asset: Candidate, target: Destination | null, confirmMove = false) {
    setError("");
    start(async () => {
      try {
        const result = await assignAssetLocation({ assetId: asset.id, locationId: target?.id ?? null, version: asset.version, confirmMove });
        if (!result.success) {
          setError(result.message);
          if ("code" in result && result.code === "STALE") { setPicker(null); router.refresh(); }
          return;
        }
        toast.success(result.message); setPicker(null); router.refresh();
      } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    });
  }
  function choose(asset: Candidate, target: Destination | null) {
    if (asset.locationId === (target?.id ?? null)) return;
    if (asset.locationId !== null) open({ kind: "confirm", asset, target });
    else save(asset, target);
  }
  const destinations = locations.filter(row => isAvailableAssetLocation(row.id, locations)
    && normalize(locationPath(row.id, locations)).includes(normalize(search)));

  return (
    <section aria-label="Tài sản tại vị trí" className="mb-5 space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><Package className="size-4" />Tài sản tại vị trí <Badge variant="secondary">{assets.length}</Badge></h3>
        {canManage && location.active && <Button variant="outline" className="min-h-10" disabled={pending} onClick={() => open({ kind: "asset" })}><Plus className="size-4" />Gán tài sản</Button>}
      </div>
      {!assets.length && <p className="text-sm text-muted-foreground">Chưa có tài sản được gán trực tiếp tại đây.</p>}
      <ul className="max-h-96 space-y-2 overflow-y-auto">
        {orderedAssets.map(asset => (
          <li key={asset.id}
            aria-current={asset.id === selectedAssetId ? "true" : undefined}
            className={cn("space-y-2 rounded-xl border p-3", asset.id === selectedAssetId && "border-primary bg-primary/5")}>
            <p className="break-words font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.code} · {asset.category}</p>
            <Badge variant="secondary">{ASSET_CONDITIONS[asset.condition]}</Badge>
            {canManage && <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="min-h-10" disabled={pending} onClick={() => open({ kind: "location", asset: { ...asset, locationName: location.name } })}><ArrowRightLeft className="size-4" />Chuyển tài sản</Button>
              <Button variant="ghost" size="sm" className="min-h-10" disabled={pending} onClick={() => choose({ ...asset, locationName: location.name }, null)}><X className="size-4" />Bỏ gán tài sản</Button>
            </div>}
          </li>
        ))}
      </ul>
      {error && !picker && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Dialog open={Boolean(picker)} onOpenChange={value => { if (!value && !pending) setPicker(null); }}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{kind === "asset" ? "Gán tài sản" : kind === "location" ? "Chọn vị trí cho tài sản" : picker?.kind === "confirm" && !picker.target ? "Bỏ gán tài sản?" : "Chuyển vị trí tài sản?"}</DialogTitle>
            <DialogDescription>{kind === "asset" ? `Chọn thiết bị đặt tại ${location.name}.` : "Đổi nơi đặt thiết bị; người sử dụng và phòng quản lý được giữ nguyên."}</DialogDescription>
          </DialogHeader>
          {kind !== "confirm" && <Input autoFocus maxLength={120} aria-label={kind === "asset" ? "Tìm tài sản để gán" : "Tìm vị trí cho tài sản"} placeholder={kind === "asset" ? "Tên, mã hoặc serial…" : "Tên vị trí…"} value={search} onChange={e => { setSearch(e.target.value); setPage(1); setLoading(true); }} className="text-base" />}
          {kind !== "confirm" && loading && <div role="status" aria-label="Đang tải lựa chọn tài sản" className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>}
          {kind !== "confirm" && !loading && loadError && <div role="alert" className="space-y-2 text-sm"><p>{loadError}</p><Button variant="outline" onClick={() => { setLoading(true); setRetry(v => v + 1); }}>Thử lại</Button></div>}
          {kind === "asset" && !loading && !loadError && <div className="space-y-2">
            {!candidates.length && <p className="text-sm text-muted-foreground">Không tìm thấy tài sản phù hợp.</p>}
            {candidates.map(asset => <Button key={asset.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" disabled={pending || asset.locationId === location.id} aria-label={`Gán tài sản ${asset.name}`} onClick={() => choose(asset, location)}>
              <Package className="size-4 shrink-0" /><span className="min-w-0"><span className="block font-medium">{asset.name}</span><span className="block text-xs font-normal text-muted-foreground">{asset.code} · {asset.category} · {ASSET_CONDITIONS[asset.condition]}</span><span className="mt-1 block break-words text-xs font-normal">{asset.locationId === location.id ? "Đã được gán tại đây" : asset.locationName}</span></span>
            </Button>)}
            <div className="flex items-center justify-between gap-2 pt-2"><Button variant="outline" disabled={page === 1 || pending} onClick={() => { setLoading(true); setPage(v => v - 1); }}>Trước</Button><span className="text-sm">Trang {page}</span><Button variant="outline" disabled={!hasMore || pending} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Tiếp</Button></div>
          </div>}
          {picker?.kind === "location" && !loading && !loadError && <div className="space-y-2">
            {!destinations.length && <p className="text-sm text-muted-foreground">Không tìm thấy vị trí đang sử dụng phù hợp.</p>}
            {destinations.map(row => <Button key={row.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" disabled={pending || row.id === picker.asset.locationId} onClick={() => choose(picker.asset, { id: row.id, name: locationPath(row.id, locations) })}><MapPin className="size-4 shrink-0" /><span>{locationPath(row.id, locations)}</span></Button>)}
          </div>}
          {picker?.kind === "confirm" && <>
            <p className="font-medium">{picker.asset.name} · {picker.asset.code}</p>
            <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm"><p>{picker.asset.locationName}</p><ArrowRight aria-label="Chuyển đến" className="size-4" /><p className="font-medium">{picker.target?.name ?? "Chưa xác định vị trí"}</p></div>
            <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setPicker(null)}>Hủy</Button><Button disabled={pending} onClick={() => save(picker.asset, picker.target, true)}>{pending ? "Đang lưu…" : picker.target ? "Xác nhận chuyển tài sản" : "Xác nhận bỏ gán tài sản"}</Button></div>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
