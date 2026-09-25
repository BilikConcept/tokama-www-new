import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVE_RESERVATION_STATUSES = [
  "approved",
  "payment_sent",
  "paid",
  "confirmed",
];

const ALLOWED_HOUSE_CODES = new Set(["TO", "KA", "MA"]);

function getWarsawDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function normaliseCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 80)
    : "";
}

export async function POST(request: Request) {
  let body: { house?: unknown; reservationCode?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Nieprawidłowe dane." }, { status: 400 });
  }

  const houseCode = normaliseCode(body.house);
  const reservationCode = normaliseCode(body.reservationCode);

  if (!ALLOWED_HOUSE_CODES.has(houseCode) || !reservationCode) {
    return NextResponse.json(
      { ok: false, message: "Wpisz poprawny numer rezerwacji." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const today = getWarsawDate();

  const { data: house, error: houseError } = await supabase
    .from("tokama_houses")
    .select("id, code, name")
    .eq("code", houseCode)
    .maybeSingle();

  if (houseError || !house) {
    return NextResponse.json(
      { ok: false, message: "Nie znaleziono domku." },
      { status: 404 }
    );
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("tokama_reservations")
    .select("id, public_code, checkin, checkout, status")
    .eq("public_code", reservationCode)
    .in("status", ACTIVE_RESERVATION_STATUSES)
    .lte("checkin", today)
    .gte("checkout", today)
    .maybeSingle();

  if (reservationError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się sprawdzić rezerwacji." },
      { status: 500 }
    );
  }

  if (!reservation) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Nie znaleźliśmy aktywnego pobytu dla tego numeru rezerwacji. Sprawdź numer lub skontaktuj się z gospodarzem.",
      },
      { status: 403 }
    );
  }

  const { data: reservationHouse, error: reservationHouseError } = await supabase
    .from("tokama_reservation_houses")
    .select("id")
    .eq("reservation_id", reservation.id)
    .eq("house_id", house.id)
    .maybeSingle();

  if (reservationHouseError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się potwierdzić przypisanego domku." },
      { status: 500 }
    );
  }

  if (!reservationHouse) {
    return NextResponse.json(
      {
        ok: false,
        message: "Ten numer rezerwacji nie dotyczy tego domku.",
      },
      { status: 403 }
    );
  }

  const sessionToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const expiresAt = new Date(`${reservation.checkout}T23:59:59.999Z`);

  const { error: sessionError } = await supabase
    .from("tokama_onsite_guest_sessions")
    .insert({
      reservation_id: reservation.id,
      house_id: house.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (sessionError) {
    console.error("TOKAMA onsite session error:", sessionError);

    return NextResponse.json(
      {
        ok: false,
        message:
          process.env.NODE_ENV === "development"
            ? `Nie udało się utworzyć dostępu: ${sessionError.message}`
            : "Nie udało się utworzyć dostępu do pobytu.",
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    house: {
      code: house.code,
      name: house.name,
    },
    expiresAt: expiresAt.toISOString(),
  });

  response.cookies.set("tokama_onsite_session_v3", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    expires: expiresAt,
  });

  return response;
}
