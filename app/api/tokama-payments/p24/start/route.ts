import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registerP24Transaction } from "@/lib/payments/p24";

type Body = {
  payment_request_id?: string;
  public_code?: string;
};

function getBaseUrl() {
  return (
    process.env.TOKAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const paymentRequestId = String(body.payment_request_id || "").trim();
    const publicCode = String(body.public_code || "").trim();

    if (!paymentRequestId || !publicCode) {
      return NextResponse.json(
        { ok: false, message: "Brakuje danych płatności." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: paymentRequest, error } = await supabase
      .from("tokama_payment_requests")
      .select(`
        id, reservation_id, public_code, provider, amount_cents, currency,
        status, terms_accepted_at,
        reservation:tokama_reservations(public_code, guest_name, guest_email, locale)
      `)
      .eq("id", paymentRequestId)
      .eq("public_code", publicCode)
      .maybeSingle();

    if (error || !paymentRequest) {
      return NextResponse.json(
        { ok: false, message: "Nie znaleziono aktywnej płatności." },
        { status: 404 }
      );
    }
    if (paymentRequest.provider !== "p24") {
      return NextResponse.json(
        { ok: false, message: "Ta płatność nie korzysta z Przelewy24." },
        { status: 400 }
      );
    }
    if (paymentRequest.status === "paid") {
      return NextResponse.json({ ok: true, status: "paid" });
    }
    if (!paymentRequest.terms_accepted_at) {
      return NextResponse.json(
        { ok: false, message: "Najpierw zaakceptuj Regulamin rezerwacji." },
        { status: 400 }
      );
    }

    const reservation = Array.isArray(paymentRequest.reservation)
      ? paymentRequest.reservation[0]
      : paymentRequest.reservation;
    if (!reservation?.guest_email) {
      return NextResponse.json(
        { ok: false, message: "W rezerwacji brakuje adresu e-mail." },
        { status: 400 }
      );
    }

    const sessionId = `TOKAMA-${paymentRequest.id}-${randomUUID()}`.slice(0, 100);
    const baseUrl = getBaseUrl();
    const registered = await registerP24Transaction({
      sessionId,
      amount: Number(paymentRequest.amount_cents),
      currency: String(paymentRequest.currency || "PLN"),
      description: `Pobyt TOKAMA ${reservation.public_code || publicCode}`,
      email: reservation.guest_email,
      client: reservation.guest_name || "Gość TOKAMA",
      language: reservation.locale || "pl",
      urlReturn: `${baseUrl}/platnosc/${encodeURIComponent(publicCode)}?p24=return`,
      urlStatus: `${baseUrl}/api/tokama-payments/p24/status`,
    });

    const { error: updateError } = await supabase
      .from("tokama_payment_requests")
      .update({
        provider_checkout_session_id: sessionId,
        payment_url: registered.paymentUrl,
        status: "sent",
        p24_registered_at: new Date().toISOString(),
      })
      .eq("id", paymentRequest.id)
      .neq("status", "paid");

    if (updateError) {
      return NextResponse.json(
        { ok: false, message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, paymentUrl: registered.paymentUrl });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Nie udało się rozpocząć płatności Przelewy24.",
      },
      { status: 502 }
    );
  }
}

