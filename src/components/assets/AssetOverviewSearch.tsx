"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Boxes, Package, Paperclip, Search, X } from "lucide-react";
import { searchAssetOverview } from "@/actions/asset-overview-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const kinds = {
  asset: { label: "Tài sản", icon: Package },
  consumable: { label: "Vật tư tiêu hao", icon: Boxes },
  accessory: { label: "Phụ kiện", icon: Paperclip },
};
type Result = Awaited<ReturnType<typeof searchAssetOverview>>;

export function AssetOverviewSearch() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const [response, setResponse] = useState<{ query: string; result: Result } | null>(null);
  const [open, setOpen] = useState(true);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const term = query.trim();
  const result = response?.query === term ? response.result : null;

  useEffect(() => {
    if (!term) return;
    let cancelled = false;
    const timer = setTimeout(() => startTransition(async () => {
      let next: Result;
      try { next = await searchAssetOverview(term); }
      catch { next = { success: false, message: "Chưa tìm được dữ liệu. Vui lòng thử lại." }; }
      if (!cancelled) setResponse({ query: term, result: next });
    }), 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, retry]);

  function change(value: string) {
    setOpen(true);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  }

  return <section aria-label="Tìm kiếm tài sản và vật tư" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); input.current?.focus(); setOpen(false); }
  }}>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden="true" />
      <Input ref={input} type="search" value={query} maxLength={120} autoComplete="off"
        aria-label="Tìm mã, tên tài sản hoặc vật tư" placeholder="Tìm mã, tên tài sản hoặc vật tư…"
        className="h-11 pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none" aria-controls={open && term ? "asset-overview-results" : undefined}
        onChange={event => change(event.target.value)} onFocus={() => setOpen(true)}
        onKeyDown={event => {
          if ((event.key === "ArrowDown" || event.key === "Enter") && open && result?.success) {
            event.preventDefault(); results.current?.querySelector<HTMLAnchorElement>("a")?.focus();
          }
        }} />
      {query && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-0.5 size-10" aria-label="Xóa từ khóa" onClick={() => { change(""); input.current?.focus(); }}><X aria-hidden="true" /></Button>}
    </div>
    {term && open && <div id="asset-overview-results" className="mt-2 overflow-hidden rounded-xl border bg-card">
      <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
        {!result ? "Đang tìm…" : !result.success ? result.message : !result.rows.length ? "Không tìm thấy kết quả phù hợp." : result.hasMore ? "8 kết quả đầu tiên · Nhập cụ thể hơn để thu hẹp" : `${result.rows.length} kết quả`}
      </p>
      {result && !result.success && <Button className="mb-3 ml-4" variant="outline" onClick={() => { setResponse(null); setRetry(value => value + 1); }}>Thử lại</Button>}
      {result?.success && <ul ref={results} className="divide-y" onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        const links = Array.from(results.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
        const index = links.indexOf(document.activeElement as HTMLAnchorElement);
        if (index < 0) return;
        event.preventDefault();
        if (event.key === "ArrowUp" && index === 0) input.current?.focus();
        else links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
      }}>
        {result.rows.map(row => { const kind = kinds[row.kind]; return <li key={`${row.kind}:${row.id}`}>
          <Link href={row.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
            <kind.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{row.name}</p><p className="mt-1 break-words text-xs text-muted-foreground">{row.code} · {kind.label} · {row.category}</p></div>
          </Link>
        </li>; })}
      </ul>}
    </div>}
  </section>;
}
