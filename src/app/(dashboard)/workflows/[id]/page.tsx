import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getWorkflowDetail, getWorkflowWorkspace } from "@/actions/workflow";
import { WorkflowDetail } from "@/components/workflows/WorkflowDetail";
export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getSession())) redirect("/login");
  const { id } = await params;
  const [data, workspace] = await Promise.all([
    getWorkflowDetail(Number(id)),
    getWorkflowWorkspace(),
  ]);
  if (!data.success) return <p>{data.message}</p>;
  if (!workspace.success) return <p>{workspace.message}</p>;
  return <WorkflowDetail data={data} workspace={workspace} />;
}
