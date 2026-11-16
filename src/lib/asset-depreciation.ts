/** Calendar dates are UTC civil dates; the reporting day follows Vietnam time. */
export function dateInput(value: Date | string | null | undefined): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value?.slice(0, 10) ?? "";
}
export function todayVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function validAssetDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function displayAssetDate(value: Date | string | null | undefined): string {
  const date = dateInput(value);
  return date ? date.split("-").reverse().join("/") : "Chưa xác định";
}
export function displayVnd(value: string | null | undefined): string {
  return value !== null && value !== undefined && /^\d+$/.test(value)
    ? `${BigInt(value).toLocaleString("vi-VN")} ₫` : "Chưa xác định";
}
export function assetDepreciation(purchase: Date | string | null, months: number | null, price?: string | null, asOf = todayVietnam()) {
  const startDate = dateInput(purchase);
  if (!validAssetDate(startDate) || !months || !Number.isInteger(months) || months < 1 || months > 1200 || !validAssetDate(asOf)) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  const daysLeft = Math.min(totalDays, Math.max(0, Math.round((end.getTime() - new Date(`${asOf}T00:00:00Z`).getTime()) / 86400000)));
  const remainingPercent = Math.round(daysLeft / totalDays * 100);
  const remainingValue = price && /^\d+$/.test(price)
    ? ((BigInt(price) * BigInt(daysLeft) + BigInt(Math.floor(totalDays / 2))) / BigInt(totalDays)).toString() : null;
  return { remainingPercent, remainingValue, endDate: `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`, completed: daysLeft === 0,
    tone: remainingPercent > 50 ? "green" as const : remainingPercent > 20 ? "yellow" as const : "red" as const };
}
