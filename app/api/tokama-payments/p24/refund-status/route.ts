import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getP24RefundDetails } from "@/lib/payments/p24";

export async function POST(request:Request) {
  const body = await request.json().catch(() => null);
  const refundUuid = String(body?.refundsUuid || "").trim();
  const requestId = String(body?.requestId || "").trim();
  const amount = Number(body?.amount);
  const orderId = Number(body?.orderId);
  if (!refundUuid || !requestId || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(orderId)) return NextResponse.json({ ok:false }, { status:400 });
  const supabase = getSupabaseAdmin();
  const { data:payment, error } = await supabase.from("tokama_payment_requests").select("id,reservation_id,refund_amount_cents,p24_order_id").eq("refund_uuid", refundUuid).eq("refund_request_id", requestId).maybeSingle();
  if (error || !payment || Number(payment.refund_amount_cents) !== amount || Number(payment.p24_order_id) !== orderId) return NextResponse.json({ ok:false }, { status:404 });
  const verified = await getP24RefundDetails(orderId);
  const refunds = Array.isArray(verified?.data?.refunds) ? verified.data.refunds : [];
  if (!refunds.some((refund:any) => Number(refund.amount) === amount)) return NextResponse.json({ ok:false }, { status:409 });
  const now = new Date().toISOString();
  await supabase.from("tokama_payment_requests").update({ status:"refunded", refunded_at:now, refund_response:body, updated_at:now }).eq("id", payment.id);
  await supabase.from("tokama_reservations").update({ payment_status:"refunded", updated_at:now }).eq("id", payment.reservation_id);
  return new NextResponse(null, { status:200 });
}
