import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageAccounts } from "@/lib/account-access";
import { getAccounts } from "@/actions/account";
import { db } from "@/lib/db";
import { AccountManager } from "@/components/accounts/AccountManager";
export const metadata = { title: "Tài khoản đăng nhập | SDG ERP" };
export default async function AccountsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageAccounts(session))
    return <p>Không có quyền quản lý tài khoản.</p>;
  const [result, employees, roles] = await Promise.all([
    getAccounts(),
    db.nhan_su.findMany({
      where: { company_id: session.companyId },
      select: { id: true, ho_ten: true, ma_nhan_su: true, tinh_trang_lam_viec: true },
      orderBy: { ho_ten: "asc" },
    }),
    db.vai_tro.findMany({
      where: { company_id: session.companyId },
      select: { id: true, ten_vai_tro: true },
      orderBy: { ten_vai_tro: "asc" },
    }),
  ]);
  if (!result.success) return <p>{result.message}</p>;
  return (
    <AccountManager
      accounts={result.data}
      employees={employees}
      roles={roles}
    />
  );
}
