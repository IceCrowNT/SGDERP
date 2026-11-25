import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { taskReturnHref, type TaskSearchParams } from "@/lib/task-navigation";
export const metadata = { title: "Chi tiết công việc | SDG ERP" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<TaskSearchParams>;
}) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const returnHref = taskReturnHref((await searchParams).returnTo);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <TaskDetail id={id} returnHref={returnHref} standalone />
    </div>
  );
}
