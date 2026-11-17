"use client";

import { useState, useTransition } from "react";
import { getAiGovernance } from "@/actions/ai-governance";
import { getAiConnections } from "@/actions/ai-settings";
import { AI_JOBS, AI_JOB_LABELS, type AiJob } from "@/lib/validations/ai-governance";
import type { AiConnectionsView } from "@/lib/validations/ai-settings";
import { AiConnections } from "./AiConnections";
import { AiJobForm, AiLimitForm, AiPolicyForm, type GovernanceData } from "./AiGovernanceForms";
import { AiUsagePanel } from "./AiUsagePanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function AiGovernance({ initial, initialConnections }: { initial: GovernanceData; initialConnections: AiConnectionsView | null }) {
  const [data, setData] = useState(initial), [connections, setConnections] = useState(initialConnections);
  const [editing, setEditing] = useState<{ kind: "policy" | "account"; id: number } | { kind: "job"; job: AiJob } | null>(null);
  const [error, setError] = useState(""), [pending, start] = useTransition();
  function reload(next: typeof editing = null) {
    start(async () => {
      setError(""); try {
        const value = await getAiGovernance(); if (!value.success) { setError(value.message); return; }
        setData(value);
        if (value.permissions.manage) { const list = await getAiConnections(); if (list.success) setConnections(list); }
        setEditing(next);
      } catch { setError("Chưa tải được cấu hình AI. Hãy thử lại."); }
    });
  }
  const policy = editing?.kind === "policy" ? data.connections.find(row => row.id === editing.id) : undefined;
  const account = editing?.kind === "account" ? data.accounts.find(row => row.id === editing.id) : undefined;
  const job = editing?.kind === "job" ? editing.job : null;
  const config = job ? data.jobs.find(row => row.job === job) : undefined;
  return <div className="space-y-4">
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Tabs defaultValue={data.permissions.manage ? "connections" : data.permissions.limits ? "limits" : "usage"}>
      <TabsList className="mb-4 grid w-full grid-cols-2 gap-1 bg-muted/60 p-1 group-data-[orientation=horizontal]/tabs:h-auto sm:flex sm:flex-wrap">
        {data.permissions.manage && <><TabsTrigger value="connections" className="h-auto min-h-10">Kết nối & model</TabsTrigger><TabsTrigger value="jobs" className="h-auto min-h-10">Theo tác vụ</TabsTrigger></>}
        {data.permissions.limits && <TabsTrigger value="limits" className="h-auto min-h-10">Hạn mức tài khoản</TabsTrigger>}
        {data.permissions.usage && <TabsTrigger value="usage" className="h-auto min-h-10">Mức sử dụng</TabsTrigger>}
      </TabsList>
      {data.permissions.manage && <>
        <TabsContent value="connections" className="min-w-0 space-y-4"><p className="text-sm text-muted-foreground">Hạn mức để trống là không giới hạn. Khi áp dụng trần ngân sách cần cấu hình đơn giá; tác vụ chưa cấu hình riêng dùng kết nối mặc định.</p>{connections && <AiConnections key={data.connections.map(row => row.version).join()} initial={connections} onPolicy={id => reload({ kind: "policy", id })} />}</TabsContent>
        <TabsContent value="jobs" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Cấu hình kết nối/model cho tác vụ được chọn trong chat.</p><Button variant="outline" disabled={pending} onClick={() => reload()}>Tải lại cấu hình</Button></div>
          {AI_JOBS.map(job => { const row = data.jobs.find(item => item.job === job), connection = data.connections.find(item => item.id === row?.connectionId); return <article key={job} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><h3 className="font-semibold">{AI_JOB_LABELS[job]}</h3><p className="mt-1 break-all text-sm text-muted-foreground">{connection?.name ?? "Kết nối mặc định"} · {row?.model ?? "Model của kết nối"}</p>{job === "LOOKUP" && <p className="mt-1 text-xs text-muted-foreground">Chỉ tra cứu; không lập bản nháp hoặc công việc.</p>}</div><Button variant="outline" disabled={pending} onClick={() => reload({ kind: "job", job })}>Cấu hình tác vụ</Button></article>; })}
        </TabsContent>
      </>}
      {data.permissions.limits && <TabsContent value="limits" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">USD mỗi tháng lịch theo giờ Việt Nam. Để trống là không giới hạn; mức 0 chặn gọi có phí. Hạn mức không thay quyền dùng AI.</p><Button variant="outline" disabled={pending} onClick={() => reload()}>Tải lại hạn mức</Button></div>
        {data.accounts.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><h3 className="font-medium">{row.name}</h3><p className="text-sm text-muted-foreground">{row.username}{!row.active ? " · Đã khóa" : ""}</p><p className="mt-2 tabular-nums">{row.limit === null ? "Không giới hạn" : `${row.limit} USD/tháng`}</p></div><Button variant="outline" disabled={pending} onClick={() => reload({ kind: "account", id: row.id })}>Sửa hạn mức</Button></article>)}
      </TabsContent>}
      {data.permissions.usage && <TabsContent value="usage" className="min-w-0"><AiUsagePanel data={data} /></TabsContent>}
    </Tabs>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" onInteractOutside={event => event.preventDefault()}><DialogHeader><DialogTitle>{policy ? `Ngân sách · ${policy.name}` : account ? "Hạn mức tài khoản" : job ? AI_JOB_LABELS[job] : "Cấu hình AI"}</DialogTitle><DialogDescription>Thay đổi áp dụng cho lần gọi tiếp theo; lịch sử sử dụng được giữ nguyên.</DialogDescription></DialogHeader>
      {policy && <AiPolicyForm key={policy.version} row={policy} done={() => reload()} />}
      {account && <AiLimitForm key={account.version} row={account} done={() => reload()} />}
      {job && <AiJobForm key={`${job}:${config?.version ?? "new"}`} initial={{ job, version: config?.version ?? null, connectionId: config?.connectionId ?? null, model: config?.model ?? null, prices: config?.prices ?? null }} connections={data.connections} done={() => reload()} />}
    </DialogContent></Dialog>
  </div>;
}
