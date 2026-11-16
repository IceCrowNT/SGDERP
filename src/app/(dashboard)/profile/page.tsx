import { redirect } from "next/navigation";
import { getMyProfile } from "@/actions/profile";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { assetReturnPath } from "@/lib/asset-link";
export const metadata = { title: "Hồ sơ của tôi | SDG ERP" };
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const returnTo = assetReturnPath((await searchParams).returnTo);
  const data = await getMyProfile();
  if (!data) redirect(`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
  return <ProfileManager data={data} returnTo={returnTo} />;
}
