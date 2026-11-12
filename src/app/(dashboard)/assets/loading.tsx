import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return <div role="status" aria-label="Đang tải tài sản" className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;
}
