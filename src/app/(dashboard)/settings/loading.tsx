import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return <div role="status" aria-label="Đang tải cài đặt" className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
    <Skeleton className="h-14 w-64" /><div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>
  </div>;
}
