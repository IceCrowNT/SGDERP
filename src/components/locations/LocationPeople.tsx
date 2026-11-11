"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowRightLeft, MapPin, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { assignEmployeeLocation } from "@/actions/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { locationPath, type LocationRow } from "@/lib/location-tree";
import { isAvailableWorkLocation, type LocationEmployee } from "@/lib/work-location";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
type Picker =
  | { kind: "person"; }
  | { kind: "location"; person: LocationEmployee; }
  | { kind: "confirm"; person: LocationEmployee; target: LocationRow | null; };

export function LocationPeople({ location, locations, people, canManage }: {
  location: LocationRow;
  locations: LocationRow[];
  people: LocationEmployee[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const assigned = people.filter((p) => p.locationId === location.id);
  const available = isAvailableWorkLocation(location.id, locations);
  const path = (id: number | null) => id === null ? "Chưa xác định vị trí" : locationPath(id, locations);
  function open(value: Picker) { setSearch(""); setError(""); setPicker(value); }
  function save(person: LocationEmployee, target: LocationRow | null, confirmed = false) {
    setError("");
    start(async () => {
      try {
        const result = await assignEmployeeLocation({ employeeId: person.id, locationId: target?.id ?? null, version: person.version, confirmMove: confirmed });
        if (!result.success) {
          setError(result.message);
          if ("code" in result && result.code === "STALE") {
            setPicker(null);
            router.refresh();
          }
          return;
        }
        toast.success(result.message);
        setPicker(null);
        router.refresh();
      } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    });
  }
  function choose(person: LocationEmployee, target: LocationRow | null) {
    if (person.locationId === target?.id) return;
    if (person.locationId !== null) open({ kind: "confirm", person, target });
    else save(person, target);
  }
  const candidates = people.filter((p) => p.status === "ACTIVE" && normalize(`${p.name} ${p.department ?? ""}`).includes(normalize(search)));
  const destinations = locations.filter((l) => isAvailableWorkLocation(l.id, locations) && normalize(path(l.id)).includes(normalize(search)));
  return (
    <section aria-label="Nhân sự tại vị trí" className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><Users className="size-4" />Nhân sự tại vị trí <Badge variant="secondary">{assigned.length}</Badge></h3>
        {canManage && available && <Button variant="outline" className="min-h-10" onClick={() => open({ kind: "person" })}><UserPlus className="size-4" />Gán nhân sự</Button>}
      </div>
      {!assigned.length && <p className="text-sm text-muted-foreground">Chưa có nhân sự được gán trực tiếp tại đây.</p>}
      <ul className="space-y-2">
        {assigned.map((person) => (
          <li key={person.id} className="space-y-2 rounded-xl border p-3">
            <div className="min-w-0"><p className="break-words font-medium">{person.name}</p><p className="text-sm text-muted-foreground">{person.department ?? "Chưa có phòng ban"}</p></div>
            {person.status !== "ACTIVE" && <Badge variant="secondary">{person.status === "LEFT" ? "Đã nghỉ việc" : "Chưa xác nhận"}</Badge>}
            {canManage && <div className="flex flex-wrap gap-2">
              {person.status === "ACTIVE" && <Button variant="outline" size="sm" className="min-h-10" disabled={pending} onClick={() => open({ kind: "location", person })}><ArrowRightLeft className="size-4" />Chuyển vị trí</Button>}
              <Button variant="ghost" size="sm" className="min-h-10" disabled={pending} onClick={() => choose(person, null)}><X className="size-4" />Bỏ gán</Button>
            </div>}
          </li>
        ))}
      </ul>
      {error && !picker && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Dialog open={Boolean(picker)} onOpenChange={(value) => { if (!value && !pending) setPicker(null); }}>
        <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{picker?.kind === "person" ? "Gán nhân sự" : picker?.kind === "location" ? "Chọn vị trí mới" : picker?.kind === "confirm" && !picker.target ? "Bỏ gán nhân sự?" : "Chuyển vị trí nhân sự?"}</DialogTitle>
            <DialogDescription>{picker?.kind === "person" ? `Chọn người làm việc tại ${location.ten_vi_tri}.` : picker?.kind === "location" ? `Chọn nơi làm việc mới cho ${picker.person.name}.` : "Kiểm tra thay đổi trước khi xác nhận."}</DialogDescription>
          </DialogHeader>
          {picker?.kind !== "confirm" && <Input autoFocus aria-label={picker?.kind === "person" ? "Tìm nhân sự để gán" : "Tìm vị trí mới"} placeholder={picker?.kind === "person" ? "Tìm tên hoặc phòng ban…" : "Tìm tên vị trí…"} value={search} onChange={(e) => setSearch(e.target.value)} className="text-base" />}
          {picker?.kind === "person" && <div className="space-y-2">
            {!candidates.length && <p className="text-sm text-muted-foreground">Không tìm thấy nhân sự đang làm việc phù hợp.</p>}
            {candidates.map((person) => <Button key={person.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" disabled={pending || person.locationId === location.id} onClick={() => choose(person, location)} aria-label={`Gán ${person.name}`}>
              <span className="min-w-0"><span className="block font-medium">{person.name}</span><span className="block text-xs font-normal text-muted-foreground">{person.department ?? "Chưa có phòng ban"}</span><span className="mt-1 block text-xs font-normal">{person.locationId === location.id ? "Đã được gán tại đây" : path(person.locationId)}</span></span>
            </Button>)}
          </div>}
          {picker?.kind === "location" && <div className="space-y-2">
            {!destinations.length && <p className="text-sm text-muted-foreground">Không có vị trí phù hợp.</p>}
            {destinations.map((row) => <Button key={row.id} variant="outline" className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left" disabled={pending || row.id === picker.person.locationId} onClick={() => choose(picker.person, row)}><MapPin className="size-4 shrink-0" /><span>{path(row.id)}{row.id === picker.person.locationId ? " · Vị trí hiện tại" : ""}</span></Button>)}
          </div>}
          {picker?.kind === "confirm" && <>
            <p className="font-medium">{picker.person.name}</p>
            <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm"><p>{path(picker.person.locationId)}</p><ArrowRight aria-label="Chuyển đến" className="size-4" /><p className="font-medium">{path(picker.target?.id ?? null)}</p></div>
            <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={pending} onClick={() => setPicker(null)}>Hủy</Button><Button disabled={pending} onClick={() => save(picker.person, picker.target, true)}>{pending ? "Đang lưu…" : picker.target ? "Chuyển vị trí" : "Xác nhận bỏ gán"}</Button></div>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
