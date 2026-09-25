import assert from "node:assert/strict";
import test from "node:test";
import {
  createP24RegistrationSign,
  createP24VerificationSign,
  safeP24SignEqual,
} from "../lib/payments/p24.ts";

test("creates the official P24 SHA-384 registration checksum", () => {
  assert.equal(
    createP24RegistrationSign({
      sessionId: "unique-session-id",
      merchantId: 999999,
      amount: 1234,
      currency: "PLN",
      crc: "crc-from-p24-panel",
    }),
    "1720ad689f5306f150fb7428482071f2c378f5855604ed83ebca2cee1332c502056070591a29a58107e34ec8fe08e851"
  );
});

test("creates the official P24 SHA-384 verification checksum", () => {
  assert.equal(
    createP24VerificationSign({
      sessionId: "unique-session-id",
      orderId: 999999,
      amount: 1234,
      currency: "PLN",
      crc: "crc-from-p24-panel",
    }),
    "0c46134fe62afb0eec859a751c7d062681074b47f34715d2b8863e409acda2e847c9f166163d0be15c76daaed21ffba9"
  );
});

test("compares P24 signatures without accepting malformed values", () => {
  const sign = "a".repeat(96);
  assert.equal(safeP24SignEqual(sign, sign), true);
  assert.equal(safeP24SignEqual("b".repeat(96), sign), false);
  assert.equal(safeP24SignEqual("short", sign), false);
});
