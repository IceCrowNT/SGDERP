import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5 p-5" aria-label="Đang tải phòng HCNS">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-[65vh] w-full rounded-2xl" />
    </div>
  );
}
