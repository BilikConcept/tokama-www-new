import assert from "node:assert/strict";
import test from "node:test";
import { calculateDynamicStayPrice, resolveNightlyPrices, type PricingRule } from "../lib/tokama/pricing.ts";

const weekend: PricingRule = {
  id: "weekend",
  name: "Weekend",
  price_cents: 150000,
  valid_from: null,
  valid_to: null,
  weekdays: [5, 6],
  priority: 10,
  is_active: true,
};

test("uses the base price when no dynamic rule matches", () => {
  const nights = resolveNightlyPrices({ checkin: "2026-09-21", checkout: "2026-09-23", basePriceCents: 120000, rules: [weekend] });
  assert.deepEqual(nights.map(night => night.price_cents), [120000, 120000]);
});

test("prices every night independently and multiplies by the number of houses", () => {
  const result = calculateDynamicStayPrice({ checkin: "2026-09-24", checkout: "2026-09-27", housesCount: 2, basePriceCents: 120000, rules: [weekend] });
  assert.deepEqual(result.nightlyPrices.map(night => night.price_cents), [120000, 150000, 150000]);
  assert.equal(result.totalCents, 840000);
});

test("the highest priority matching rule wins", () => {
  const special: PricingRule = { ...weekend, id: "special", name: "Święto", price_cents: 200000, valid_from: "2026-09-25", valid_to: "2026-09-25", priority: 100 };
  const nights = resolveNightlyPrices({ checkin: "2026-09-25", checkout: "2026-09-26", basePriceCents: 120000, rules: [weekend, special] });
  assert.equal(nights[0].price_cents, 200000);
  assert.equal(nights[0].rule_name, "Święto");
});
