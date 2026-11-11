import { redirect } from "next/navigation";
import { HCNS_URL } from "@/lib/office-3d/building-navigation";

// Preserve saved links; the building owns the only viewer.
export default function HcnsRoomPage() {
  redirect(HCNS_URL);
}
