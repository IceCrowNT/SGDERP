"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupportTasks } from "@/actions/support-task";
import { TASK_STATUS, TASK_CATEGORIES, canTask } from "@/lib/support-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TaskCreate, Choice } from "./TaskCreate";
import { TaskNotifications } from "./TaskNotifications";
import { TaskDetail } from "./TaskDetail";
type Data = Extract<
  Awaited<ReturnType<typeof getSupportTasks>>,
  { success: true }
>;
export const taskDate = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(d))
    : "—";
export function TaskBoard({
  initial,
  department = false,
  initialTab = "all",
}: {
  initial: Data;
  department?: boolean;
  initialTab?: string;
}) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState(department ? "department" : initialTab),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("ALL"),
    [status, setStatus] = useState("ALL"),
    [overdue, setOverdue] = useState(false),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  const params = useSearchParams(),
    router = useRouter(),
    selected = Number(params.get("task"));
  const path = department ? "/tasks/department" : "/tasks";
  function load(page = 1, newTab = tab) {
    start(async () => {
      try {
        const r = await getSupportTasks({
          page,
          tab: newTab,
          search,
          category,
          status,
          overdue,
        });
        if (r.success) {
          setData(r);
          setError("");
        } else {
          setError(r.message);
        }
      } catch {
        setError("Chưa tải được công việc. Thử lại.");
      }
    });
  }
  const tabs = department
    ? { department: "Việc phòng ban" }
    : {
        all: "Liên quan đến tôi",
        receive: "Cần nhận",
        doing: "Đang làm",
        accept: "Chờ tôi nghiệm thu",
        requested: "Tôi yêu cầu",
        closed: "Đã đóng",
      };
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {department ? "Việc phòng ban" : "Công việc của tôi"}
        </h1>
        <div className="flex items-center gap-2">
          <TaskNotifications />
          {canTask(data.actions, "CREATE") && <TaskCreate />}
        </div>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Nhóm công việc">
        {Object.entries(tabs).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "secondary" : "outline"}
            disabled={pending}
            onClick={() => {
              setTab(key);
              load(1, key);
            }}
          >
            {label}
          </Button>
        ))}
        <Button asChild variant="ghost">
          <Link href={department ? "/tasks" : "/tasks/department"}>
            {department ? "Việc của tôi" : "Việc phòng ban"}
          </Link>
        </Button>
      </nav>
      {department && (
        <p className="text-sm text-muted-foreground">
          Yêu cầu gửi cả phòng chờ quản lý giao cho nhân viên. Người được giao
          xác nhận nhận việc.
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="min-w-48 flex-1">
          <Input
            aria-label="Tìm tiêu đề công việc"
            placeholder="Tìm tiêu đề…"
            value={search}
            maxLength={255}
            onChange={(e) => setSearch(e.target.value)}
            className="text-base"
          />
        </div>
        <Choice
          label="Hạng mục"
          value={category}
          onChange={setCategory}
          options={{ ALL: "Tất cả", ...TASK_CATEGORIES }}
        />
        <Choice
          label="Trạng thái"
          value={status}
          onChange={setStatus}
          options={{ ALL: "Tất cả", ...TASK_STATUS }}
        />
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={overdue}
            onCheckedChange={(v) => setOverdue(v === true)}
          />
          Quá hạn
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang tải…" : "Lọc"}
        </Button>
      </form>
      {error ? (
        <div role="alert" className="rounded-lg border p-4 text-destructive">
          {error}
          <Button variant="outline" onClick={() => load()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-3 bg-muted px-4 py-3 text-sm font-medium md:grid">
            <span>Công việc</span>
            <span>Người thực hiện</span>
            <span>Trạng thái</span>
            <span>Hạn hoàn thành</span>
          </div>
          {data.rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Chưa có công việc phù hợp.
            </p>
          ) : (
            <ul className="divide-y">
              {data.rows.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${path}?task=${t.id}`}
                    scroll={false}
                    className="grid gap-2 p-4 transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">{t.tieu_de}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.nguoi_yeu_cau.ho_ten} ·{" "}
                        {t.phong_ho_tro.ten_phong_ban}
                      </p>
                    </div>
                    <span className="text-sm">
                      {t.nguoi_thuc_hien?.ho_ten ??
                        t.nguoi_duoc_yeu_cau?.ho_ten ??
                        "Chờ quản lý giao"}
                    </span>
                    <span className="text-sm">{TASK_STATUS[t.trang_thai]}</span>
                    <span className="text-sm text-muted-foreground">
                      {t.han_hoan_thanh
                        ? taskDate(t.han_hoan_thanh)
                        : "Không đặt hạn"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <nav
        aria-label="Phân trang công việc"
        className="flex items-center justify-between gap-2 text-sm"
      >
        <span>
          {data.total} công việc · Trang {data.page}/{data.pages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={pending || data.page <= 1}
            onClick={() => load(data.page - 1)}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            disabled={pending || data.page >= data.pages}
            onClick={() => load(data.page + 1)}
          >
            Sau
          </Button>
        </div>
      </nav>
      <Sheet
        open={Number.isSafeInteger(selected) && selected > 0}
        onOpenChange={(open) => {
          if (!open) {
            router.replace(path, { scroll: false });
            load(data.page);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Chi tiết công việc</SheetTitle>
            <SheetDescription>
              Theo dõi xử lý, bằng chứng và lịch sử.
            </SheetDescription>
          </SheetHeader>
          {selected > 0 && (
            <div className="p-4">
              <TaskDetail key={selected} id={selected} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
