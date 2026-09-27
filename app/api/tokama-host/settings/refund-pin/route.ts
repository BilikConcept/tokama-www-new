import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";
import { hashRefundPin, validateRefundPin, verifyRefundPin } from "@/lib/tokama/refundPin";

export async function GET(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("tokama_booking_settings").select("refund_pin_hash").limit(1).maybeSingle();
  if (error) return NextResponse.json({ ok:false, message:error.message }, { status:500 });
  return NextResponse.json({ ok:true, configured:Boolean(data?.refund_pin_hash) });
}

export async function POST(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const oldPin = String(body?.old_pin || "");
  const newPin = String(body?.new_pin || "");
  if (!validateRefundPin(newPin)) return NextResponse.json({ ok:false, message:"Nowy PIN musi mieć dokładnie 4 cyfry." }, { status:400 });

  const { data: settings, error } = await auth.supabase.from("tokama_booking_settings").select("id,refund_pin_hash").limit(1).maybeSingle();
  if (error || !settings) return NextResponse.json({ ok:false, message:error?.message || "Brak ustawień rezerwacji." }, { status:500 });
  if (settings.refund_pin_hash && (!validateRefundPin(oldPin) || !verifyRefundPin(oldPin, settings.refund_pin_hash))) {
    return NextResponse.json({ ok:false, message:"Stary PIN jest nieprawidłowy." }, { status:403 });
  }
  const { error:updateError } = await auth.supabase.from("tokama_booking_settings").update({ refund_pin_hash:hashRefundPin(newPin), updated_at:new Date().toISOString() }).eq("id", settings.id);
  if (updateError) return NextResponse.json({ ok:false, message:updateError.message }, { status:500 });
  return NextResponse.json({ ok:true, configured:true });
}
