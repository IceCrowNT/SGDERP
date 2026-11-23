"use client"

import { useState, type ReactNode } from "react"
import type { SessionUser } from "@/lib/auth"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { AppContent } from "./AppContent"

/** Keep navigation state above the page so route changes preserve the user's choice. */
export function AppShell({ session, children }: { session: SessionUser | null; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3 focus:text-foreground focus:ring-2 focus:ring-ring">Đến nội dung chính</a>
      <Header session={session} collapsed={collapsed} onToggleSidebar={() => setCollapsed(value => !value)} />
      <div className="flex min-w-0">
        <Sidebar session={session} collapsed={collapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppContent>{children}</AppContent>
        </div>
      </div>
    </div>
  )
}
