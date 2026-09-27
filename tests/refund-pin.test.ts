import assert from "node:assert/strict";
import test from "node:test";
import { hashRefundPin, validateRefundPin, verifyRefundPin } from "../lib/tokama/refundPin.ts";

test("refund PIN accepts exactly four digits", () => {
  assert.equal(validateRefundPin("1234"), true);
  assert.equal(validateRefundPin("123"), false);
  assert.equal(validateRefundPin("12a4"), false);
});

test("refund PIN is stored as a salted hash and verified safely", () => {
  const encoded = hashRefundPin("4821");
  assert.equal(encoded.includes("4821"), false);
  assert.equal(verifyRefundPin("4821", encoded), true);
  assert.equal(verifyRefundPin("4822", encoded), false);
});
