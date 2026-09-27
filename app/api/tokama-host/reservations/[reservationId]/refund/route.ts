import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";
import { refundP24Transaction } from "@/lib/payments/p24";
import { validateRefundPin, verifyRefundPin } from "@/lib/tokama/refundPin";
import { sendTokamaEmail } from "@/lib/tokamaNotifications";
import { escapeEmailHtml, tokamaGuestEmail } from "@/lib/tokama/emailTemplate";

type RouteContext = { params: Promise<{ reservationId:string }> };
const DAY = 86_400_000;

function dateLabel(value:string, locale:"pl"|"en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pl-PL", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export async function POST(request:Request, context:RouteContext) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const { reservationId } = await context.params;
  const body = await request.json().catch(() => null);
  const { data:reservation, error } = await auth.supabase.from("tokama_reservations")
    .select("id,public_code,status,locale,guest_name,guest_email,checkin,checkout,currency,payment_status")
    .eq("id", reservationId).maybeSingle();
  if (error || !reservation) return NextResponse.json({ ok:false, message:"Nie znaleziono pobytu." }, { status:404 });
  if (reservation.payment_status !== "paid") return NextResponse.json({ ok:false, message:"Zwrot jest możliwy tylko dla opłaconego pobytu." }, { status:400 });

  const { data:payment, error:paymentError } = await auth.supabase.from("tokama_payment_requests")
    .select("id,provider,status,amount_cents,currency,provider_checkout_session_id,p24_order_id,refund_requested_at")
    .eq("reservation_id", reservationId).eq("provider", "p24").eq("status", "paid").order("paid_at", { ascending:false }).limit(1).maybeSingle();
  if (paymentError || !payment?.p24_order_id || !payment.provider_checkout_session_id) return NextResponse.json({ ok:false, message:"Nie znaleziono rozliczonej płatności P24 dla tego pobytu." }, { status:400 });
  if (payment.refund_requested_at) return NextResponse.json({ ok:false, message:"Zwrot dla tej płatności został już zlecony." }, { status:409 });

  const today = new Date(); today.setHours(0,0,0,0);
  const checkin = new Date(`${reservation.checkin}T00:00:00`);
  const daysBefore = Math.ceil((checkin.getTime() - today.getTime()) / DAY);
  if (daysBefore < 14) {
    const { data:settings } = await auth.supabase.from("tokama_booking_settings").select("refund_pin_hash").limit(1).maybeSingle();
    const pin = String(body?.pin || "");
    if (!settings?.refund_pin_hash) return NextResponse.json({ ok:false, code:"PIN_NOT_CONFIGURED", message:"Najpierw ustaw PIN zwrotów w zakładce Ceny." }, { status:409 });
    if (!validateRefundPin(pin) || !verifyRefundPin(pin, settings.refund_pin_hash)) return NextResponse.json({ ok:false, code:"PIN_REQUIRED", message:"Podaj prawidłowy 4-cyfrowy PIN zwrotów." }, { status:403 });
  }

  const requestId = `refund-${reservation.public_code}-${Date.now()}`.slice(0,45);
  const refundUuid = randomUUID();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://tokama-www-new.vercel.app";
  const refund = await refundP24Transaction({ orderId:Number(payment.p24_order_id), sessionId:payment.provider_checkout_session_id, amount:Number(payment.amount_cents), description:`Zwrot ${reservation.public_code}`, requestId, refundsUuid:refundUuid, urlStatus:`${origin}/api/tokama-payments/p24/refund-status` });
  const now = new Date().toISOString();
  const { error:updateError } = await auth.supabase.from("tokama_payment_requests").update({ status:"refund_pending", refund_request_id:requestId, refund_uuid:refundUuid, refund_amount_cents:Number(payment.amount_cents), refund_requested_at:now, refund_response:refund, updated_at:now }).eq("id", payment.id);
  if (updateError) throw updateError;
  await auth.supabase.from("tokama_reservations").update({ status:"cancelled", payment_status:"refund_pending", updated_at:now }).eq("id", reservation.id);

  if (reservation.guest_email) {
    const locale:"pl"|"en" = reservation.locale === "en" ? "en" : "pl"; const english=locale === "en";
    await sendTokamaEmail({ to:reservation.guest_email, subject:english?`TOKAMA — refund for ${reservation.public_code}`:`TOKAMA — zwrot za pobyt ${reservation.public_code}`, html:tokamaGuestEmail({ eyebrow:english?"REFUND REQUESTED":"ZWROT ZLECONY", content:`<h1 style="margin:0 0 18px;font:400 38px/1.05 Georgia,serif">${english?`Dear ${escapeEmailHtml(reservation.guest_name)},`:`${escapeEmailHtml(reservation.guest_name)}, zwrot został zlecony.`}</h1><p style="margin:0 auto 26px;max-width:480px;color:#555;line-height:1.7">${english?"We have submitted the refund through Przelewy24. The funds will return through the original payment method.":"Zleciliśmy zwrot przez Przelewy24. Środki wrócą tą samą metodą, którą opłacono rezerwację."}</p><div style="padding:22px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;line-height:1.8"><strong>${escapeEmailHtml(reservation.public_code)}</strong><br>${dateLabel(reservation.checkin,locale)} — ${dateLabel(reservation.checkout,locale)}</div>` }) });
  }
  return NextResponse.json({ ok:true, refundPending:true, pinRequired:daysBefore < 14 });
}
