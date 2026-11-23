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
export function TaskNotifications() {
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
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
        if (alive) setError("Chưa tải được thông báo.");
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
  }, [page]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
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
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p>Đang tải…</p>}
        {data?.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có thông báo.</p>
        )}
        <ul className="divide-y">
          {data?.rows.map((n) => (
            <li key={n.id} className="space-y-1 py-3">
              {n.title ? (
                <Link
                  className="block min-h-10 text-sm font-medium hover:underline"
                  href={`/tasks/${n.cong_viec_id}`}
                  onClick={() =>
                    start(async () => {
                      const r = await readTaskNotification(n.id);
                      if (r.success)
                        setData(
                          await getTaskNotifications(page).then((x) =>
                            x.success ? x : null,
                          ),
                        );
                    })
                  }
                >
                  {!n.da_doc_luc ? "● " : ""}
                  {n.title}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bạn không còn quyền xem công việc này.
                </p>
              )}
              {!n.da_doc_luc && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await readTaskNotification(n.id);
                      if (r.success) {
                        const next = await getTaskNotifications(page);
                        if (next.success) setData(next);
                      }
                    })
                  }
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </li>
          ))}
        </ul>
        {data && data.total > 20 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
