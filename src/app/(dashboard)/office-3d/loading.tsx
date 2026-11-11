import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5" aria-label="Đang tải mô hình tòa nhà">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-[600px] w-full rounded-2xl" />
    </div>
  );
}
