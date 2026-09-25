import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";
import { buildPaymentSms } from "@/lib/payments/paymentSms";
import { assertRealP24Credentials } from "@/lib/payments/p24";

type PaymentProvider = "bank_transfer" | "p24";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

function getBaseUrl() {
  return (
    process.env.TOKAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getPaymentProvider(value: unknown): PaymentProvider | null {
  const provider = String(
    value || process.env.TOKAMA_DEFAULT_PAYMENT_PROVIDER || "bank_transfer"
  ).toLowerCase();

  return provider === "bank_transfer" || provider === "p24" ? provider : null;
}

function formatMoney(cents: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { reservationId } = await context.params;
    const body = await request.json().catch(() => null);
    const provider = getPaymentProvider(body?.provider);

    if (!provider) {
      return NextResponse.json(
        { ok: false, message: "Unsupported payment provider." },
        { status: 400 }
      );
    }

    if (provider === "p24") {
      assertRealP24Credentials();
    }

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
        "id, public_code, status, locale, guest_name, guest_email, guest_phone, currency, total_estimated_cents, host_final_amount_cents, online_due_cents, arrival_due_cents, payment_method, payment_link_sent_at, approval_sms_sent_at"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (!["approved", "payment_sent"].includes(reservation.status)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Payment link can be created only for approved reservations.",
        },
        { status: 400 }
      );
    }

    if (!reservation.guest_phone) {
      return NextResponse.json(
        { ok: false, message: "Guest phone number is missing." },
        { status: 400 }
      );
    }

    const reservationTotalCents =
      Number(reservation.host_final_amount_cents) ||
      Number(reservation.total_estimated_cents) ||
      0;
    const requestedAmountCents = Number(body?.amount_cents);
    const amountCents =
      (Number.isInteger(requestedAmountCents) && requestedAmountCents > 0
        ? requestedAmountCents
        : 0) ||
      Number(reservation.online_due_cents) ||
      reservationTotalCents;

    if (
      !Number.isInteger(amountCents) ||
      amountCents < 100 ||
      amountCents > reservationTotalCents
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Payment amount must be at least 1 PLN and no higher than the reservation total.",
        },
        { status: 400 }
      );
    }

    const publicCode = reservation.public_code || reservation.id;
    const baseUrl = getBaseUrl();
    const paymentPageUrl = `${baseUrl}/platnosc/${encodeURIComponent(publicCode)}`;
    const { data: paymentRequest, error: paymentError } = await supabase
      .from("tokama_payment_requests")
      .insert({
        reservation_id: reservation.id,
        provider,
        provider_checkout_session_id: null,
        stripe_payment_intent_id: null,
        stripe_client_secret: null,
        public_code: publicCode,
        payment_page_url: paymentPageUrl,
        payment_url: paymentPageUrl,
        amount_cents: amountCents,
        currency: reservation.currency || "PLN",
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (paymentError || !paymentRequest) {
      return NextResponse.json(
        {
          ok: false,
          message: paymentError?.message || "Payment request save failed.",
        },
        { status: 500 }
      );
    }

    const paymentSentAt = new Date().toISOString();

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "payment_sent",
        payment_method: provider,
        payment_link_sent_at: paymentSentAt,
        approval_sms_sent_at: paymentSentAt,
      })
      .eq("id", reservation.id)
      .select("*")
      .single();

    if (updateError || !updatedReservation) {
      await supabase
        .from("tokama_payment_requests")
        .update({ status: "cancelled" })
        .eq("id", paymentRequest.id);

      return NextResponse.json(
        {
          ok: false,
          message: updateError?.message || "Reservation update failed.",
        },
        { status: 500 }
      );
    }

    try {
      await sendTokamaSms({
        to: reservation.guest_phone,
        text: buildPaymentSms({
          locale: reservation.locale || "pl",
          publicCode,
          amount: formatMoney(amountCents, reservation.currency || "PLN"),
          paymentPageUrl,
        }),
      });
    } catch (smsError) {
      await Promise.all([
        supabase
          .from("tokama_reservations")
          .update({
            status: reservation.status,
            payment_method: reservation.payment_method,
            payment_link_sent_at: reservation.payment_link_sent_at,
            approval_sms_sent_at: reservation.approval_sms_sent_at,
          })
          .eq("id", reservation.id)
          .eq("payment_link_sent_at", paymentSentAt),
        supabase
          .from("tokama_payment_requests")
          .update({ status: "cancelled" })
          .eq("id", paymentRequest.id),
      ]);

      return NextResponse.json(
        {
          ok: false,
          message:
            smsError instanceof Error
              ? smsError.message
              : "Payment SMS send failed.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
      paymentRequest,
      paymentPageUrl,
      provider,
      stripePaymentIntentId: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown payment link error.",
      },
      { status: 500 }
    );
  }
}
