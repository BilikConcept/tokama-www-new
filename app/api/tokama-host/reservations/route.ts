import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";
import { requireHostApi } from "@/lib/tokama/hostApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;

  const supabase = auth.supabase;

  const { data: reservations, error: reservationsError } = await supabase
    .from("tokama_reservations")
    .select("*")
    .order("created_at", { ascending: false });

  if (reservationsError) {
    return NextResponse.json(
      {
        ok: false,
        message: reservationsError.message,
      },
      { status: 500 }
    );
  }

  const reservationIds = (reservations || []).map((reservation) => reservation.id);

  const [addonsResult, housesResult] = reservationIds.length
    ? await Promise.all([
        supabase
          .from("tokama_reservation_addons")
          .select("*")
          .in("reservation_id", reservationIds),
        supabase
          .from("tokama_reservation_houses")
          .select("reservation_id, house:tokama_houses(code, name)")
          .in("reservation_id", reservationIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const { data: addons, error: addonsError } = addonsResult;
  const { data: houseAssignments, error: housesError } = housesResult;

  if (addonsError) {
    return NextResponse.json(
      {
        ok: false,
        message: addonsError.message,
      },
      { status: 500 }
    );
  }

  if (housesError) {
    return NextResponse.json(
      {
        ok: false,
        message: housesError.message,
      },
      { status: 500 }
    );
  }

  const reservationsWithAddons = (reservations || []).map((reservation) => ({
    ...reservation,
    addons: (addons || []).filter((addon) => addon.reservation_id === reservation.id),
    houses: (houseAssignments || [])
      .filter((assignment) => assignment.reservation_id === reservation.id)
      .map((assignment) => ({
        house: Array.isArray(assignment.house)
          ? assignment.house[0] || null
          : assignment.house,
      })),
  }));

  console.log("[TOKAMA RESERVATIONS] Loaded", {
    userId: auth.user.id,
    count: reservationsWithAddons.length,
    withAssignedHouses: reservationsWithAddons.filter(
      (reservation) => reservation.houses.length > 0
    ).length,
  });

  return NextResponse.json(
    {
      ok: true,
      reservations: reservationsWithAddons,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function getWarsawDateKey() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const body = await request.json().catch(() => null);

  const houseCode = String(body?.houseCode || "")
    .trim()
    .toUpperCase();
  const guestName = String(body?.guestName || "").trim();
  const guestPhone = String(body?.guestPhone || "").trim();
  const publicCode = String(body?.publicCode || "")
    .trim()
    .toUpperCase();
  const nights = Number(body?.nights);

  if (!["TO", "KA", "MA"].includes(houseCode)) {
    return NextResponse.json(
      { ok: false, message: "Wybierz domek TO, KA lub MA." },
      { status: 400 }
    );
  }

  if (!guestName) {
    return NextResponse.json(
      { ok: false, message: "Podaj imię i nazwisko gościa." },
      { status: 400 }
    );
  }

  if (!guestPhone) {
    return NextResponse.json(
      { ok: false, message: "Podaj numer telefonu gościa." },
      { status: 400 }
    );
  }

  if (!/^TOK-\d{4,}$/.test(publicCode)) {
    return NextResponse.json(
      { ok: false, message: "Numer pobytu musi mieć format TOK-0001." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(nights) || nights < 1 || nights > 365) {
    return NextResponse.json(
      { ok: false, message: "Podaj liczbę dób od 1 do 365." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const checkin = getWarsawDateKey();
  const checkout = addDays(checkin, nights);

  const { data: house, error: houseError } = await supabase
    .from("tokama_houses")
    .select("id, code")
    .eq("code", houseCode)
    .maybeSingle();

  if (houseError || !house) {
    return NextResponse.json(
      { ok: false, message: houseError?.message || "Nie znaleziono domku." },
      { status: 400 }
    );
  }

  const { data: overlaps, error: overlapsError } = await supabase
    .from("tokama_reservations")
    .select("id")
    .lt("checkin", checkout)
    .gt("checkout", checkin)
    .in("status", [
      "requested",
      "approved",
      "payment_sent",
      "paid",
      "confirmed",
    ]);

  if (overlapsError) {
    return NextResponse.json(
      { ok: false, message: overlapsError.message },
      { status: 500 }
    );
  }

  const overlapIds = (overlaps || []).map((reservation) => reservation.id);

  if (overlapIds.length) {
    const { data: occupiedHouses, error: occupiedHousesError } = await supabase
      .from("tokama_reservation_houses")
      .select("house_id")
      .in("reservation_id", overlapIds)
      .eq("house_id", house.id);

    if (occupiedHousesError) {
      return NextResponse.json(
        { ok: false, message: occupiedHousesError.message },
        { status: 500 }
      );
    }

    if (occupiedHouses?.length) {
      return NextResponse.json(
        { ok: false, message: `Domek ${houseCode} jest już zajęty w tym terminie.` },
        { status: 409 }
      );
    }
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("tokama_reservations")
    .insert({
      source: "host",
      status: "confirmed",
      public_code: publicCode,
      checkin,
      checkout,
      nights,
      adults: 1,
      children: 0,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_email: null,
      guest_message: "Pobyt dodany ręcznie w HOSTapp.",
      currency: "PLN",
      stay_price_cents: 0,
      addons_price_cents: 0,
      total_estimated_cents: 0,
      host_final_amount_cents: 0,
      payment_method: "manual",
      payment_status: "paid",
      payment_confirmed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { ok: false, message: reservationError?.message || "Nie udało się dodać pobytu." },
      { status: 500 }
    );
  }

  const { error: reservationHouseError } = await supabase
    .from("tokama_reservation_houses")
    .insert({
      reservation_id: reservation.id,
      house_id: house.id,
    });

  if (reservationHouseError) {
    await supabase.from("tokama_reservations").delete().eq("id", reservation.id);

    return NextResponse.json(
      { ok: false, message: reservationHouseError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, reservation }, { status: 201 });
}
