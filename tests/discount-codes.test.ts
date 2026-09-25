import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDiscountCents,
  isDiscountCodeAvailable,
  normalizeDiscountCode,
} from "../lib/tokama/discounts.ts";

test("normalizes discount codes consistently", () => {
  assert.equal(normalizeDiscountCode("  tokama- lato  "), "TOKAMA-LATO");
});

test("calculates a percentage discount in cents", () => {
  assert.equal(calculateDiscountCents(240000, 10), 24000);
  assert.equal(calculateDiscountCents(100, 150), 100);
});

test("accepts only active discount codes inside their validity window", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  assert.equal(
    isDiscountCodeAvailable(
      {
        is_active: true,
        valid_from: "2026-08-01T00:00:00.000Z",
        expires_at: "2026-08-31T23:59:59.000Z",
      },
      now
    ),
    true
  );
  assert.equal(
    isDiscountCodeAvailable(
      {
        is_active: false,
        valid_from: null,
        expires_at: null,
      },
      now
    ),
    false
  );
  assert.equal(
    isDiscountCodeAvailable(
      {
        is_active: true,
        valid_from: null,
        expires_at: "2026-08-14T23:59:59.000Z",
      },
      now
    ),
    false
  );
});

test("accepts a discount only on configured arrival weekdays", () => {
  const discount = {
    is_active: true,
    valid_from: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-09-30T23:59:59.999Z",
    weekdays: [5, 6],
  };
  assert.equal(isDiscountCodeAvailable(discount, new Date("2026-09-25T12:00:00Z")), true);
  assert.equal(isDiscountCodeAvailable(discount, new Date("2026-09-24T12:00:00Z")), false);
});
