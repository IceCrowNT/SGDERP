"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getTaskNotifications,
  readTaskNotification,
} from "@/actions/support-task";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
type Data = Extract<
  Awaited<ReturnType<typeof getTaskNotifications>>,
  { success: true }
>;
const time = (value: Date | string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
export function TaskNotifications() {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [pending, start] = useTransition(),
    [open, setOpen] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true,
      busy = false;
    async function load() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const r = await getTaskNotifications(page);
        if (alive) {
          if (r.success) {
            setData(r);
            setError("");
          } else {
            setData(null);
            setError(r.message);
          }
        }
      } catch {
        if (alive) setError("Chưa tải được thông báo. Hãy thử lại.");
      } finally {
        busy = false;
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [page, refresh]);
  function markRead(id: number) {
    start(async () => {
      try {
        const r = await readTaskNotification(id);
        if (!r.success) {
          setError(r.message);
          return;
        }
        setError("");
        setRefresh((n) => n + 1);
      } catch {
        setError("Chưa đánh dấu được thông báo. Hãy thử lại.");
      }
    });
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setRefresh((n) => n + 1);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-h-10"
          aria-label={`Thông báo công việc${data ? `, ${data.unread} chưa đọc` : ""}`}
        >
          <Bell className="size-4" aria-hidden />
          {data?.unread ?? ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[70vh] w-[min(24rem,90vw)] overflow-y-auto"
      >
        <h2 className="mb-3 font-semibold">Thông báo công việc</h2>
        {error && (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            {error}
            <Button
              variant="outline"
              className="min-h-10"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Thử lại
            </Button>
          </div>
        )}
        {!data && !error && <p role="status">Đang tải thông báo…</p>}
        {data?.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa có thông báo công việc.
          </p>
        )}
        <ul className="divide-y">
          {data?.rows.map((n) => (
            <li key={n.id} className="space-y-1 py-3">
              {n.title ? (
                <>
                  <p className="text-xs text-muted-foreground">{n.summary}</p>
                  <Link
                    className="block min-h-10 break-words py-1 text-sm font-medium hover:underline"
                    href={`/tasks/${n.cong_viec_id}`}
                    onClick={() => {
                      if (!n.da_doc_luc) markRead(n.id);
                      setOpen(false);
                    }}
                  >
                    {n.title}
                  </Link>
                  {n.needsReview && (
                    <p className="text-sm text-primary">Chờ bạn nghiệm thu</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bạn không còn quyền xem công việc này.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <time dateTime={new Date(n.created_at).toISOString()}>
                  {time(n.created_at)}
                </time>
                {!n.da_doc_luc && <span>Chưa đọc</span>}
              </div>
              {!n.da_doc_luc && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-10"
                  disabled={pending}
                  onClick={() => markRead(n.id)}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </li>
          ))}
        </ul>
        {data && data.total > 20 && (
          <nav
            aria-label="Phân trang thông báo"
            className="flex items-center justify-between gap-2"
          >
            <Button
              variant="outline"
              disabled={pending || page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Mới hơn
            </Button>
            <span className="text-xs">Trang {page}</span>
            <Button
              variant="outline"
              disabled={pending || page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Cũ hơn
            </Button>
          </nav>
        )}
      </PopoverContent>
    </Popover>
  );
}
