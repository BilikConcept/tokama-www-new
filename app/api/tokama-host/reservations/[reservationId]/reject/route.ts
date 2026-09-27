import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaEmail, sendTokamaSms } from "@/lib/tokamaNotifications";

type RouteContext = {
  params: Promise<{
    reservationId: string;
  }>;
};

type RejectionReason =
  | "dates_unavailable"
  | "capacity_unavailable"
  | "minimum_stay"
  | "private_event"
  | "other";

const rejectionReasons: Record<
  RejectionReason,
  {
    pl: string;
    en: string;
  }
> = {
  dates_unavailable: {
    pl: "Wybrany termin nie jest już dostępny.",
    en: "The selected dates are no longer available.",
  },
  capacity_unavailable: {
    pl: "Nie mamy dostępnego odpowiedniego domku dla tej liczby gości.",
    en: "We do not have a suitable house available for this number of guests.",
  },
  minimum_stay: {
    pl: "Wybrany pobyt nie spełnia minimalnej liczby nocy.",
    en: "The selected stay does not meet the minimum night requirement.",
  },
  private_event: {
    pl: "W tym terminie obiekt jest zarezerwowany na wydarzenie prywatne.",
    en: "The property is reserved for a private event during these dates.",
  },
  other: {
    pl: "Rezerwacja nie mogła zostać przyjęta.",
    en: "The reservation could not be accepted.",
  },
};

function isRejectionReason(value: unknown): value is RejectionReason {
  return (
    value === "dates_unavailable" ||
    value === "capacity_unavailable" ||
    value === "minimum_stay" ||
    value === "private_event" ||
    value === "other"
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function buildRejectionSms(input: {
  locale: "pl" | "en";
  checkin: string;
  checkout: string;
  reason: RejectionReason;
}) {
  const reasonText = rejectionReasons[input.reason][input.locale];

  if (input.locale === "en") {
    return `We are sorry, but your stay cannot be confirmed.

Dates: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
Reason: ${reasonText}

You are welcome to choose another date.`;
  }

  return `Przykro nam, ale nie możemy potwierdzić Twojego pobytu.

Termin: ${formatDate(input.checkin)} - ${formatDate(input.checkout)}
Powód: ${reasonText}

Zachęcamy do wyboru innego terminu.`;
}

function buildRejectionEmail(input: { locale:"pl"|"en"; guestName:string; checkin:string; checkout:string; reason:RejectionReason }) {
  const english=input.locale==="en"; const reasonText=rejectionReasons[input.reason][input.locale];
  return { subject:english?"TOKAMA — update about your stay":"TOKAMA — informacja o Twoim pobycie", html:`<div style="margin:0;padding:32px 12px;background:#fff;font-family:Arial,sans-serif;color:#111"><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;height:auto"><p style="margin:8px 0 0;font-size:9px;letter-spacing:3px;color:#777">WINDYKI · BLISKO NATURY</p></td></tr><tr><td style="padding:42px 34px;text-align:center"><p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;color:#777">${english?"RESERVATION UPDATE":"INFORMACJA O REZERWACJI"}</p><h1 style="margin:0 0 22px;font:400 36px/1.05 Georgia,serif">${english?`Dear ${input.guestName},`:`${input.guestName},`}</h1><p style="margin:0 auto 24px;max-width:480px;color:#555;line-height:1.7">${english?"Unfortunately, we cannot confirm your stay for the selected dates.":"Niestety nie możemy potwierdzić Twojego pobytu w wybranym terminie."}</p><p style="margin:0;padding:22px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;line-height:1.7"><strong>${formatDate(input.checkin)} — ${formatDate(input.checkout)}</strong><br><span style="color:#666">${reasonText}</span></p><p style="margin:26px auto 0;max-width:480px;color:#555;line-height:1.7">${english?"You are warmly invited to choose another date.":"Zapraszamy do wyboru innego terminu — chętnie pomożemy znaleźć najlepszą alternatywę."}</p><a href="https://tokama-www-new.vercel.app/rezerwacja" style="display:inline-block;margin-top:28px;padding:16px 24px;background:#111;color:#fff;text-decoration:none">${english?"Choose another date":"Wybierz inny termin"}</a></td></tr></table></div>` };
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

    const body = await request.json().catch(() => null);
    const reason: RejectionReason = isRejectionReason(body?.reason)
      ? body.reason
      : "other";

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
        "id, status, locale, checkin, checkout, guest_name, guest_phone, guest_email, rejection_sms_sent_at"
      )
      .eq("id", reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Reservation not found." },
        { status: 404 }
      );
    }

    if (reservation.status !== "requested") {
      return NextResponse.json(
        { ok: false, message: "Only requested reservations can be rejected." },
        { status: 400 }
      );
    }

    if (!reservation.guest_phone && !reservation.guest_email) {
      return NextResponse.json(
        { ok: false, message: "Brak numeru telefonu i adresu e-mail gościa." },
        { status: 400 }
      );
    }

    let rejectionSmsSentAt = reservation.rejection_sms_sent_at;
    let notificationChannel: "sms"|"email" = "sms";

    if (!rejectionSmsSentAt) {
      try {
        if (!reservation.guest_phone) throw new Error("Missing phone");
        await sendTokamaSms({ to:reservation.guest_phone,text:buildRejectionSms({locale:reservation.locale||"pl",checkin:reservation.checkin,checkout:reservation.checkout,reason}) });
      } catch (smsError) {
        if (!reservation.guest_email) throw smsError;
        const email=buildRejectionEmail({locale:reservation.locale||"pl",guestName:reservation.guest_name||"",checkin:reservation.checkin,checkout:reservation.checkout,reason});
        await sendTokamaEmail({to:reservation.guest_email,...email}); notificationChannel="email";
      }

      rejectionSmsSentAt = new Date().toISOString();
    }

    const { data: updatedReservation, error: updateError } = await supabase
      .from("tokama_reservations")
      .update({
        status: "rejected",
        rejection_reason: reason,
        rejection_sms_sent_at: rejectionSmsSentAt,
      })
      .eq("id", reservationId)
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
      smsSent: notificationChannel === "sms",
      notificationChannel,
      reason,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown reject error.",
      },
      { status: 500 }
    );
  }
}
