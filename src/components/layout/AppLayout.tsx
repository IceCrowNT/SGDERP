import { getSession } from "@/lib/auth"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Desktop Sidebar (hidden on mobile, visible on lg) */}
      <Sidebar session={session} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Responsive Header (contains Hamburger on mobile) */}
        <Header session={session} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
