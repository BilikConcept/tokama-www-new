import assert from "node:assert/strict";
import test from "node:test";
import { TOKAMA_BANK_TRANSFER } from "../lib/payments/bank-transfer.ts";

test("uses the exact TOKAMA bank account from the supplied document", () => {
  assert.equal(
    TOKAMA_BANK_TRANSFER.accountNumber,
    "81 1140 2004 0000 3202 8261 2672"
  );
  assert.equal(
    TOKAMA_BANK_TRANSFER.accountNumberCompact,
    "81114020040000320282612672"
  );
  assert.equal(TOKAMA_BANK_TRANSFER.swift, "BREXPLPWMBK");
});

test("uses the fixed transfer title requested by TOKAMA", () => {
  assert.equal(TOKAMA_BANK_TRANSFER.transferTitle, "pobyt w TOKAMA");
});
