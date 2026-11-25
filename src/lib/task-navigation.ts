import { TaskListSchema } from "./support-task";
import type { z } from "zod";
export type TaskFilters = z.infer<typeof TaskListSchema>;
export type TaskSearchParams = Record<string, string | string[] | undefined>;
/** Whitelist query fields; URLs are navigation state, never trusted action input. */
export function parseTaskQuery(
  params: TaskSearchParams,
  department = false,
): TaskFilters {
  const scalar = (key: string) =>
    typeof params[key] === "string" ? params[key] : undefined;
  const field = <K extends keyof TaskFilters>(
    key: K,
    value: unknown,
  ): TaskFilters[K] => {
    const result = TaskListSchema.shape[key].safeParse(value);
    return (
      result.success ? result.data : TaskListSchema.shape[key].parse(undefined)
    ) as TaskFilters[K];
  };
  const tab = field("tab", scalar("tab"));
  return {
    tab: department ? "department" : tab === "department" ? "all" : tab,
    search: field("search", scalar("search")),
    category: field("category", scalar("category")),
    status: field("status", scalar("status")),
    overdue: scalar("overdue") === "1",
    page: field("page", scalar("page") ? Number(scalar("page")) : undefined),
  };
}
export function taskListHref(
  path: "/tasks" | "/tasks/department",
  filters: TaskFilters,
  task?: number,
) {
  const query = new URLSearchParams();
  if (filters.tab !== "all" && filters.tab !== "department")
    query.set("tab", filters.tab);
  if (filters.search) query.set("search", filters.search);
  if (filters.category !== "ALL") query.set("category", filters.category);
  if (filters.status !== "ALL") query.set("status", filters.status);
  if (filters.overdue) query.set("overdue", "1");
  if (filters.page > 1) query.set("page", String(filters.page));
  if (task && Number.isSafeInteger(task) && task > 0)
    query.set("task", String(task));
  return path + (query.size ? `?${query}` : "");
}
export function taskReturnHref(value: string | string[] | undefined) {
  if (
    typeof value !== "string" ||
    !/^\/tasks(?:\/department)?(?:\?|$)/.test(value)
  )
    return "/tasks";
  const url = new URL(value, "https://erp.invalid");
  if (
    url.origin !== "https://erp.invalid" ||
    !["/tasks", "/tasks/department"].includes(url.pathname)
  )
    return "/tasks";
  const path = url.pathname as "/tasks" | "/tasks/department";
  return taskListHref(
    path,
    parseTaskQuery(
      Object.fromEntries(url.searchParams),
      path.endsWith("department"),
    ),
  );
}
