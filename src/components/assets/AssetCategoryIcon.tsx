import { BatteryCharging, Laptop, Monitor, Network, Package, Phone, Printer, Router, ScanLine, Server, Wifi, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  PC: Monitor, DESKTOP: Monitor, LAPTOP: Laptop,
  AP: Wifi, WIFI_AP: Wifi, WIFI: Wifi,
  TEL: Phone, PHONE: Phone, PBX: Phone,
  SRV: Server, SERVER: Server, UPS: BatteryCharging,
  LB: Router, LOAD_BALANCER: Router, SW: Network, SWITCH: Network,
  PRN: Printer, PRINTER: Printer, MAY_IN: Printer,
  SCN: ScanLine, SCANNER: ScanLine, MAY_SCAN: ScanLine,
};

/** Presentation only: category codes stay unchanged; unknown categories use a box. */
export function AssetCategoryIcon({ code, className }: { code: string; className?: string }) {
  const Icon = icons[code.toUpperCase()] ?? Package;
  return <Icon aria-hidden="true" className={cn("size-5 shrink-0 text-muted-foreground", className)} />;
}
