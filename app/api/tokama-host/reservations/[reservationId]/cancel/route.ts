import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function buildCancellationSms(input: {
  locale: "pl" | "en";
  checkin: string;
  checkout: string;
}) {
  if (input.locale === "en") {
    return `Your stay has been cancelled.

Dates: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
If you have any questions, please contact the host.`;
  }

  return `Twój pobyt został anulowany.

Termin: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
W razie pytań skontaktuj się z hostem.`;
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
        "id, status, locale, checkin, checkout, guest_phone, cancellation_sms_sent_at"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json(
        { ok: false, message: "Reservation is already cancelled." },
        { status: 400 }
      );
    }

    if (reservation.status === "rejected") {
      return NextResponse.json(
        { ok: false, message: "Rejected reservation cannot be cancelled." },
        { status: 400 }
      );
    }

    if (!reservation.guest_phone) {
      return NextResponse.json(
        { ok: false, message: "Guest phone number is missing." },
        { status: 400 }
      );
    }

    let cancellationSmsSentAt = reservation.cancellation_sms_sent_at;

    if (!cancellationSmsSentAt) {
      await sendTokamaSms({
        to: reservation.guest_phone,
        text: buildCancellationSms({
          locale: reservation.locale || "pl",
          checkin: reservation.checkin,
          checkout: reservation.checkout,
        }),
      });

      cancellationSmsSentAt = new Date().toISOString();
    }

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "cancelled",
        gate_code_sms_send_at: null,
        cancellation_sms_sent_at: cancellationSmsSentAt,
      })
      .eq("id", reservationId)
      .select("*")
      .single();

    if (updateError || !updatedReservation) {
      return NextResponse.json(
        { ok: false, message: updateError?.message || "Reservation update failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
      smsSent: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown cancel error.",
      },
      { status: 500 }
    );
  }
}
