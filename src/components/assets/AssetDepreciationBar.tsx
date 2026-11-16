import { assetDepreciation } from "@/lib/asset-depreciation";
import { cn } from "@/lib/utils";

export function AssetDepreciationBar({ purchase, months, asOf }: { purchase: Date | string | null; months: number | null; asOf?: string }) {
  const result = assetDepreciation(purchase, months, null, asOf);
  if (!result) return null;
  const label = result.completed ? "Đã hết kỳ khấu hao" : `Khấu hao: còn ${result.remainingPercent}%`;
  return <span className="mt-2 block w-full" role="meter" aria-label="Giá trị khấu hao còn lại" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.remainingPercent} aria-valuetext={label} title={label}>
    <span className={cn("block h-1 overflow-hidden rounded-full bg-muted", result.completed && "bg-red-500/20")}>
      <span className={cn("block h-full rounded-full", result.tone === "green" ? "bg-emerald-500" : result.tone === "yellow" ? "bg-amber-500" : "bg-red-500")} style={{ width: `${result.remainingPercent}%` }} />
    </span>
    <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{label}</span>
  </span>;
}
