import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Đang tải vai trò" className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-20" />
      <Skeleton className="h-64" />
    </div>
  );
}
