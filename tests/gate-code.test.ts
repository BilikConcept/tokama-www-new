import assert from "node:assert/strict";
import test from "node:test";
import { TOKAMA_GLOBAL_GATE_CODE } from "../lib/tokama/gateCode.ts";

test("uses the gate code required by the production database constraint", () => {
  assert.equal(TOKAMA_GLOBAL_GATE_CODE, "1515");
});
