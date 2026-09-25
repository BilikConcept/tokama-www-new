import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveNightlyPrices } from "@/lib/tokama/pricing";

export const dynamic = "force-dynamic";

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(value: string, count: number) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return iso(date); }

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const start = iso(new Date());
    const end = addDays(start, 180);
    const [settingsResult, rulesResult, housesResult, reservationsResult, externalResult, blocksResult] = await Promise.all([
      supabase.from("tokama_booking_settings").select("base_price_per_house_per_night_cents").eq("id", true).single(),
      supabase.from("tokama_pricing_rules").select("id,name,price_cents,valid_from,valid_to,weekdays,priority,is_active").eq("is_active", true).order("priority", { ascending: false }),
      supabase.from("tokama_houses").select("id,code"),
      supabase.from("tokama_reservations").select("id,checkin,checkout,status").lt("checkin", end).gt("checkout", start).in("status", ["requested","approved","payment_sent","paid","confirmed"]),
      supabase.from("tokama_external_calendar_events").select("house_id,start_date,end_date").lt("start_date", end).gt("end_date", start),
      supabase.from("tokama_house_date_blocks").select("house_id,house_code,start_date,end_date").lt("start_date", end).gt("end_date", start),
    ]);
    const error = settingsResult.error || rulesResult.error || housesResult.error || reservationsResult.error || externalResult.error || blocksResult.error;
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

    const houses = housesResult.data || [];
    const reservations = reservationsResult.data || [];
    const reservationIds = reservations.map(item => item.id);
    const assignmentsResult = reservationIds.length
      ? await supabase.from("tokama_reservation_houses").select("reservation_id,house_id").in("reservation_id", reservationIds)
      : { data: [], error: null };
    if (assignmentsResult.error) return NextResponse.json({ ok: false, message: assignmentsResult.error.message }, { status: 500 });

    const basePrice = Number(settingsResult.data?.base_price_per_house_per_night_cents || 120000);
    const prices = resolveNightlyPrices({ checkin: start, checkout: end, basePriceCents: basePrice, rules: rulesResult.data || [] });
    const assignments = assignmentsResult.data || [];
    const signals = prices.map(night => {
      const unavailable = new Set<string>();
      for (const reservation of reservations) if (night.date >= reservation.checkin && night.date < reservation.checkout) {
        assignments.filter(item => item.reservation_id === reservation.id).forEach(item => unavailable.add(item.house_id));
      }
      for (const event of externalResult.data || []) if (night.date >= event.start_date && night.date < event.end_date && event.house_id) unavailable.add(event.house_id);
      for (const block of blocksResult.data || []) if (night.date >= block.start_date && night.date < block.end_date) {
        const house = houses.find(item => item.id === block.house_id || item.code === block.house_code);
        if (house?.id) unavailable.add(house.id);
      }
      const available = Math.max(0, houses.length - unavailable.size);
      const level = available <= 1 || night.price_cents >= basePrice * 1.2 ? "hot" : available === 2 || night.price_cents > basePrice ? "popular" : "calm";
      return { date: night.date, price_cents: night.price_cents, available_houses: available, level };
    });
    return NextResponse.json({ ok: true, base_price_cents: basePrice, houses_total: houses.length, signals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Nie udało się zbudować kalendarza." }, { status: 500 });
  }
}
