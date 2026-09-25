import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymentSms } from "../lib/payments/paymentSms.ts";

test("Polish payment SMS combines acceptance, amount, link and bank transfer", () => {
  const sms = buildPaymentSms({
    locale: "pl",
    publicCode: "TOK-0086",
    amount: "2400 zł",
    paymentPageUrl: "https://tokama-www-new.vercel.app/platnosc/TOK-0086",
  });

  assert.match(sms, /Pobyt w TOKAMA został zaakceptowany/);
  assert.match(sms, /TOK-0086/);
  assert.match(sms, /2400 zł/);
  assert.match(sms, /tokama-www-new\.vercel\.app\/platnosc\/TOK-0086/);
  assert.match(sms, /TKM GROUP sp\. z o\.o\./);
  assert.match(sms, /81 1140 2004 0000 3202 8261 2672/);
  assert.match(sms, /pobyt w TOKAMA/);
});

test("English payment SMS includes international transfer details", () => {
  const sms = buildPaymentSms({
    locale: "en",
    publicCode: "TOK-0087",
    amount: "PLN 1200",
    paymentPageUrl: "https://tokama-www-new.vercel.app/platnosc/TOK-0087",
  });

  assert.match(sms, /Your TOKAMA stay has been accepted/);
  assert.match(sms, /BREXPLPWMBK/);
  assert.match(sms, /pobyt w TOKAMA/);
});
