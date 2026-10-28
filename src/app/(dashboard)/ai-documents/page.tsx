import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PauseCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tính năng tạm hoãn | SDG ERP" };

// Keep old bookmarks useful without loading the retired prototype.
export default async function PausedAIDocumentsPage() {
  if (!(await getSession())) redirect("/login");
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center">
      <PauseCircle className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Tính năng tạm hoãn</h1>
      <p className="text-muted-foreground">
        Hồ sơ thanh toán AI đang tạm dừng. Chức năng thử nghiệm hiện không còn được cung cấp.
      </p>
      <Button asChild className="h-10"><Link href="/">Về trang tổng quan</Link></Button>
    </section>
  );
}
