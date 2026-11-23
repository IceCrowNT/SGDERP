import { Skeleton } from "@/components/ui/skeleton";

export default function SystemLoading() {
  return <div aria-label="Đang tải quản trị hệ thống" className="space-y-6">
    <Skeleton className="h-8 w-64 max-w-full" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(key => <Skeleton key={key} className="h-32 rounded-xl" />)}</div>
    <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 rounded-xl lg:col-span-2" /><Skeleton className="h-64 rounded-xl" /></div>
  </div>;
}
