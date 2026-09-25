import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePaymentSplit } from "@/lib/payments/p24-demo";
import { TOKAMA_GLOBAL_GATE_CODE } from "@/lib/tokama/gateCode";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

function getGateCodeSmsSendAt(input: {
  checkin: string;
  checkinTime?: string | null;
}) {
  const time = input.checkinTime || "15:00";
  const checkinAt = new Date(`${input.checkin}T${time}`);

  checkinAt.setHours(checkinAt.getHours() - 3);

  return checkinAt.toISOString();
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { reservationId } = await context.params;
    const body = await request.json().catch(() => null);

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
        "id, public_code, status, locale, guest_phone, checkin, checkout, checkin_time, gate_code, gate_code_sms_send_at, approval_sms_sent_at, host_final_amount_cents, total_estimated_cents"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (!reservation.guest_phone) {
      return NextResponse.json(
        { ok: false, message: "Guest phone number is missing." },
        { status: 400 }
      );
    }

    const totalCents =
      Number(reservation.host_final_amount_cents) ||
      Number(reservation.total_estimated_cents) ||
      0;

    let paymentSplit;

    try {
      paymentSplit = resolvePaymentSplit({
        totalCents,
        paymentMode: body?.payment_mode || "full",
        requestedOnlineCents: body?.online_amount_cents ?? totalCents,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error ? error.message : "Invalid payment amount.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const gateCode = TOKAMA_GLOBAL_GATE_CODE;
    const gateCodeSmsSendAt =
      reservation.gate_code_sms_send_at ||
      getGateCodeSmsSendAt({
        checkin: reservation.checkin,
        checkinTime: reservation.checkin_time,
      });

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "approved",
        online_due_cents: paymentSplit.onlineDueCents,
        arrival_due_cents: paymentSplit.arrivalDueCents,
        gate_code: gateCode,
        gate_code_sms_send_at: gateCodeSmsSendAt,
        updated_at: now,
      })
      .eq("id", reservation.id)
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
      smsSent: false,
      paymentMode: paymentSplit.paymentMode,
      onlineDueCents: paymentSplit.onlineDueCents,
      arrivalDueCents: paymentSplit.arrivalDueCents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown approval error.",
      },
      { status: 500 }
    );
  }
}
