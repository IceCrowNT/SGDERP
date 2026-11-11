import type { Metadata } from "next";
import { getHcnsRoom } from "@/actions/office-room";
import { getLocations } from "@/actions/location";
import { EmptyPanel } from "@/components/ui/feature-overview";
import { HcnsRoomExplorer } from "@/components/office-3d/hcns/HcnsRoomExplorer";

export const metadata: Metadata = { title: "Không gian HCNS | SDG ERP" };
export default async function HcnsRoomPage() {
  const result = await getHcnsRoom();
  if (!result.success)
    return (
      <EmptyPanel title="Chưa thể mở phòng HCNS" description={result.message} />
    );
  const assignments = result.room.canManageEmployees
    ? await getLocations()
    : null;
  return (
    <HcnsRoomExplorer
      room={result.room}
      assignmentData={
        assignments?.success &&
        assignments.canManageEmployees &&
        assignments.employees
          ? {
              locations: assignments.rows,
              people: assignments.employees.filter(
                (person) => person.status === "ACTIVE",
              ),
            }
          : null
      }
    />
  );
}
