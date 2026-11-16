"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { getLocationForEdit } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocationForm } from "./LocationForm";

export function LocationEditDialog({ locationId }: { locationId: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" className="min-h-10"><Pencil className="size-4" />Sửa thông tin vị trí</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg"
      showCloseButton={!busy} onInteractOutside={event => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>Sửa thông tin vị trí</DialogTitle>
        <DialogDescription>Cập nhật tên và mô tả ngay tại vị trí đang chọn.</DialogDescription>
      </DialogHeader>
      {open && <LocationEditor key={locationId} locationId={locationId} onBusy={setBusy} onClose={() => { setBusy(false); setOpen(false); }} />}
    </DialogContent>
  </Dialog>;
}

export function LocationEditor({ locationId, onBusy, onClose }: {
  locationId: number; onBusy: (busy: boolean) => void; onClose: () => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<Awaited<ReturnType<typeof getLocationForEdit>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getLocationForEdit(locationId).then(value => { if (!cancelled) setResult(value); })
      .catch(() => { if (!cancelled) setResult({ success: false, message: "Không thể tải thông tin vị trí. Vui lòng thử lại." }); });
    return () => { cancelled = true; };
  }, [locationId, attempt]);
  if (!result) return <p role="status" className="text-sm text-muted-foreground">Đang tải thông tin vị trí…</p>;
  if (!result.success) return <div className="space-y-3">
    <p role="alert" className="text-sm text-destructive">{result.message}</p>
    <Button variant="outline" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>Thử lại</Button>
  </div>;
  return <LocationForm rows={[result.row]} editing={{ row: result.row, parentId: result.row.parent_id }}
    informationOnly onCancel={onClose} onBusy={onBusy}
    onSaved={() => { onClose(); router.refresh(); }} />;
}
