import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ManagementBreadcrumb({ current }: { current: string }) {
  return <nav aria-label="Đường dẫn hạng mục" className="mb-5 flex min-w-0 items-center gap-2 text-sm">
    <Link href="/asset-management" className="inline-flex min-h-10 shrink-0 items-center text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">Tài sản & vật tư</Link>
    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    <span aria-current="page" className="min-w-0 truncate">{current}</span>
  </nav>;
}
