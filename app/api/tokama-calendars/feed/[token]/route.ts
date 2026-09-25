import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { escapeIcal, toIcalDate } from "@/lib/tokama/calendars";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Not found", { status: 404 });
  const supabase = getSupabaseAdmin();
  const { data: feed } = await supabase.from("tokama_calendar_feeds").select("house_id,house:tokama_houses(code)").eq("token", token).maybeSingle();
  if (!feed) return new NextResponse("Not found", { status: 404 });

  const [{ data: assignments, error: assignmentError }, { data: blocks, error: blocksError }] = await Promise.all([
    supabase.from("tokama_reservation_houses").select("reservation_id").eq("house_id", feed.house_id),
    supabase.from("tokama_house_date_blocks").select("id,start_date,end_date,reason").eq("house_id", feed.house_id),
  ]);
  if (assignmentError || blocksError) return new NextResponse("Calendar unavailable", { status: 500 });

  const reservationIds = (assignments || []).map((item) => item.reservation_id);
  const { data: reservations, error: reservationError } = reservationIds.length
    ? await supabase.from("tokama_reservations").select("id,public_code,checkin,checkout,status").in("id", reservationIds).in("status", ["requested","approved","payment_sent","paid","confirmed"])
    : { data: [], error: null };
  if (reservationError) return new NextResponse("Calendar unavailable", { status: 500 });

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const reservationEvents = (reservations || []).map((reservation) => [
    "BEGIN:VEVENT",
    `UID:reservation-${reservation.id}@tokama.pl`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${toIcalDate(reservation.checkin)}`,
    `DTEND;VALUE=DATE:${toIcalDate(reservation.checkout)}`,
    `SUMMARY:${escapeIcal(`TOKAMA · ${reservation.public_code || "rezerwacja"}`)}`,
    "END:VEVENT",
  ].join("\r\n"));
  const blockEvents = (blocks || []).map((block) => [
    "BEGIN:VEVENT",
    `UID:block-${block.id}@tokama.pl`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${toIcalDate(block.start_date)}`,
    `DTEND;VALUE=DATE:${toIcalDate(block.end_date)}`,
    `SUMMARY:${escapeIcal(block.reason ? `TOKAMA · ${block.reason}` : "TOKAMA · blokada")}`,
    "END:VEVENT",
  ].join("\r\n"));

  const house = Array.isArray(feed.house) ? feed.house[0] : feed.house;
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TOKAMA//Reservations//PL",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:TOKAMA ${house?.code || ""}`,
    ...reservationEvents,
    ...blockEvents,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="tokama-${String(house?.code || "calendar").toLowerCase()}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
