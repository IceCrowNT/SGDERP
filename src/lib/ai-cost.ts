import { Prisma } from "@prisma/client";
import type { AiPrices } from "@/lib/validations/ai-governance";

// USD, round up to the ledger's micro-dollar precision. Cached tokens are part of input.
export function aiCost(prices: AiPrices, input: number, cached: number, output: number) {
  return new Prisma.Decimal(prices.input).mul(input - cached).add(new Prisma.Decimal(prices.cached).mul(cached))
    .add(new Prisma.Decimal(prices.output).mul(output)).div(1_000_000).toDecimalPlaces(6, Prisma.Decimal.ROUND_CEIL);
}
// Conservative reservation, not a tokenizer or a promise about the provider invoice.
export function aiReserve(prices: AiPrices, body: string, maxOutput: number) {
  return aiCost(prices, Buffer.byteLength(body, "utf8") + 4096, 0, maxOutput);
}
export function usageAmounts(sum: { chi_phi_uoc_tinh: Prisma.Decimal | null; du_phong: Prisma.Decimal | null }, limit: Prisma.Decimal | null, unknown = false) {
  const used = sum.chi_phi_uoc_tinh ?? new Prisma.Decimal(0), held = sum.du_phong ?? new Prisma.Decimal(0);
  return { limit: limit?.toFixed(6) ?? null, used: used.toFixed(6), reserved: held.toFixed(6), remaining: limit && !unknown ? Prisma.Decimal.max(0, limit.sub(used).sub(held)).toFixed(6) : null, unknown };
}
