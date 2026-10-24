import { ApiKeyConnectionSetup } from "@/components/ai-documents/ApiKeyConnectionSetup";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, hasPermission } from "@/lib/auth";
import { PaymentDocumentLab } from "@/components/ai-documents/PaymentDocumentLab";

export const metadata: Metadata = { title: "Hồ sơ thanh toán AI | SDG ERP" };

export default async function AIDocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session, "SYSTEM")) {
    return <div className="rounded-xl border bg-card p-8"><h1 className="text-xl font-semibold">Không có quyền truy cập</h1><p className="mt-2 text-muted-foreground">Bản thử nghiệm hiện dành cho người có quyền Hệ thống.</p></div>;
  }
  return <div className="space-y-6"><PaymentDocumentLab connectionStatus={<ApiKeyConnectionSetup />} /></div>;
}
