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
    db.employee.findMany({
      where: { companyId: session.companyId },
      select: { id: true, fullName: true, employeeCode: true },
      orderBy: { fullName: "asc" },
    }),
    db.role.findMany({
      where: { companyId: session.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
