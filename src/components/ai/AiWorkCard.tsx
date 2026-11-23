"use client";

import { useState, useTransition } from "react";
import { CheckCheck, ClipboardList, Loader2 } from "lucide-react";
import { approveAiWork, cancelAiWork, getAiWork, refreshAiWork } from "@/actions/ai-work";
import { type AiWorkView, type CategoryWorkView, workStatusLabels } from "@/lib/ai-work";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AiInventoryReceiptCard } from "./AiInventoryReceiptCard";

const monthsLabel = (value: number | null) => value === null ? "Chưa đặt" : `${value} tháng${value % 12 === 0 ? ` (${value / 12} năm)` : ""}`;
export function AiWorkCard(props: { work: AiWorkView; onChange: (work: AiWorkView) => void; onAdjust: (text: string) => void; canAdjust: boolean }) {
  return props.work.kind === "NHAP_VAT_TU" ? <AiInventoryReceiptCard key={props.work.id} work={props.work} onChange={props.onChange} /> : <CategoryWorkCard {...props} work={props.work} />;
}
function CategoryWorkCard({ work, onChange, onAdjust, canAdjust }: {
  work: CategoryWorkView; onChange: (work: AiWorkView) => void; onAdjust: (text: string) => void; canAdjust: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [allRows, setAllRows] = useState(false);
  const editable = work.status === "CHO_DUYET" || work.status === "CAN_LAM_MOI";
  const changed = work.snapshot.rows.filter(r => r.before !== work.snapshot.months).length;
  function run(operation: "approve" | "cancel" | "refresh" | "status" | "adjust") {
    if (pending) return;
    setError("");
    start(async () => {
      try {
        const input = { id: work.id, version: work.version };
        const result = operation === "approve" ? await approveAiWork(input) : operation === "refresh" ? await refreshAiWork(input)
          : operation === "status" ? await getAiWork({ id: work.id }) : await cancelAiWork(input);
        if (!result.success) { setError(result.message); setUncertain(true); return; }
        onChange(result.work); setUncertain(false);
        if (operation === "adjust" && result.work.status === "DA_HUY") onAdjust(`Đặt khấu hao mặc định cho tất cả loại tài sản thành ${work.snapshot.months} tháng`);
      } catch {
        setUncertain(true);
        setError("Chưa xác nhận được kết quả do mất kết nối. Tải trạng thái để biết công việc đã thực hiện hay chưa.");
      }
    });
  }
  return <article aria-label={`Công việc AI ${work.id}`} className="min-w-0 space-y-4 rounded-xl border bg-background p-3 sm:p-4" aria-busy={pending}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1"><p className="flex items-center gap-2 font-semibold"><ClipboardList className="size-4 shrink-0 text-primary" />Khấu hao mặc định loại tài sản</p>
        <p className="text-xs text-muted-foreground">{new Date(work.createdAt).toLocaleString("vi-VN")}</p></div>
      <span role="status" className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{pending ? "Đang xử lý…" : workStatusLabels[work.status]}</span>
    </div>
    <p className="text-sm">Đặt thành <strong>{monthsLabel(work.snapshot.months)}</strong> cho tất cả {work.snapshot.rows.length} loại, gồm cả loại ngừng dùng. <strong>{changed} loại cần đổi</strong>, {work.snapshot.rows.length - changed} loại giữ nguyên. Chỉ đổi mặc định của loại; khấu hao trên các tài sản đã có giữ nguyên.</p>
    {work.status === "CHO_DUYET" && <p className="text-sm text-muted-foreground">Chưa cập nhật dữ liệu. Bấm duyệt để áp dụng toàn bộ bảng này trong một lần.</p>}
    {work.status === "CAN_LAM_MOI" && <p role="alert" className="text-sm text-destructive">Danh mục đã thay đổi sau khi lập bảng. Chưa áp dụng công việc này. Làm mới bảng và kiểm tra lại trước khi duyệt.</p>}
    {work.status === "DA_HUY" && <p className="text-sm text-muted-foreground">Đã hủy công việc; không áp dụng các thay đổi trong bảng.</p>}
    {work.result && <div role="status" className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm"><CheckCheck className="size-4 shrink-0 text-primary" /><p>{work.status === "HOAN_TAT" ? `Đã cập nhật ${work.result.changed} loại; ${work.result.unchanged} loại không cần đổi.` : work.snapshot.rows.length ? "Tất cả loại đã có giá trị đề xuất; không cần duyệt." : "Chưa có loại tài sản để cập nhật."}{work.approvedAt && ` Hoàn tất lúc ${new Date(work.approvedAt).toLocaleString("vi-VN")}.`}</p></div>}
    <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Thu gọn bảng" : "Xem bảng trước–sau"}</Button>
    {expanded && <div className="min-w-0 space-y-2"><div className="max-h-96 overflow-auto rounded-lg border" role="region" aria-label="Bảng khấu hao trước và sau" tabIndex={0}>
      <Table><TableHeader><TableRow><TableHead>Loại tài sản</TableHead><TableHead>Trước</TableHead><TableHead>Đề xuất</TableHead><TableHead>{work.result ? "Kết quả" : "Công việc"}</TableHead></TableRow></TableHeader>
        <TableBody>{(allRows ? work.snapshot.rows : work.snapshot.rows.slice(0, 10)).map(row => <TableRow key={row.id}>
          <TableCell><span className="font-medium">{row.name}</span><span className="block text-xs text-muted-foreground">{row.code}{!row.active ? " · Ngừng dùng" : ""}</span></TableCell>
          <TableCell>{monthsLabel(row.before)}</TableCell><TableCell>{monthsLabel(work.snapshot.months)}</TableCell>
          <TableCell>{row.before === work.snapshot.months ? "Giữ nguyên" : work.status === "HOAN_TAT" ? "Đã cập nhật" : work.status === "DA_HUY" ? "Đã hủy" : "Cần cập nhật"}</TableCell>
        </TableRow>)}</TableBody></Table>
      </div>{work.snapshot.rows.length > 10 && <Button variant="outline" size="sm" onClick={() => setAllRows(!allRows)}>{allRows ? "Hiện 10 dòng đầu" : `Xem toàn bộ ${work.snapshot.rows.length} loại`}</Button>}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">
      {editable && <>
        {work.status === "CHO_DUYET" ? <Button className="min-h-10" disabled={pending || uncertain} onClick={() => run("approve")}>{pending && <Loader2 className="size-4 animate-spin" />}Duyệt và thực hiện ({changed})</Button>
          : <Button className="min-h-10" disabled={pending || uncertain} onClick={() => run("refresh")}>Làm mới bảng để duyệt lại</Button>}
        <Button variant="outline" className="min-h-10" disabled={pending || uncertain || !canAdjust} onClick={() => run("adjust")}>Điều chỉnh yêu cầu</Button>
        <Button variant="outline" className="min-h-10" disabled={pending || uncertain} onClick={() => run("cancel")}>Hủy công việc</Button>
      </>}
      <Button variant="ghost" className="min-h-10" disabled={pending} onClick={() => run("status")}>Tải trạng thái</Button>
    </div>
    {editable && <p className="text-xs text-muted-foreground">Điều chỉnh sẽ hủy bảng này và đưa yêu cầu về ô chat để bạn sửa, gửi lại.</p>}
  </article>;
}
