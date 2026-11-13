import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div role="status" aria-label="Đang tải tài sản" className="space-y-5"><Skeleton className="h-9 w-64" /><Skeleton className="h-10 w-full" /><Skeleton className="h-12 w-72 max-w-full" /><div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div></div>;
}
