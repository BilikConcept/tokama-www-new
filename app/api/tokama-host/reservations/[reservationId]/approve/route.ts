import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePaymentSplit } from "@/lib/payments/p24-demo";
import { TOKAMA_GLOBAL_GATE_CODE } from "@/lib/tokama/gateCode";
import { sendTokamaEmail } from "@/lib/tokamaNotifications";
import { buildPaymentEmail } from "@/lib/payments/paymentEmail";
import { assertRealP24Credentials } from "@/lib/payments/p24";

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

function getBaseUrl() { return (process.env.TOKAMA_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/,""); }
function formatMoney(cents:number,currency="PLN") { return new Intl.NumberFormat("pl-PL",{style:"currency",currency,maximumFractionDigits:0}).format(cents/100); }

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
        "id, public_code, status, locale, guest_name, guest_email, guest_phone, checkin, checkout, checkin_time, gate_code, gate_code_sms_send_at, approval_sms_sent_at, currency, host_final_amount_cents, total_estimated_cents"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (reservation.status !== "requested") return NextResponse.json({ok:false,message:"Tylko nową prośbę można zaakceptować."},{status:409});

    if (!reservation.guest_email) {
      return NextResponse.json(
        { ok: false, message: "Guest email address is missing." },
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

    try {
      assertRealP24Credentials();
      const publicCode=reservation.public_code||reservation.id; const paymentPageUrl=`${getBaseUrl()}/platnosc/${encodeURIComponent(publicCode)}`;
      const {data:paymentRequest,error:paymentError}=await supabase.from("tokama_payment_requests").insert({reservation_id:reservation.id,provider:"p24",public_code:publicCode,payment_page_url:paymentPageUrl,payment_url:paymentPageUrl,amount_cents:paymentSplit.onlineDueCents,currency:reservation.currency||"PLN",status:"sent",sent_at:now}).select("*").single();
      if(paymentError||!paymentRequest) throw paymentError||new Error("Payment request save failed.");
      const {data:paymentReservation,error:paymentUpdateError}=await supabase.from("tokama_reservations").update({status:"payment_sent",payment_method:"p24",payment_link_sent_at:now,updated_at:now}).eq("id",reservation.id).select("*").single();
      if(paymentUpdateError||!paymentReservation) throw paymentUpdateError||new Error("Reservation payment update failed.");
      const email=buildPaymentEmail({locale:reservation.locale,guestName:reservation.guest_name,publicCode,checkin:reservation.checkin,checkout:reservation.checkout,amount:formatMoney(paymentSplit.onlineDueCents,reservation.currency||"PLN"),paymentPageUrl});
      await sendTokamaEmail({to:reservation.guest_email,...email});
      return NextResponse.json({ok:true,reservation:paymentReservation,paymentRequest,paymentPageUrl,notificationChannel:"email",paymentMode:paymentSplit.paymentMode,onlineDueCents:paymentSplit.onlineDueCents,arrivalDueCents:paymentSplit.arrivalDueCents});
    } catch (paymentError) {
      await supabase.from("tokama_payment_requests").update({status:"cancelled"}).eq("reservation_id",reservation.id).eq("status","sent");
      await supabase.from("tokama_reservations").update({status:"approved",payment_method:null,payment_link_sent_at:null,updated_at:new Date().toISOString()}).eq("id",reservation.id).eq("payment_link_sent_at",now);
      return NextResponse.json({ok:false,message:paymentError instanceof Error?paymentError.message:"Nie udało się wysłać e-maila z płatnością."},{status:502});
    }
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
