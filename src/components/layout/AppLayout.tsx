import { getSession } from "@/lib/auth"
import { AppShell } from "./AppShell"

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({ allowPasswordChange: true })

  return <AppShell session={session}>{children}</AppShell>
}
