import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DepartmentsLoading() {
  return (
    <div className="space-y-6" aria-label="Đang tải cơ cấu tổ chức">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="border-border/60">
            <CardHeader className="space-y-3 p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-7 w-14 animate-pulse rounded bg-muted" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="border-border/60">
            <CardHeader><div className="h-5 w-3/4 animate-pulse rounded bg-muted" /></CardHeader>
            <CardContent className="space-y-3">
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
