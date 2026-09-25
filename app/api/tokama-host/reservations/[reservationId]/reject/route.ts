import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

type RejectionReason =
  | "dates_unavailable"
  | "capacity_unavailable"
  | "minimum_stay"
  | "private_event"
  | "other";

const rejectionReasons: Record<
  RejectionReason,
  {
    pl: string;
    en: string;
  }
> = {
  dates_unavailable: {
    pl: "Wybrany termin nie jest już dostępny.",
    en: "The selected dates are no longer available.",
  },
  capacity_unavailable: {
    pl: "Nie mamy dostępnego odpowiedniego domku dla tej liczby gości.",
    en: "We do not have a suitable house available for this number of guests.",
  },
  minimum_stay: {
    pl: "Wybrany pobyt nie spełnia minimalnej liczby nocy.",
    en: "The selected stay does not meet the minimum night requirement.",
  },
  private_event: {
    pl: "W tym terminie obiekt jest zarezerwowany na wydarzenie prywatne.",
    en: "The property is reserved for a private event during these dates.",
  },
  other: {
    pl: "Rezerwacja nie mogła zostać przyjęta.",
    en: "The reservation could not be accepted.",
  },
};

function isRejectionReason(value: unknown): value is RejectionReason {
  return (
    value === "dates_unavailable" ||
    value === "capacity_unavailable" ||
    value === "minimum_stay" ||
    value === "private_event" ||
    value === "other"
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function buildRejectionSms(input: {
  locale: "pl" | "en";
  checkin: string;
  checkout: string;
  reason: RejectionReason;
}) {
  const reasonText = rejectionReasons[input.reason][input.locale];

  if (input.locale === "en") {
    return `We are sorry, but your stay cannot be confirmed.

Dates: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
Reason: ${reasonText}

You are welcome to choose another date.`;
  }

  return `Przykro nam, ale nie możemy potwierdzić Twojego pobytu.

Termin: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
Powód: ${reasonText}

Zachęcamy do wyboru innego terminu.`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { reservationId } = await context.params;

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing authorization token." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const reason: RejectionReason = isRejectionReason(body?.reason)
      ? body.reason
      : "other";

    const supabase = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("hostapp_profiles")
      .select("id, is_active, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_active) {
      return NextResponse.json(
        { ok: false, message: "No active HOSTapp profile." },
        { status: 403 }
      );
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("tokama_reservations")
      .select(
        "id, status, locale, checkin, checkout, guest_phone, rejection_sms_sent_at"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (reservation.status !== "requested") {
      return NextResponse.json(
        { ok: false, message: "Only requested reservations can be rejected." },
        { status: 400 }
      );
    }

    if (!reservation.guest_phone) {
      return NextResponse.json(
        { ok: false, message: "Guest phone number is missing." },
        { status: 400 }
      );
    }

    let rejectionSmsSentAt = reservation.rejection_sms_sent_at;

    if (!rejectionSmsSentAt) {
      await sendTokamaSms({
        to: reservation.guest_phone,
        text: buildRejectionSms({
          locale: reservation.locale || "pl",
          checkin: reservation.checkin,
          checkout: reservation.checkout,
          reason,
        }),
      });

      rejectionSmsSentAt = new Date().toISOString();
    }

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "rejected",
        rejection_reason: reason,
        rejection_sms_sent_at: rejectionSmsSentAt,
      })
      .eq("id", reservationId)
      .select("*")
      .single();

    if (updateError || !updatedReservation) {
      return NextResponse.json(
        {
          ok: false,
          message: updateError?.message || "Reservation update failed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
      smsSent: true,
      reason,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown reject error.",
      },
      { status: 500 }
    );
  }
}
