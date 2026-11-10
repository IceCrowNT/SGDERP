"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, AlertCircle, ListChecks, History, UserRound, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type {
  getWorkflowDetail,
  getWorkflowWorkspace,
} from "@/actions/workflow";
import { canWorkflow } from "@/lib/role-catalog";
import type {
  WorkflowCommandInput,
  WorkflowDraftInput,
} from "@/lib/validations/workflow";
import { WORKFLOW_STATUS, WORKFLOW_EVENTS } from "@/lib/workflow-labels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CommandForm, DraftForm } from "./WorkflowForms";
type Data = Extract<
  Awaited<ReturnType<typeof getWorkflowDetail>>,
  { success: true }
>;
type Workspace = Extract<
  Awaited<ReturnType<typeof getWorkflowWorkspace>>,
  { success: true }
>;
const subscribe = () => () => {};
const labels = {
  SUBMIT: "Gửi hồ sơ",
  APPROVE: "Duyệt",
  REJECT: "Từ chối",
  COMPLETE: "Hoàn tất công việc",
  REASSIGN: "Chuyển giao",
  CANCEL: "Hủy hồ sơ",
};
export function WorkflowDetail({
  data,
  workspace,
}: {
  data: Data;
  workspace: Workspace;
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const router = useRouter();
  const r = data.record;
  const [command, setCommand] = useState<
    WorkflowCommandInput["command"] | null
  >(null);
  const [draft, setDraft] = useState<WorkflowDraftInput | null>(null);
  const owns = r.requesterId === data.employeeId;
  const manage = canWorkflow(data.actions, "MANAGE");
  const create = canWorkflow(data.actions, "CREATE") && owns;
  const active = r.steps.find((b) => ["PENDING", "BLOCKED"].includes(b.status));
  const act = (cmd: WorkflowCommandInput["command"]) => (
    <Button
      key={cmd}
      disabled={!ready}
      variant={cmd === "REJECT" || cmd === "CANCEL" ? "outline" : "default"}
      onClick={() => setCommand(cmd)}
    >
      {labels[cmd]}
    </Button>
  );
  return (
    <div className="space-y-5 min-w-0">
      <Link href="/workflows" className="text-sm text-primary">
        ← Danh sách quy trình
      </Link>
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <p className="text-sm text-muted-foreground">
            {r.code} · {r.template.name} · v{r.template.revision}
          </p>
          <h1 className="text-2xl font-bold mt-1 break-words">{r.title}</h1>
        </div>
        <Badge variant="secondary">{WORKFLOW_STATUS[r.status]}</Badge>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-2"><UserRound className="size-4" aria-hidden="true" />Người gửi: {r.requester}</span><span className="flex items-center gap-2"><Building2 className="size-4" aria-hidden="true" />Phòng nguồn: {r.department}</span></div>
      {r.previousId && (
        <Link
          className="text-sm text-primary"
          href={`/workflows/${r.previousId}`}
        >
          Xem hồ sơ bị từ chối trước đó
        </Link>
      )}
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3">Nội dung yêu cầu</h2>
        <p className="whitespace-pre-wrap break-words text-sm">{r.content}</p>
      </section>
      {r.issue && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Cần điều phối: {r.issue} Người quản lý quy trình có thể chuyển giao
          bước này.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {r.status === "DRAFT" && create && (
          <>
            <Button
              disabled={!ready}
              variant="outline"
              onClick={() =>
                setDraft({
                  id: r.id,
                  version: r.version,
                  templateId: r.template.id,
                  title: r.title,
                  content: r.content,
                })
              }
            >
              Sửa nháp
            </Button>
            {act("SUBMIT")}
            {act("CANCEL")}
          </>
        )}
        {r.status === "REJECTED" && create && (
          <Button
            disabled={!ready}
            onClick={() =>
              setDraft({
                previousId: r.id,
                templateId:
                  workspace.templates.find(
                    (t) =>
                      t.code === r.template.code && t.status === "PUBLISHED",
                  )?.id ??
                  workspace.templates.find((t) => t.status === "PUBLISHED")
                    ?.id ??
                  r.template.id,
                title: r.title,
                content: r.content,
              })
            }
          >
            Lập lại hồ sơ
          </Button>
        )}
        {r.status === "IN_PROGRESS" && active && (
          <>
            {manage && (
              <>
                {act("REASSIGN")}
                {act("CANCEL")}
              </>
            )}
            {active.status === "PENDING" &&
              active.employeeId === data.employeeId &&
              !r.issue && (
                <>
                  {active.kind === "APPROVAL" &&
                    canWorkflow(data.actions, "APPROVE") && (
                      <>
                        {act("APPROVE")}
                        {act("REJECT")}
                      </>
                    )}
                  {active.kind === "TASK" &&
                    canWorkflow(data.actions, "EXECUTE") &&
                    act("COMPLETE")}
                </>
              )}
          </>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="flex items-center gap-2 font-semibold"><ListChecks className="size-5 text-primary" aria-hidden="true" />Các bước xử lý</h2>
          {(r.steps.length
            ? r.steps
            : r.template.steps.map((b) => ({
                id: b.id,
                name: b.name,
                instructions: b.instructions,
                kind: b.kind,
                status: "WAITING",
                employeeName:
                  b.assignment === "REQUESTER_DEPARTMENT_HEAD"
                    ? "Phụ trách phòng người gửi"
                    : b.employeeName,
              }))
          ).map((b, i) => (
            <div
              key={b.id}
              className={cn("relative ml-3 border-l-2 py-2 pl-6 space-y-1", b.status === "PENDING" ? "border-primary bg-primary/5" : "border-border")}
            >
              <span className="absolute -left-3 top-2 rounded-full bg-card p-0.5 text-primary" aria-hidden="true">{["APPROVED", "COMPLETED"].includes(b.status) ? <CheckCircle2 className="size-5" /> : ["BLOCKED", "REJECTED"].includes(b.status) ? <AlertCircle className="size-5" /> : <Clock className="size-5" />}</span>
              <div className="flex flex-wrap gap-2 items-center">
                <h3 className="font-medium">
                  {i + 1}. {b.name}
                </h3>
                <Badge variant="secondary">{WORKFLOW_STATUS[b.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {b.kind === "APPROVAL" ? "Duyệt" : "Thực hiện"} ·{" "}
                {b.employeeName || "Chưa phân công"}
              </p>
              {b.instructions && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {b.instructions}
                </p>
              )}
            </div>
          ))}
        </section>
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="flex items-center gap-2 font-semibold"><History className="size-5 text-primary" aria-hidden="true" />Lịch sử xử lý</h2>
          {!r.history.length && <p className="text-sm text-muted-foreground">Chưa có thao tác xử lý.</p>}
          {r.history.map((h) => (
            <div key={h.id} className="border-l-2 pl-4 space-y-1">
              <p className="text-sm font-medium">
                {WORKFLOW_EVENTS[h.action] ?? h.action}
              </p>
              <p className="text-xs text-muted-foreground">
                {h.actor} ·{" "}
                {new Date(h.time).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
              {h.reason && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {h.reason}
                </p>
              )}
            </div>
          ))}
        </section>
      </div>
      <Dialog
        open={Boolean(command)}
        onOpenChange={(open) => {
          if (!open) setCommand(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {command ? labels[command] : "Xử lý hồ sơ"}
            </DialogTitle>
            <DialogDescription>
              {command === "SUBMIT"
                ? "Sau khi gửi, nội dung được giữ nguyên trong suốt quá trình xử lý."
                : "Thao tác được ghi lại trong lịch sử hồ sơ."}
            </DialogDescription>
          </DialogHeader>
          {command && (
            <CommandForm
              initial={{
                id: r.id,
                version: r.version,
                stepId: active?.id,
                command,
                reason: "",
              }}
              people={workspace.people}
              done={() => {
                setCommand(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Sửa hồ sơ nháp" : "Lập lại hồ sơ"}
            </DialogTitle>
            <DialogDescription>
              Chọn mẫu đang phát hành và kiểm tra nội dung trước khi gửi.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <DraftForm
              initial={draft}
              templates={workspace.templates.filter(
                (t) => t.status === "PUBLISHED",
              )}
              done={(id) => {
                setDraft(null);
                router.push(`/workflows/${id}`);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
