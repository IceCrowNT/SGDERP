"use client";

import { useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CheckCheck, CircleAlert, FlaskConical, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Illustrative fixtures only. These are not employee records or an approved scoring policy.
const people = [
  { id: 1, name: "Nhân sự mẫu 01", role: "Chuyên viên nhân sự", department: "HCNS", scores: [90, 100, 80] },
  { id: 2, name: "Nhân sự mẫu 02", role: "Chuyên viên hành chính", department: "HCNS", scores: [70, 80, 80] },
  { id: 3, name: "Nhân sự mẫu 03", role: "Chuyên viên kế hoạch", department: "KHĐT", scores: [100, 90, 100] },
  { id: 4, name: "Nhân sự mẫu 04", role: "Chuyên viên đầu tư", department: "KHĐT", scores: [80, 90, 90] },
  { id: 5, name: "Nhân sự mẫu 05", role: "Kế toán tổng hợp", department: "TCKT", scores: [60, 70, 80] },
  { id: 6, name: "Nhân sự mẫu 06", role: "Kế toán thanh toán", department: "TCKT", scores: [80, 80, 90] },
] as const;
const indicators = [
  { title: "Hoàn thành đầu việc được giao", weight: 40, actual: (score: number) => `${score / 10} / 10 đầu việc` },
  { title: "Hồ sơ đạt yêu cầu ngay lần đầu", weight: 35, actual: (score: number) => `${score / 10} / 10 hồ sơ` },
  { title: "Báo cáo nộp đúng hạn", weight: 25, actual: (score: number) => `${score / 10} / 10 báo cáo` },
];
type Person = (typeof people)[number];
const scoreOf = (person: Person) => person.scores.reduce((sum, score, i) => sum + score * indicators[i].weight / 100, 0);
const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const statusOf = (score: number) => score >= 90 ? "Tốt" : score >= 80 ? "Đạt" : "Cần cải thiện";
const toneOf = (score: number) => score >= 90 ? "bg-primary/10 text-primary dark:text-red-300" : score >= 80 ? "bg-accent/10 text-accent dark:text-blue-300" : "bg-destructive/10 text-destructive dark:text-red-300";

function ScoreBar({ score }: { score: number }) {
  return <span role="meter" aria-label="Điểm KPI" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="block h-1.5 overflow-hidden rounded-full bg-muted">
    <span className={cn("block h-full rounded-full", score >= 90 ? "bg-primary" : score >= 80 ? "bg-accent dark:bg-blue-400" : "bg-destructive dark:bg-red-400")} style={{ width: `${score}%` }} />
  </span>;
}

export function KpiDashboardPreview() {
  const [department, setDepartment] = useState("Tất cả");
  const [selectedId, setSelectedId] = useState(1);
  const detailRef = useRef<HTMLElement>(null);
  function selectPerson(id: number) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ block: "start" });
    }
  }
  const visible = people.filter(person => department === "Tất cả" || person.department === department);
  const selected = visible.find(person => person.id === selectedId) ?? visible[0];
  const average = visible.reduce((sum, person) => sum + scoreOf(person), 0) / visible.length;
  const achieved = visible.filter(person => scoreOf(person) >= 80).length;
  const attention = visible.filter(person => scoreOf(person) < 80);
  const stats = [
    { title: "Nhân sự trong kỳ", value: String(visible.length).padStart(2, "0"), note: department === "Tất cả" ? "3 phòng ban minh họa" : `Phòng ${department} · dữ liệu mẫu`, icon: Users },
    { title: "Điểm KPI bình quân", value: number(average), note: "Thang điểm 100", icon: Target },
    { title: "Đạt mục tiêu", value: `${achieved}/${visible.length}`, note: "Từ 80 điểm · ngưỡng minh họa", icon: CheckCheck },
    { title: "Cần cải thiện", value: String(attention.length).padStart(2, "0"), note: "Dưới 80 điểm · cần trao đổi", icon: CircleAlert },
  ];

  return <section aria-label="Bản mẫu KPI nhân sự" className="space-y-5 pb-4">
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <p><strong className="font-semibold">Bản mẫu giao diện.</strong> Tất cả nhân sự, điểm và chỉ tiêu dưới đây là dữ liệu minh họa. Chưa lưu hoặc đánh giá nhân sự thực tế.</p>
    </div>

    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nhân sự / Hiệu quả công việc</p><h2 className="text-2xl font-semibold tracking-tight">KPI nhân sự</h2><p className="mt-1 text-sm text-muted-foreground">Nhìn tổng thể kết quả, đi sâu vào từng mục tiêu.</p></div>
      <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"><CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />Tháng 11/2026<span className="border-l pl-2 text-xs text-muted-foreground">Kỳ mẫu</span></div>
    </div>

    <div aria-label="Lọc phòng ban minh họa" className="flex flex-wrap gap-2">
      {["Tất cả", "HCNS", "KHĐT", "TCKT"].map(value => <Button key={value} variant={department === value ? "default" : "outline"} size="sm" className="min-h-10 rounded-full px-4" aria-pressed={department === value} onClick={() => setDepartment(value)}>{value === "Tất cả" ? "Tất cả phòng ban" : value}</Button>)}
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(({ title, value, note, icon: Icon }, i) => <article key={title} className={cn("rounded-xl border bg-card p-4 sm:p-5", i === 1 && "border-primary/25 bg-primary/5")}>
        <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium text-muted-foreground">{title}</h3><Icon aria-hidden="true" className={cn("size-4 shrink-0", i === 3 ? "text-destructive dark:text-red-300" : "text-primary")} /></div>
        <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">{value}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>
      </article>)}
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <section aria-label="Kết quả nhân sự minh họa" className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b p-4 sm:px-5"><div><h3 className="font-semibold">Kết quả theo nhân sự</h3><p className="mt-1 text-xs text-muted-foreground">Chọn một người để xem các chỉ tiêu mẫu.</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums">{visible.length} người</span></div>
          <div className="divide-y">
            {visible.map(person => {
              const score = scoreOf(person);
              return <Button key={person.id} variant="ghost" aria-pressed={selected.id === person.id} aria-label={`Xem KPI ${person.name}`} onClick={() => selectPerson(person.id)} className={cn("flex h-auto w-full justify-start gap-3 rounded-none px-4 py-4 text-left whitespace-normal hover:bg-muted/50 hover:text-foreground sm:px-5", selected.id === person.id && "bg-primary/5 ring-1 ring-inset ring-primary/20 hover:bg-primary/10")}>
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{String(person.id).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{person.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{person.role} · {person.department}</span><span className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium", toneOf(score))}>{statusOf(score)}</span></span>
                <span className="w-16 shrink-0 space-y-2 sm:w-20"><span className="block text-right text-lg font-semibold tabular-nums">{number(score)}<span className="ml-0.5 text-xs font-normal text-muted-foreground">/100</span></span><ScoreBar score={score} /></span>
                <ArrowUpRight aria-hidden="true" className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
              </Button>;
            })}
          </div>
        </section>
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">Quy ước mẫu: từ 90 điểm — Tốt; 80 đến dưới 90 — Đạt; dưới 80 — Cần cải thiện. Chưa phải quy chế đánh giá của công ty.</p>
      </div>

      <div className="min-w-0 space-y-4">
        <section ref={detailRef} tabIndex={-1} aria-label="Chỉ tiêu nhân sự đang chọn" aria-live="polite" className="overflow-hidden rounded-xl border bg-card focus-visible:outline-2 focus-visible:outline-ring">
          <div className="border-b bg-muted/30 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">CHI TIẾT KPI · DỮ LIỆU MẪU</p><h3 className="mt-2 text-lg font-semibold">{selected.name}</h3><p className="mt-1 text-sm text-muted-foreground">{selected.role} · {selected.department}</p></div><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Target aria-hidden="true" className="size-5" /></span></div>
            <div className="mt-5 flex items-end justify-between gap-2"><p className="text-3xl font-semibold tabular-nums">{number(scoreOf(selected))}<span className="ml-1 text-sm font-normal text-muted-foreground">/ 100 điểm</span></p><span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", toneOf(scoreOf(selected)))}>{statusOf(scoreOf(selected))}</span></div>
          </div>
          <ol className="divide-y px-5">
            {indicators.map((indicator, i) => <li key={indicator.title} className="py-4">
              <div className="flex items-start justify-between gap-3"><h4 className="text-sm font-medium">{indicator.title}</h4><span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs tabular-nums">{indicator.weight}%</span></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Kết quả: <strong className="font-medium text-foreground">{indicator.actual(selected.scores[i])}</strong></span><span className="tabular-nums text-muted-foreground">{selected.scores[i]} điểm</span></div>
              <div className="mt-2"><ScoreBar score={selected.scores[i]} /></div>
            </li>)}
          </ol>
          <p className="border-t bg-muted/20 px-5 py-3 text-xs leading-relaxed text-muted-foreground">Điểm tổng = tổng (điểm từng chỉ tiêu × trọng số). Tổng trọng số 100%. Công thức chỉ dùng để minh họa.</p>
        </section>

        <section aria-label="Nhân sự cần trao đổi minh họa" className="rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CircleAlert aria-hidden="true" className="size-4 text-destructive dark:text-red-300" />Ưu tiên trao đổi</h3>
          {attention.length ? <ul className="mt-3 space-y-2">{attention.map(person => <li key={person.id}><Button variant="ghost" className="h-auto min-h-10 w-full justify-between gap-3 px-2 py-2 text-left whitespace-normal hover:bg-muted/50 hover:text-foreground" onClick={() => selectPerson(person.id)}><span className="text-sm">{person.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{person.department}</span></span><span className="inline-flex items-center gap-1 text-xs tabular-nums text-destructive dark:text-red-300"><ArrowDownRight aria-hidden="true" className="size-3" />{number(scoreOf(person))} điểm</span></Button></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Không có nhân sự dưới 80 điểm trong nhóm mẫu này.</p>}
        </section>
      </div>
    </div>
  </section>;
}
