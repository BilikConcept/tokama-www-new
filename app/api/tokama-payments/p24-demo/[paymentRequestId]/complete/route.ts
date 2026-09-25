import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isP24DemoMethod,
  isP24DemoOutcome,
} from "@/lib/payments/p24-demo";
import { sendTokamaReservationPaidPush } from "@/lib/tokamaPush";

type RouteContext = {
  params: Promise<{
    paymentRequestId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { paymentRequestId } = await context.params;
    const body = await request.json().catch(() => null);
    const sessionId = String(body?.sessionId || "").trim();
    const method = body?.method;
    const outcome = body?.outcome;

    if (!sessionId || !isP24DemoMethod(method) || !isP24DemoOutcome(outcome)) {
      return NextResponse.json(
        { ok: false, message: "Invalid P24 demo request." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: paymentRequest, error: paymentRequestError } = await supabase
      .from("tokama_payment_requests")
      .select("id, reservation_id, provider, provider_checkout_session_id, amount_cents, status")
      .eq("id", paymentRequestId)
      .maybeSingle();

    if (paymentRequestError || !paymentRequest) {
      return NextResponse.json(
        { ok: false, message: "Payment request not found." },
        { status: 404 }
      );
    }

    if (
      paymentRequest.provider !== "p24_demo" ||
      paymentRequest.provider_checkout_session_id !== sessionId
    ) {
      return NextResponse.json(
        { ok: false, message: "Invalid P24 demo session." },
        { status: 403 }
      );
    }

    if (paymentRequest.status === "paid") {
      return NextResponse.json({ ok: true, status: "paid", idempotent: true });
    }

    const now = new Date().toISOString();
    const providerTransactionId = `P24-DEMO-${Date.now()}`;

    if (outcome === "failure") {
      const { error } = await supabase
        .from("tokama_payment_requests")
        .update({
          status: "cancelled",
          updated_at: now,
        })
        .eq("id", paymentRequest.id);

      if (error) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: "cancelled",
        method,
        providerTransactionId,
        message: "To była symulacja błędu. Żadne środki nie zostały pobrane.",
      });
    }

    const { error: paymentUpdateError } = await supabase
      .from("tokama_payment_requests")
      .update({
        status: "paid",
        paid_at: now,
        updated_at: now,
      })
      .eq("id", paymentRequest.id);

    if (paymentUpdateError) {
      return NextResponse.json(
        { ok: false, message: paymentUpdateError.message },
        { status: 500 }
      );
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_method: `p24_demo_${method}`,
        paid_online_cents: Number(paymentRequest.amount_cents),
        payment_confirmed_at: now,
        updated_at: now,
      })
      .eq("id", paymentRequest.reservation_id)
      .select("id, public_code, status, guest_name")
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        {
          ok: false,
          message: reservationError?.message || "Reservation update failed.",
        },
        { status: 500 }
      );
    }

    try {
      await sendTokamaReservationPaidPush({
        id: reservation.id,
        public_code: reservation.public_code,
        guest_name: reservation.guest_name,
      });
    } catch (pushError) {
      console.log("[TOKAMA P24 DEMO] Paid reservation push failed", pushError);
    }

    return NextResponse.json({
      ok: true,
      status: "paid",
      method,
      providerTransactionId,
      reservation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown P24 demo error.",
      },
      { status: 500 }
    );
  }
}
