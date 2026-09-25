import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaSms } from "@/lib/tokamaNotifications";
import { TOKAMA_GLOBAL_GATE_CODE } from "@/lib/tokama/gateCode";

function formatCheckinTime(value?: string | null) {
  if (!value) return "15:00";

  return value.slice(0, 5);
}

function buildGateCodeSms(input: {
  locale: "pl" | "en";
  publicCode: string;
  gateCode: string;
  checkinTime?: string | null;
}) {
  const checkinTime = formatCheckinTime(input.checkinTime);

  if (input.locale === "en") {
    return `Your gate code: ${input.gateCode}

Reservation number: ${input.publicCode}
Check-in from ${checkinTime}.
See you at Tokama.`;
  }

  return `Twój kod do bramy: ${input.gateCode}

Numer rezerwacji: ${input.publicCode}
Meldunek od ${checkinTime}.
Do zobaczenia w Tokamie.`;
}

function isAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const expectedSecret = process.env.CRON_SECRET || process.env.TOKAMA_CRON_SECRET;

  if (!expectedSecret) {
    return false;
  }

  const headerSecret = request.headers.get("x-tokama-secret");
  const authorization = request.headers.get("authorization") || "";
  const bearerSecret = authorization.replace(/^Bearer\s+/i, "").trim();

  return headerSecret === expectedSecret || bearerSecret === expectedSecret;
}

async function runGateCodeCron(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: reservations, error } = await supabase
      .from("tokama_reservations")
      .select(
        "id, public_code, locale, status, guest_phone, gate_code, checkin_time, gate_code_sms_send_at, gate_code_sms_sent_at"
      )
      .in("status", ["approved", "payment_sent", "paid", "confirmed"])
      .not("guest_phone", "is", null)
      .not("gate_code", "is", null)
      .is("gate_code_sms_sent_at", null)
      .lte("gate_code_sms_send_at", now)
      .order("gate_code_sms_send_at", { ascending: true })
      .limit(25);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    const sent: string[] = [];
    const failed: { id: string; message: string }[] = [];

    for (const reservation of reservations || []) {
      try {
        await sendTokamaSms({
          to: reservation.guest_phone,
          text: buildGateCodeSms({
            locale: reservation.locale || "pl",
            publicCode: reservation.public_code || "—",
            gateCode: TOKAMA_GLOBAL_GATE_CODE,
            checkinTime: reservation.checkin_time,
          }),
        });

        await supabase
          .from("tokama_reservations")
          .update({
            gate_code_sms_sent_at: new Date().toISOString(),
          })
          .eq("id", reservation.id);

        sent.push(reservation.id);
      } catch (smsError) {
        failed.push({
          id: reservation.id,
          message:
            smsError instanceof Error ? smsError.message : "Unknown SMS error.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: now,
      found: reservations?.length || 0,
      sent,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown gate code cron error.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return runGateCodeCron(request);
}

export async function POST(request: Request) {
  return runGateCodeCron(request);
}
