import assert from "node:assert/strict";
import test from "node:test";
import { isPackageArrivalAvailable, validatePackageStay } from "../lib/tokama/packageAvailability.ts";

test("accepts only configured package arrival weekdays", () => {
  assert.equal(isPackageArrivalAvailable("2026-09-28", { weekdays: [1, 5] }), true);
  assert.equal(isPackageArrivalAvailable("2026-09-29", { weekdays: [1, 5] }), false);
});

test("enforces package validity period for the whole stay", () => {
  const availability = { valid_from: "2026-09-01", valid_to: "2026-09-30", weekdays: [1, 2, 3, 4, 5, 6, 7] };
  assert.equal(validatePackageStay("2026-09-12", "2026-09-14", availability), true);
  assert.equal(validatePackageStay("2026-09-29", "2026-10-01", availability), false);
});

test("rejects a stay when checkout falls on an inactive weekday", () => {
  assert.equal(validatePackageStay("2026-10-02", "2026-10-03", { weekdays: [1, 2, 3, 4, 5] }), false);
});
