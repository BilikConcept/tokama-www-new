import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeCalendarUrl, parseIcalEvents } from "../lib/tokama/calendars.ts";
import { isTokamaCronAuthorized } from "../lib/tokama/cronAuth.ts";

test("parses all-day iCal reservations and ignores cancelled events", () => {
  const events = parseIcalEvents(`BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:booking-1\r
DTSTART;VALUE=DATE:20260910\r
DTEND;VALUE=DATE:20260913\r
SUMMARY:Reserved\, Booking.com\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:cancelled-1\r
DTSTART;VALUE=DATE:20260920\r
DTEND;VALUE=DATE:20260922\r
STATUS:CANCELLED\r
END:VEVENT\r
END:VCALENDAR`);

  assert.deepEqual(events, [{ uid: "booking-1", startDate: "2026-09-10", endDate: "2026-09-13", summary: "Reserved, Booking.com" }]);
});

test("unfolds wrapped iCal fields", () => {
  const events = parseIcalEvents(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:aloha-1\nDTSTART:20261001T120000Z\nDTEND:20261003T100000Z\nSUMMARY:Aloha\n Camp\nEND:VEVENT\nEND:VCALENDAR`);
  assert.equal(events[0]?.summary, "AlohaCamp");
});

test("calendar imports only accept public HTTPS URLs", () => {
  assert.equal(assertSafeCalendarUrl("https://calendar.example.com/feed.ics"), "https://calendar.example.com/feed.ics");
  assert.throws(() => assertSafeCalendarUrl("http://calendar.example.com/feed.ics"));
  assert.throws(() => assertSafeCalendarUrl("https://127.0.0.1/feed.ics"));
  assert.throws(() => assertSafeCalendarUrl("https://internal.local/feed.ics"));
});

test("calendar cron requires the configured bearer secret", () => {
  const previousCronSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-calendar-cron-secret";

  try {
    assert.equal(isTokamaCronAuthorized(new Request("https://tokama.pl/api/tokama-cron/sync-calendars")), false);
    assert.equal(isTokamaCronAuthorized(new Request("https://tokama.pl/api/tokama-cron/sync-calendars", {
      headers: { Authorization: "Bearer wrong-secret" },
    })), false);
    assert.equal(isTokamaCronAuthorized(new Request("https://tokama.pl/api/tokama-cron/sync-calendars", {
      headers: { Authorization: "Bearer test-calendar-cron-secret" },
    })), true);
  } finally {
    if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCronSecret;
  }
});
