import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  createP24NotificationSign,
  getP24Config,
  safeP24SignEqual,
  verifyP24Transaction,
} from "@/lib/payments/p24";
import { sendTokamaReservationPaidPush } from "@/lib/tokamaPush";

type NotificationBody = {
  merchantId?: number;
  posId?: number;
  sessionId?: string;
  amount?: number;
  originAmount?: number;
  currency?: string;
  orderId?: number;
  methodId?: number;
  statement?: string;
  sign?: string;
};

function asInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotificationBody;
    const config = getP24Config();
    const merchantId = asInteger(body.merchantId);
    const posId = asInteger(body.posId);
    const amount = asInteger(body.amount);
    const originAmount = asInteger(body.originAmount);
    const orderId = asInteger(body.orderId);
    const methodId = asInteger(body.methodId);
    const sessionId = String(body.sessionId || "").trim();
    const currency = String(body.currency || "").toUpperCase();
    const statement = String(body.statement || "");

    if (
      merchantId === null || posId === null || amount === null ||
      originAmount === null || orderId === null || methodId === null ||
      !sessionId || !currency || !body.sign ||
      merchantId !== Number(config.merchantId) ||
      posId !== Number(config.posId)
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const expectedSign = createP24NotificationSign({
      merchantId,
      posId,
      sessionId,
      amount,
      originAmount,
      currency,
      orderId,
      methodId,
      statement,
      crc: config.crc || "",
    });
    if (!safeP24SignEqual(body.sign, expectedSign)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: paymentRequest, error } = await supabase
      .from("tokama_payment_requests")
      .select("id, reservation_id, amount_cents, currency, status")
      .eq("provider", "p24")
      .eq("provider_checkout_session_id", sessionId)
      .maybeSingle();

    if (error || !paymentRequest) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    if (
      Number(paymentRequest.amount_cents) !== amount ||
      String(paymentRequest.currency).toUpperCase() !== currency
    ) {
      return NextResponse.json({ ok: false }, { status: 409 });
    }

    await verifyP24Transaction({ sessionId, orderId, amount, currency });
    const now = new Date().toISOString();
    const { error: paymentError } = await supabase
      .from("tokama_payment_requests")
      .update({
        status: "paid",
        paid_at: now,
        p24_order_id: orderId,
        p24_method_id: methodId,
        p24_statement: statement,
        p24_verified_at: now,
        p24_notification_sign: body.sign,
        updated_at: now,
      })
      .eq("id", paymentRequest.id);
    if (paymentError) throw paymentError;

    const { data: reservation, error: reservationError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_method: "p24",
        paid_online_cents: amount,
        payment_confirmed_at: now,
        updated_at: now,
      })
      .eq("id", paymentRequest.reservation_id)
      .select("id, public_code, guest_name")
      .single();
    if (reservationError || !reservation) throw reservationError;

    if (paymentRequest.status !== "paid") {
      try {
        await sendTokamaReservationPaidPush(reservation);
      } catch (pushError) {
        console.error("[TOKAMA P24] Paid reservation notification failed", pushError);
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[TOKAMA P24] Status processing failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
