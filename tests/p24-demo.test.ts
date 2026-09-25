import assert from "node:assert/strict";
import test from "node:test";
import {
  isP24DemoMethod,
  isP24DemoOutcome,
  resolvePaymentSplit,
} from "../lib/payments/p24-demo.ts";

test("accepts every visible P24 demo method", () => {
  for (const method of ["blik", "card", "apple_pay", "google_pay"]) {
    assert.equal(isP24DemoMethod(method), true);
  }

  assert.equal(isP24DemoMethod("bank_transfer"), false);
});

test("accepts only supported simulation outcomes", () => {
  assert.equal(isP24DemoOutcome("success"), true);
  assert.equal(isP24DemoOutcome("failure"), true);
  assert.equal(isP24DemoOutcome("pending"), false);
});

test("full payment uses the entire reservation total", () => {
  assert.deepEqual(
    resolvePaymentSplit({
      totalCents: 360_000,
      paymentMode: "full",
      requestedOnlineCents: 100_000,
    }),
    {
      paymentMode: "full",
      onlineDueCents: 360_000,
      arrivalDueCents: 0,
    }
  );
});

test("custom payment preserves the remainder for arrival", () => {
  assert.deepEqual(
    resolvePaymentSplit({
      totalCents: 360_000,
      paymentMode: "custom",
      requestedOnlineCents: 120_000,
    }),
    {
      paymentMode: "custom",
      onlineDueCents: 120_000,
      arrivalDueCents: 240_000,
    }
  );
});

test("rejects custom amounts outside the reservation total", () => {
  assert.throws(() =>
    resolvePaymentSplit({
      totalCents: 100_000,
      paymentMode: "custom",
      requestedOnlineCents: 100_001,
    })
  );

  assert.throws(() =>
    resolvePaymentSplit({
      totalCents: 100_000,
      paymentMode: "custom",
      requestedOnlineCents: 99,
    })
  );
});
