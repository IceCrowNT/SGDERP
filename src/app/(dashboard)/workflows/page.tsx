import { WorkflowSetup } from "@/components/workflows/WorkflowSetup";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { getWorkflowWorkspace } from "@/actions/workflow";
import { WorkflowWorkspace } from "@/components/workflows/WorkflowWorkspace";
export const metadata = { title: "Quy trình và duyệt công việc | SDG ERP" };
export default async function WorkflowsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getWorkflowWorkspace();
  if (!data.success)
    return (
      <WorkflowSetup canManageRoles={hasPermission(session, "ROLES", "MANAGE")} />
    );
  return <WorkflowWorkspace data={data} />;
}
