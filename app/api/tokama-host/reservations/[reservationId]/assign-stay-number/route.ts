import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";
import { buildStayCardSms } from "@/lib/tokama/stayCardSms";
import { sendTokamaSms } from "@/lib/tokamaNotifications";

export const dynamic = "force-dynamic";

const ELIGIBLE_STATUSES = new Set([
  "approved",
  "payment_sent",
  "paid",
  "confirmed",
]);

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

function getLocale(value: unknown): "pl" | "en" {
  return value === "en" ? "en" : "pl";
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const { reservationId } = await context.params;

  if (!/^[0-9a-f-]{36}$/i.test(reservationId)) {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowy identyfikator rezerwacji." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: reservation, error: reservationError } = await supabase
    .from("tokama_reservations")
    .select("id, public_code, status, locale, guest_phone, guest_card_sms_sent_at")
    .eq("id", reservationId)
    .maybeSingle();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { ok: false, message: "Nie znaleziono rezerwacji." },
      { status: 404 }
    );
  }

  if (!ELIGIBLE_STATUSES.has(String(reservation.status || "").toLowerCase())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Numer pobytu można nadać po zaakceptowaniu rezerwacji.",
      },
      { status: 409 }
    );
  }

  const { data: houseAssignments, error: housesError } = await supabase
    .from("tokama_reservation_houses")
    .select("house:tokama_houses(code)")
    .eq("reservation_id", reservation.id);

  if (housesError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się sprawdzić przypisanego domku." },
      { status: 500 }
    );
  }

  const houseCodes = (houseAssignments || [])
    .map((assignment) => {
      const house = Array.isArray(assignment.house)
        ? assignment.house[0]
        : assignment.house;

      return house?.code;
    })
    .filter((code): code is string => Boolean(code));

  if (!houseCodes.length) {
    return NextResponse.json(
      {
        ok: false,
        message: "Najpierw przypisz do rezerwacji domek TO, KA lub MA.",
      },
      { status: 409 }
    );
  }

  const { data: assignment, error: assignmentError } = await supabase.rpc(
    "assign_tokama_reservation_code",
    { p_reservation_id: reservation.id }
  );

  const publicCode = String(
    Array.isArray(assignment) ? assignment[0]?.code || "" : ""
  ).trim();

  if (assignmentError || !publicCode) {
    return NextResponse.json(
      {
        ok: false,
        message: assignmentError?.message || "Nie udało się nadać numeru pobytu.",
      },
      { status: 500 }
    );
  }

  if (reservation.guest_card_sms_sent_at) {
    return NextResponse.json({
      ok: true,
      reservation: { id: reservation.id, publicCode },
      sms: { sent: false, alreadySent: true },
    });
  }

  if (!reservation.guest_phone) {
    return NextResponse.json({
      ok: true,
      reservation: { id: reservation.id, publicCode },
      sms: { sent: false, reason: "missing_phone" },
    });
  }

  const smsClaimedAt = new Date().toISOString();

  const { data: smsClaim, error: smsClaimError } = await supabase
    .from("tokama_reservations")
    .update({
      guest_card_sms_sent_at: smsClaimedAt,
      updated_at: smsClaimedAt,
    })
    .eq("id", reservation.id)
    .is("guest_card_sms_sent_at", null)
    .select("id")
    .maybeSingle();

  if (smsClaimError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się przygotować wysyłki SMS." },
      { status: 500 }
    );
  }

  if (!smsClaim) {
    return NextResponse.json({
      ok: true,
      reservation: { id: reservation.id, publicCode },
      sms: { sent: false, alreadySent: true },
    });
  }

  try {
    await sendTokamaSms({
      to: reservation.guest_phone,
      text: buildStayCardSms({
        locale: getLocale(reservation.locale),
        publicCode,
        houseCodes,
      }),
    });

    return NextResponse.json({
      ok: true,
      reservation: { id: reservation.id, publicCode },
      sms: { sent: true },
    });
  } catch (error) {
    console.error("TOKAMA stay-card SMS error:", error);

    await supabase
      .from("tokama_reservations")
      .update({
        guest_card_sms_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation.id)
      .eq("guest_card_sms_sent_at", smsClaimedAt);

    return NextResponse.json({
      ok: true,
      reservation: { id: reservation.id, publicCode },
      sms: { sent: false, reason: "failed" },
    });
  }
}
