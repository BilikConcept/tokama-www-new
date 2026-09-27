import { sendTokamaEmail } from "@/lib/tokamaNotifications";
import { escapeEmailHtml, tokamaGuestEmail } from "@/lib/tokama/emailTemplate";

type SupabaseLike = any;

function formatDate(value: string, locale: "pl" | "en") {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export async function sendPaidReservationConfirmation(supabase: SupabaseLike, reservationId: string) {
  const { data: claimed, error: claimError } = await supabase.rpc("claim_tokama_payment_confirmation_email", { reservation_uuid: reservationId });
  if (claimError) throw claimError;
  if (!claimed) return { sent: false, reason: "already_claimed" };

  const { data: reservation, error } = await supabase.from("tokama_reservations")
    .select("id,public_code,locale,guest_name,guest_email,checkin,checkout")
    .eq("id", reservationId).single();
  if (error || !reservation?.guest_email) throw error || new Error("Reservation email is missing.");

  const locale: "pl" | "en" = reservation.locale === "en" ? "en" : "pl";
  const english = locale === "en";
  try {
    await sendTokamaEmail({
      to: reservation.guest_email,
      subject: english ? `TOKAMA — booking ${reservation.public_code} confirmed` : `TOKAMA — rezerwacja ${reservation.public_code} potwierdzona`,
      html: tokamaGuestEmail({ eyebrow:english?"BOOKING CONFIRMED":"REZERWACJA POTWIERDZONA", content:`<h1 style="margin:0 0 18px;font:400 38px/1.05 Georgia,serif">${english?`See you soon, ${escapeEmailHtml(reservation.guest_name)}.`:`Do zobaczenia, ${escapeEmailHtml(reservation.guest_name)}.`}</h1><p style="margin:0 auto 28px;max-width:480px;color:#555;line-height:1.7">${english?"We have received your payment and your stay is confirmed.":"Otrzymaliśmy płatność, a Twój pobyt jest potwierdzony."}</p><div style="padding:24px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5"><span style="display:block;font-size:10px;letter-spacing:2px;color:#777">${english?"RESERVATION NUMBER":"NUMER REZERWACJI"}</span><strong style="display:block;margin:8px 0 18px;font-size:28px">${escapeEmailHtml(reservation.public_code)}</strong><span style="color:#555">${formatDate(reservation.checkin,locale)} — ${formatDate(reservation.checkout,locale)}</span></div><p style="margin:28px auto 0;max-width:480px;color:#555;line-height:1.7">${english?"We remain at your disposal throughout your stay. If you need anything, simply contact us.":"Przez cały pobyt jesteśmy do Twojej dyspozycji. Jeśli będziesz czegoś potrzebować, po prostu skontaktuj się z nami."}</p>` }),
    });
    await supabase.from("tokama_reservations").update({ payment_confirmation_email_sent_at: new Date().toISOString() }).eq("id", reservationId);
    return { sent: true };
  } catch (emailError) {
    await supabase.from("tokama_reservations").update({ payment_confirmation_email_claimed_at: null }).eq("id", reservationId);
    throw emailError;
  }
}
