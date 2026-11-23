"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCreatedTaskByRequest } from "@/actions/support-task";
import { TaskCreate } from "@/components/tasks/TaskCreate";
import type { SavedSupportDraft } from "@/lib/ai-support-task";
import { Button } from "@/components/ui/button";
export function AiSupportTicket({
  draft,
  onCreated,
  onBusy,
}: {
  draft: SavedSupportDraft;
  onCreated: (id: number) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    task?: { id: number; tieu_de: string } | null;
  }>({ loading: true });
  useEffect(() => {
    let active = true;
    getCreatedTaskByRequest(draft.requestId)
      .then((r) => {
        if (active)
          setState(
            r.success
              ? { loading: false, task: r.task }
              : { loading: false, error: r.message },
          );
      })
      .catch(() => {
        if (active)
          setState({
            loading: false,
            error: "Chưa kiểm tra được yêu cầu đã gửi. Hãy mở lại bản nháp.",
          });
      });
    return () => {
      active = false;
    };
  }, [draft.requestId]);
  if (state.loading) return <p role="status">Đang kiểm tra yêu cầu…</p>;
  if (state.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state.task)
    return (
      <div className="space-y-3">
        <p>
          Yêu cầu này đã được gửi: <strong>{state.task.tieu_de}</strong>
        </p>
        <Button asChild>
          <Link href={`/tasks/${state.task.id}`}>Mở công việc</Link>
        </Button>
      </div>
    );
  return (
    <TaskCreate
      embedded
      onBusy={onBusy}
      initialValues={draft.values}
      initialRequestId={draft.requestId}
      onCreated={(id) => {
        setState({ loading: false, task: { id, tieu_de: draft.values.title } });
        onCreated(id);
      }}
    />
  );
}
