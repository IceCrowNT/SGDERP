import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRoles } from "@/actions/role";
import { RoleManager } from "@/components/roles/RoleManager";
export const metadata = { title: "Vai trò và phân quyền | SDG ERP" };
export default async function RolesPage() {
  if (!(await getSession())) redirect("/login");
  const result = await getRoles();
  if (!result.success) return <p>{result.message}</p>;
  return <RoleManager data={result} />;
}
