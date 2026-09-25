import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";
import { sendTokamaSms } from "@/lib/tokamaNotifications";

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

function buildPaymentConfirmedSms(input: {
  locale: string | null;
  publicCode: string;
}) {
  if (input.locale === "en") {
    return `Thank you for your payment for your TOKAMA stay.

Reservation number: ${input.publicCode}

We wish you a wonderful and peaceful stay.`;
  }

  return `Dziękujemy za opłacenie pobytu w TOKAMA.

Numer rezerwacji: ${input.publicCode}

Życzymy pięknego i spokojnego pobytu.`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireHostApi(request);
    if (!auth.ok) return auth.response;

    const { reservationId } = await context.params;

    const { data: reservation, error: reservationError } = await auth.supabase
      .from("tokama_reservations")
      .select(
        "id, public_code, status, locale, guest_phone, payment_status, payment_method, payment_confirmed_at, payment_confirmation_sms_sent_at"
      )
      .eq("id", reservationId)
      .maybeSingle();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Nie znaleziono rezerwacji." },
        { status: 404 }
      );
    }

    if (["cancelled", "rejected"].includes(String(reservation.status))) {
      return NextResponse.json(
        { ok: false, message: "Nie można oznaczyć anulowanej rezerwacji jako opłaconej." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: updatedReservation, error: updateError } = await auth.supabase
      .from("tokama_reservations")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_method:
          reservation.payment_method === "cash_on_arrival"
            ? "cash"
            : reservation.payment_method || "manual",
        payment_confirmed_at: reservation.payment_confirmed_at || now,
        payment_confirmed_by: auth.user.id,
        updated_at: now,
      })
      .eq("id", reservation.id)
      .select(
        "id, public_code, status, payment_status, payment_method, payment_confirmed_at, payment_confirmation_sms_sent_at"
      )
      .single();

    if (updateError || !updatedReservation) {
      return NextResponse.json(
        { ok: false, message: updateError?.message || "Nie udało się zapisać płatności." },
        { status: 500 }
      );
    }

    if (reservation.payment_method === "bank_transfer") {
      const { error: paymentRequestError } = await auth.supabase
        .from("tokama_payment_requests")
        .update({
          status: "paid",
          paid_at: now,
          updated_at: now,
        })
        .eq("reservation_id", reservation.id)
        .eq("provider", "bank_transfer")
        .in("status", ["created", "sent"]);

      if (paymentRequestError) {
        console.error("Unable to mark bank transfer request as paid", {
          reservationId: reservation.id,
          message: paymentRequestError.message,
        });
      }
    }

    let smsStatus: "sent" | "already_sent" | "missing_phone" | "failed" = "already_sent";
    let smsWarning: string | null = null;

    if (!reservation.payment_confirmation_sms_sent_at) {
      if (!reservation.guest_phone) {
        smsStatus = "missing_phone";
        smsWarning = "Płatność oznaczono jako opłaconą, ale rezerwacja nie ma numeru telefonu gościa.";
      } else {
        try {
          await sendTokamaSms({
            to: reservation.guest_phone,
            text: buildPaymentConfirmedSms({
              locale: reservation.locale,
              publicCode: reservation.public_code || reservation.id,
            }),
          });

          await auth.supabase
            .from("tokama_reservations")
            .update({
              payment_confirmation_sms_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", reservation.id);

          smsStatus = "sent";
        } catch (smsError) {
          smsStatus = "failed";
          smsWarning =
            smsError instanceof Error
              ? smsError.message
              : "Płatność została zapisana, ale SMS nie został wysłany.";
        }
      }
    }

    return NextResponse.json({
      ok: true,
      reservation: updatedReservation,
      smsStatus,
      smsWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nie udało się oznaczyć płatności.",
      },
      { status: 500 }
    );
  }
}
