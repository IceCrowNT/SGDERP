"use client";
import { useState, useTransition, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GitBranch, Plus, FileText, Inbox, Clock, ListChecks, ArrowRight } from "lucide-react";
import {
  getWorkflowWorkspace,
  changeWorkflowTemplate,
} from "@/actions/workflow";
import { canWorkflow } from "@/lib/role-catalog";
import { FeatureOverview, EmptyPanel } from "@/components/ui/feature-overview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TemplateForm, DraftForm } from "./WorkflowForms";
import { WORKFLOW_STATUS } from "@/lib/workflow-labels";
type Data = Extract<
  Awaited<ReturnType<typeof getWorkflowWorkspace>>,
  { success: true }
>;
type Template = Data["templates"][number];
const subscribe = () => () => {};
export function WorkflowWorkspace({ data }: { data: Data }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const router = useRouter();
  const [editing, setEditing] = useState<Template | null | undefined>();
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();
  const [confirmation, setConfirmation] = useState<{
    template: Template;
    command: "PUBLISH" | "RETIRE" | "COPY";
  } | null>(null);
  const manage = canWorkflow(data.actions, "MANAGE");
  const create =
    canWorkflow(data.actions, "CREATE") && Boolean(data.employeeId);
  const records = (mode: "mine" | "inbox" | "all") => {
    const rows = data.records.filter(
      (r) =>
        mode === "all" ||
        (mode === "mine" && r.requesterId === data.employeeId) ||
        (mode === "inbox" &&
          r.assigneeId === data.employeeId &&
          r.status === "IN_PROGRESS"),
    );
    return (
      <div className="space-y-3 mt-4">
        {!rows.length && (
          <EmptyPanel title="Chưa có hồ sơ." description={mode === "inbox" ? "Các bước được giao cho bạn sẽ xuất hiện tại đây." : "Hồ sơ trong phạm vi được xem sẽ xuất hiện tại đây."} />
        )}
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/workflows/${r.id}`}
            className="block rounded-xl border bg-card p-4 hover:border-primary/40 transition-all duration-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-start gap-2 font-semibold break-words"><FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{r.title}</h2>
              <Badge variant="secondary">
                {r.blocked ? "Cần chuyển giao" : WORKFLOW_STATUS[r.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {r.code} · {r.requester}
              {r.step && ` · ${r.step}`}
            </p>
          </Link>
        ))}
      </div>
    );
  };
  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold flex gap-2 items-center">
            <GitBranch className="text-primary" />
            Quy trình và duyệt công việc
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Bản thử nghiệm · xử lý tuần tự theo người được giao
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {manage && (
            <Button
              variant="outline"
              disabled={!ready}
              onClick={() => setEditing(null)}
            >
              <Plus />
              Tạo mẫu
            </Button>
          )}
          {create && (
            <Button
              disabled={
                !ready || !data.templates.some((t) => t.status === "PUBLISHED")
              }
              onClick={() => setCreating(true)}
            >
              <Plus />
              Tạo hồ sơ
            </Button>
          )}
        </div>
      </div>
      <FeatureOverview items={[
        { label: "Hồ sơ trong danh sách", value: data.records.length, icon: FileText },
        { label: "Được giao · đang xử lý", value: data.records.filter((r) => r.assigneeId === data.employeeId && r.status === "IN_PROGRESS").length, icon: Inbox },
        { label: "Đang xử lý trong danh sách", value: data.records.filter((r) => r.status === "IN_PROGRESS").length, icon: Clock },
        { label: "Mẫu đã phát hành", value: data.templates.filter((t) => t.status === "PUBLISHED").length, icon: ListChecks },
      ]} />
      <p className="text-xs text-muted-foreground">Số hồ sơ tính trong tối đa 200 bản ghi được tải theo quyền của bạn; các nhóm có thể trùng nhau.</p>
      {!data.templates.some((t) => t.status === "PUBLISHED") && (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm">
          Chưa có mẫu được phát hành. Người quản lý quy trình cần tạo mẫu, chọn
          người xử lý có quyền và phát hành trước khi gửi hồ sơ.
        </p>
      )}
      <Tabs
        defaultValue={manage && !data.templates.length ? "templates" : "mine"}
      >
        <TabsList className="h-auto flex flex-wrap justify-start w-fit">
          <TabsTrigger disabled={!ready} value="mine">
            Hồ sơ tôi gửi
          </TabsTrigger>
          <TabsTrigger disabled={!ready} value="inbox">
            Việc chờ tôi xử lý
          </TabsTrigger>
          {manage && (
            <TabsTrigger disabled={!ready} value="all">
              Điều phối
            </TabsTrigger>
          )}
          <TabsTrigger disabled={!ready} value="templates">
            Mẫu quy trình
          </TabsTrigger>
        </TabsList>
        <p className="text-xs text-muted-foreground mt-3">
          Hiển thị tối đa 200 hồ sơ được cập nhật gần nhất trong phạm vi quyền
          của bạn.
        </p>
        <TabsContent value="mine">{records("mine")}</TabsContent>
        <TabsContent value="inbox">{records("inbox")}</TabsContent>
        {manage && <TabsContent value="all">{records("all")}</TabsContent>}
        <TabsContent value="templates" className="space-y-3 mt-4">
          {manage && !data.templates.length && (
            <div className="rounded-xl border p-6 space-y-3">
              <h2 className="font-semibold">Chưa có mẫu quy trình</h2>
              <p className="text-sm text-muted-foreground">
                Bắt đầu bằng một mẫu nháp, chọn các bước và người xử lý trước
                khi phát hành.
              </p>
              <Button onClick={() => setEditing(null)}>Tạo mẫu đầu tiên</Button>
            </div>
          )}
          {data.templates.map((t) => (
            <section key={t.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap gap-2 justify-between">
                <h2 className="font-semibold">
                  {t.name} · v{t.revision}
                </h2>
                <Badge variant="secondary">{WORKFLOW_STATUS[t.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.code}
                {t.description && ` · ${t.description}`}
              </p>
              <ol className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3" aria-label={`Các bước của ${t.name}`}>
                {t.steps.map((b, i) => (
                  <li key={b.id} className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{i + 1}</span>
                    <div className="min-w-0 flex-1"><p className="font-medium break-words">{b.name}</p><Badge variant="outline" className="my-1">{b.kind === "APPROVAL" ? "Duyệt" : "Thực hiện"}</Badge><p className="text-xs text-muted-foreground">{b.assignment === "REQUESTER_DEPARTMENT_HEAD" ? "Phụ trách phòng người gửi" : b.employeeName || "Chưa phân công"}</p></div>
                    {i < t.steps.length - 1 && <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
              {manage && (
                <div className="flex flex-wrap gap-2">
                  {t.status === "DRAFT" && (
                    <>
                      <Button variant="outline" onClick={() => setEditing(t)}>
                        Sửa mẫu
                      </Button>
                      <Button
                        onClick={() =>
                          setConfirmation({ template: t, command: "PUBLISH" })
                        }
                      >
                        Phát hành
                      </Button>
                    </>
                  )}
                  {t.status === "PUBLISHED" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setConfirmation({ template: t, command: "RETIRE" })
                      }
                    >
                      Ngừng dùng
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setConfirmation({ template: t, command: "COPY" })
                    }
                  >
                    Tạo phiên bản mới
                  </Button>
                </div>
              )}
            </section>
          ))}
        </TabsContent>
      </Tabs>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa mẫu nháp" : "Tạo mẫu quy trình"}
            </DialogTitle>
            <DialogDescription>
              Mỗi bước một người xử lý. Chọn phụ trách phòng không tự cấp quyền
              duyệt.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <TemplateForm
              people={data.people}
              initial={
                editing
                  ? {
                      id: editing.id,
                      version: editing.version,
                      code: editing.code,
                      name: editing.name,
                      description: editing.description,
                      steps: editing.steps.map(
                        ({
                          name,
                          instructions,
                          kind,
                          assignment,
                          employeeId,
                        }) => ({
                          name,
                          instructions,
                          kind,
                          assignment,
                          employeeId,
                        }),
                      ),
                    }
                  : undefined
              }
              done={() => {
                setEditing(undefined);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo hồ sơ quy trình</DialogTitle>
            <DialogDescription>
              Lưu nháp để kiểm tra nội dung trước khi gửi.
            </DialogDescription>
          </DialogHeader>
          <DraftForm
            templates={data.templates.filter((t) => t.status === "PUBLISHED")}
            done={(id) => {
              setCreating(false);
              router.push(`/workflows/${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmation(null);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xác nhận thay đổi mẫu</DialogTitle>
            <DialogDescription>
              {confirmation?.command === "PUBLISH"
                ? "Phát hành sẽ khóa nội dung mẫu và thay phiên bản đang phát hành cùng mã. Hồ sơ đang xử lý vẫn giữ bản cũ."
                : confirmation?.command === "RETIRE"
                  ? "Ngừng nhận hồ sơ mới. Hồ sơ đang xử lý tiếp tục bình thường."
                  : "Tạo bản nháp mới từ mẫu này. Bản hiện tại vẫn được giữ nguyên."}
            </DialogDescription>
          </DialogHeader>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!confirmation) return;
                const r = await changeWorkflowTemplate({
                  id: confirmation.template.id,
                  version: confirmation.template.version,
                  command: confirmation.command,
                });
                if (!r.success) {
                  toast.error(r.message);
                  return;
                }
                toast.success(r.message);
                setConfirmation(null);
                router.refresh();
              })
            }
          >
            {pending ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
