"use client";

import { useEffect, useState, useTransition } from "react";
import { getMyAiUsage } from "@/actions/ai-governance";
import { Button } from "@/components/ui/button";

export function AiBudgetSummary({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof getMyAiUsage>> | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    let active = true;
    getMyAiUsage().then(value => { if (active) setResult(value); }).catch(() => { if (active) setResult({ success: false, message: "Chưa tải được hạn mức AI." }); });
    return () => { active = false; };
  }, [refreshKey]);
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
    {result?.success ? <div className="space-y-1"><p>Ngân sách của bạn · {result.month}: {result.limit === null ? "Không giới hạn" : result.remaining === null ? "Chưa xác định phần còn lại" : `còn ${result.remaining} / ${result.limit} USD`} · đã đối chiếu {result.used} USD.{result.unknown ? " Các khoản chưa rõ chi phí tạm chưa tính vào hạn mức." : ""}</p>{!result.canCall && <p>Tài khoản chưa được mở dùng trợ lý AI.</p>}</div> : <p>{result?.message ?? "Đang tải hạn mức…"}</p>}
    <Button type="button" variant="ghost" size="sm" className="min-h-10" disabled={pending} onClick={() => start(async () => { try { setResult(await getMyAiUsage()); } catch { setResult({ success: false, message: "Chưa tải được hạn mức AI." }); } })}>Tải hạn mức</Button>
  </div>;
}
