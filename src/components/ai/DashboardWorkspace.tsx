"use client";

import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, ListTodo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function subscribeToDesk(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener("sdg:desk-change", notify);
  window.addEventListener("sdg:open-assistant", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("sdg:desk-change", notify);
    window.removeEventListener("sdg:open-assistant", notify);
  };
}
const currentDeskQuery = () => window.location.search;

export function openAssistant() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("desk") !== "ai") {
    url.searchParams.set("desk", "ai");
    window.history.pushState(null, "", url.pathname + url.search);
  }
  window.dispatchEvent(new Event("sdg:open-assistant"));
}

/** Keep panels mounted: switching tabs must not discard a chat draft or pending request. */
export function DashboardWorkspace({ assistant, aiWorks, children }: { assistant: ReactNode; aiWorks: ReactNode; children: ReactNode }) {
  const params = useSearchParams();
  // Read the browser URL synchronously, including Back/Forward during an AI request.
  const search = useSyncExternalStore(subscribeToDesk, currentDeskQuery, () => params.toString());
  const query = new URLSearchParams(search);
  const tab = query.get("desk") === "work" || (!query.has("desk") && query.has("view")) ? "work" : "ai";
  return <Tabs value={tab} onValueChange={value => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("desk") === value) return;
    url.searchParams.set("desk", value);
    window.history.pushState(null, "", url.pathname + url.search);
    window.dispatchEvent(new Event("sdg:desk-change"));
  }} className="min-h-0 flex-1 gap-3">
    <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2"><h1 className="text-xl font-semibold">Bàn làm việc</h1><TabsList aria-label="Bàn làm việc" className="h-auto min-h-11 w-full shrink-0 sm:w-auto">
      {assistant && <TabsTrigger value="ai" className="min-h-10 px-2 text-xs sm:px-4 sm:text-sm"><Bot aria-hidden="true" className="hidden sm:block" />Trợ lý AI</TabsTrigger>}
      <TabsTrigger value="work" className="min-h-10 px-2 text-xs sm:px-4 sm:text-sm"><ListTodo aria-hidden="true" className="hidden sm:block" />Việc của tôi</TabsTrigger>
    </TabsList><Link href="/profile" className="ml-auto hidden min-h-10 items-center text-sm text-muted-foreground underline-offset-4 hover:underline md:inline-flex">Hồ sơ của tôi</Link></header>
    {assistant && <TabsContent forceMount value="ai" className="min-h-0 data-[state=inactive]:hidden">{assistant}</TabsContent>}
    <TabsContent forceMount value="work" className="min-h-0 space-y-5 overflow-y-auto data-[state=inactive]:hidden">{aiWorks}{children}</TabsContent>
  </Tabs>;
}

/** Workflow filters keep the latest chat URL, including changes made without a server navigation. */
export function DashboardWorkflowLink({ view, page, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { view: string; page?: number }) {
  const params = new URLSearchParams(useSearchParams().toString());
  params.set("desk", "work"); params.set("view", view);
  if (page) params.set("page", String(page)); else params.delete("page");
  return <Link {...props} href={`/?${params}`} scroll={false} />;
}
