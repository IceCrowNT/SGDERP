import { getSession } from "@/lib/auth";
import { AppShell } from "./AppShell";
import { TaskDraftProvider } from "@/components/tasks/TaskDraftProvider";

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession({ allowPasswordChange: true });

  return (
    <AppShell session={session}>
      <TaskDraftProvider
        key={
          session
            ? `${session.companyId}:${session.userId}:${session.sessionVersion}:${session.taskActions?.join(",")}`
            : "signed-out"
        }
      >
        {children}
      </TaskDraftProvider>
    </AppShell>
  );
}
