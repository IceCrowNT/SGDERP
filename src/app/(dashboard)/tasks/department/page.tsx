import { Suspense } from "react";
import { getSupportTasks } from "@/actions/support-task";
import { TaskBoard, TaskListError } from "@/components/tasks/TaskBoard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseTaskQuery,
  taskListHref,
  type TaskSearchParams,
} from "@/lib/task-navigation";
export const metadata = { title: "Việc phòng ban | SDG ERP" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<TaskSearchParams>;
}) {
  const filters = parseTaskQuery(await searchParams, true),
    data = await getSupportTasks(filters);
  if (!data.success) return <TaskListError {...data} />;
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <TaskBoard
        key={taskListHref("/tasks/department", filters)}
        initial={data}
        initialFilters={filters}
        department
      />
    </Suspense>
  );
}
