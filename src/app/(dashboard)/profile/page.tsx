import { redirect } from "next/navigation";
import { getMyProfile } from "@/actions/profile";
import { ProfileManager } from "@/components/profile/ProfileManager";
export const metadata = { title: "Hồ sơ của tôi | SDG ERP" };
export default async function ProfilePage() {
  const data = await getMyProfile();
  if (!data) redirect("/login");
  return <ProfileManager data={data} />;
}
