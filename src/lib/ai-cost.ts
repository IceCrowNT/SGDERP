import { Prisma } from "@prisma/client";
import type { AiPrices } from "@/lib/validations/ai-governance";

// USD, round up to the ledger's micro-dollar precision. Cached tokens are part of input.
export function aiCost(prices: AiPrices, input: number, cached: number, output: number) {
  const estimate = new Prisma.Decimal(prices.input).mul(input - cached).add(new Prisma.Decimal(prices.cached).mul(cached))
    .add(new Prisma.Decimal(prices.output).mul(output)).div(1_000_000).toDecimalPlaces(6, Prisma.Decimal.ROUND_CEIL);
  // Decimal(18,6) has 12 integer digits. An unusable estimate must never discard valid token usage.
  return estimate.lt("1000000000000") ? estimate : null;
}
