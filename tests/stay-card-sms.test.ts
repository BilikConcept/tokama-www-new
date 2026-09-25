import assert from "node:assert/strict";
import test from "node:test";
import { buildStayCardSms } from "../lib/tokama/stayCardSms.ts";

test("Polish Stay Card SMS includes the cottage and explains the reservation number", () => {
  const sms = buildStayCardSms({
    locale: "pl",
    publicCode: "TOK-0088",
    houseCodes: ["TO"],
  });

  assert.match(sms, /Numer rezerwacji: TOK-0088/);
  assert.match(sms, /Domek: TO/);
  assert.match(sms, /otwarcia Karty Pobytu/);
  assert.match(sms, /KANZAN Food & Cocktails/);
});

test("English Stay Card SMS handles multiple cottages", () => {
  const sms = buildStayCardSms({
    locale: "en",
    publicCode: "TOK-0089",
    houseCodes: ["to", "ka"],
  });

  assert.match(sms, /Reservation number: TOK-0089/);
  assert.match(sms, /Cottages: TO, KA/);
  assert.match(sms, /open your Stay Card/);
});
