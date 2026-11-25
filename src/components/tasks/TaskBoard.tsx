"use client";
import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import type { getSupportTasks } from "@/actions/support-task";
import { taskListHref, type TaskFilters } from "@/lib/task-navigation";
import { TASK_STATUS, TASK_CATEGORIES, canTask } from "@/lib/support-task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

export function TaskListError({
  message,
  reference,
  recovery = "retry",
}: {
  message: string;
  reference?: string | null;
  recovery?: "retry" | "reload" | "sign_in" | "none";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p role="alert">{message}</p>
      {reference && (
        <p className="text-sm text-muted-foreground">Mã hỗ trợ: {reference}</p>
      )}
      {recovery === "sign_in" ? (
        <Button asChild variant="outline" className="min-h-10">
          <Link href="/login">Đăng nhập lại</Link>
        </Button>
      ) : (
        recovery !== "none" && (
          <Button
            variant="outline"
            className="min-h-10"
            disabled={pending}
            onClick={() => start(() => router.refresh())}
          >
            {pending ? "Đang tải…" : "Thử lại"}
          </Button>
        )
      )}
    </div>
  );
}
export function TaskBoard({
  initial,
  department = false,
  initialFilters,
}: {
  initial: Data;
  department?: boolean;
  initialFilters: TaskFilters;
}) {
  const data = initial,
    tab = initialFilters.tab;
  const [search, setSearch] = useState(initialFilters.search),
    [category, setCategory] = useState(initialFilters.category),
    [status, setStatus] = useState(initialFilters.status),
    [overdue, setOverdue] = useState(initialFilters.overdue),
    [filtersOpen, setFiltersOpen] = useState(false),
    [pending, start] = useTransition();
  const params = useSearchParams(),
    router = useRouter(),
    selected = Number(params.get("task"));
  const path = department ? "/tasks/department" : "/tasks";
  const listHref = taskListHref(path, initialFilters);
  const guard = useRef<() => boolean>(() => true);
  const registerGuard = useCallback((check: () => boolean) => {
    guard.current = check;
  }, []);
  function navigate(filters: TaskFilters) {
    start(() => router.push(taskListHref(path, filters), { scroll: false }));
  }
  const tabs = {
    actionable: "Cần tôi xử lý",
    requested: "Tôi yêu cầu",
    all: "Tất cả",
  };
  // Old dashboard/bookmarked URLs retain their exact server-side scope.
  const legacyGroups = {
    receive: "Việc tôi cần nhận",
    doing: "Việc tôi đang làm",
    waiting: "Việc tôi đã báo xong",
    accept: "Việc chờ tôi nghiệm thu",
    closed: "Việc đã đóng",
  };
  const legacyGroup =
    tab in legacyGroups ? legacyGroups[tab as keyof typeof legacyGroups] : null;
  const activeTab = legacyGroup ? "all" : tab;
  const activeFilters: { label: string; clear: Partial<TaskFilters> }[] = [
    ...(legacyGroup
      ? [{ label: legacyGroup, clear: { tab: "all" as const } }]
      : []),
    ...(initialFilters.search
      ? [{ label: `Tìm: ${initialFilters.search}`, clear: { search: "" } }]
      : []),
    ...(initialFilters.category !== "ALL"
      ? [
          {
            label: TASK_CATEGORIES[initialFilters.category],
            clear: { category: "ALL" as const },
          },
        ]
      : []),
    ...(initialFilters.status !== "ALL"
      ? [
          {
            label: TASK_STATUS[initialFilters.status],
            clear: { status: "ALL" as const },
          },
        ]
      : []),
    ...(initialFilters.overdue
      ? [{ label: "Quá hạn", clear: { overdue: false } }]
      : []),
  ];
  const extraFilterCount =
    Number(initialFilters.category !== "ALL") +
    Number(initialFilters.status !== "ALL") +
    Number(initialFilters.overdue);
  return (
    <div className="space-y-4 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {department ? "Việc phòng ban" : "Công việc của tôi"}
        </h1>
        <div className="flex items-center gap-2">
          <TaskNotifications />
          {canTask(data.actions, "CREATE") && <TaskCreate />}
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!department && (
          <nav className="flex flex-wrap gap-1" aria-label="Nhóm công việc">
            {Object.entries(tabs).map(([key, label]) => (
              <Button
                key={key}
                aria-pressed={activeTab === key}
                variant={activeTab === key ? "secondary" : "ghost"}
                disabled={pending}
                onClick={() => {
                  navigate({
                    ...initialFilters,
                    page: 1,
                    tab: key as TaskFilters["tab"],
                  });
                }}
              >
                {label}
              </Button>
            ))}
          </nav>
        )}
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href={department ? "/tasks" : "/tasks/department"}>
            {department ? "Việc của tôi" : "Việc phòng ban"}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {department && (
        <p className="text-sm text-muted-foreground">
          Yêu cầu gửi cả phòng chờ quản lý giao cho nhân viên. Người được giao
          xác nhận nhận việc.
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({
            ...initialFilters,
            page: 1,
            search,
            category,
            status,
            overdue,
          });
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-lg">
            <Input
              aria-label="Tìm tiêu đề công việc"
              placeholder="Tìm tiêu đề…"
              value={search}
              maxLength={255}
              onChange={(e) => setSearch(e.target.value)}
              className="text-base"
            />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              disabled={pending}
              aria-label="Tìm công việc"
            >
              <Search aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            aria-expanded={filtersOpen}
            aria-controls="task-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal aria-hidden="true" />
            Bộ lọc{extraFilterCount > 0 ? ` (${extraFilterCount})` : ""}
          </Button>
        </div>
        {filtersOpen && (
          <div
            id="task-filters"
            className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3"
          >
            <Choice
              label="Hạng mục"
              value={category}
              onChange={(v) => setCategory(v as TaskFilters["category"])}
              options={{ ALL: "Tất cả", ...TASK_CATEGORIES }}
            />
            <Choice
              label="Trạng thái"
              value={status}
              onChange={(v) => setStatus(v as TaskFilters["status"])}
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
              {pending ? "Đang tải…" : "Áp dụng"}
            </Button>
          </div>
        )}
      </form>
      {activeFilters.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Bộ lọc đang áp dụng"
        >
          {activeFilters.map(({ label, clear }) => (
            <Button
              key={label}
              variant="secondary"
              className="max-w-full"
              disabled={pending}
              aria-label={`Bỏ lọc ${label}`}
              onClick={() => navigate({ ...initialFilters, ...clear, page: 1 })}
            >
              <span className="truncate">{label}</span>
              <X aria-hidden="true" />
            </Button>
          ))}
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              navigate({
                ...initialFilters,
                tab: legacyGroup ? "all" : tab,
                search: "",
                category: "ALL",
                status: "ALL",
                overdue: false,
                page: 1,
              })
            }
          >
            Bỏ bộ lọc
          </Button>
        </div>
      )}
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải danh sách…
        </p>
      )}
      {
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-3 bg-muted px-4 py-3 text-sm font-medium md:grid">
            <span>Công việc</span>
            <span>Người thực hiện</span>
            <span>Trạng thái</span>
            <span>Hạn hoàn thành</span>
          </div>
          {data.rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {initialFilters.search ||
              initialFilters.category !== "ALL" ||
              initialFilters.status !== "ALL" ||
              initialFilters.overdue
                ? "Không có công việc khớp bộ lọc. Hãy đổi hoặc bỏ bộ lọc."
                : "Chưa có công việc trong nhóm này."}
            </p>
          ) : (
            <ul className="divide-y">
              {data.rows.map((t) => (
                <li key={t.id}>
                  <Link
                    href={taskListHref(path, initialFilters, t.id)}
                    scroll={false}
                    className="grid gap-2 p-4 transition-all duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {t.tieu_de}
                        {t.muc_do === "KHAN" && (
                          <span className="ml-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            Khẩn
                          </span>
                        )}
                      </p>
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
      }
      <nav
        aria-label="Phân trang công việc"
        className="flex items-center justify-between gap-2 text-sm"
      >
        <span>
          {data.total} công việc · Trang {data.page}/{data.pages}
        </span>
        {data.pages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pending || data.page <= 1}
              onClick={() =>
                navigate({ ...initialFilters, page: data.page - 1 })
              }
            >
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={pending || data.page >= data.pages}
              onClick={() =>
                navigate({ ...initialFilters, page: data.page + 1 })
              }
            >
              Sau
            </Button>
          </div>
        )}
      </nav>
      <Sheet
        open={Number.isSafeInteger(selected) && selected > 0}
        onOpenChange={(open) => {
          if (!open) {
            if (!guard.current()) return;
            router.replace(listHref, { scroll: false });
            router.refresh();
          }
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          className="w-full gap-0 overflow-hidden sm:max-w-3xl [&>button]:grid [&>button]:min-h-10 [&>button]:min-w-10 [&>button]:place-items-center"
        >
          {selected > 0 && (
            <div className="flex min-h-0 flex-1 overflow-hidden p-4">
              <TaskDetail
                embedded
                key={selected}
                id={selected}
                returnHref={listHref}
                onLeaveGuard={registerGuard}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
