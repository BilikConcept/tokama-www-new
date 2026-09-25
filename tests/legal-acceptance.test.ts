import assert from "node:assert/strict";
import test from "node:test";
import {
  TOKAMA_PRIVACY_VERSION,
  TOKAMA_TERMS_VERSION,
  validateLegalAcceptance,
} from "../lib/tokama/legal.ts";

test("accepts the current terms and privacy notice versions", () => {
  assert.equal(
    validateLegalAcceptance({
      termsAccepted: true,
      termsVersion: TOKAMA_TERMS_VERSION,
      privacyAcknowledged: true,
      privacyVersion: TOKAMA_PRIVACY_VERSION,
    }),
    null
  );
});

test("rejects missing consent and stale versions", () => {
  assert.match(
    validateLegalAcceptance({
      termsAccepted: false,
      termsVersion: TOKAMA_TERMS_VERSION,
      privacyAcknowledged: true,
      privacyVersion: TOKAMA_PRIVACY_VERSION,
    }) || "",
    /Regulaminu/
  );

  assert.match(
    validateLegalAcceptance({
      termsAccepted: true,
      termsVersion: "old",
      privacyAcknowledged: true,
      privacyVersion: TOKAMA_PRIVACY_VERSION,
    }) || "",
    /zaktualizowany/
  );
});
