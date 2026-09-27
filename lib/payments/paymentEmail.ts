type Locale = "pl" | "en";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character] || character);
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pl-PL", { day:"numeric", month:"long", year:"numeric", timeZone:"UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function buildPaymentEmail(input: { locale?: string; guestName:string; publicCode:string; checkin:string; checkout:string; amount:string; paymentPageUrl:string }) {
  const locale:Locale=input.locale === "en" ? "en" : "pl"; const english=locale === "en";
  return {
    subject: english ? `TOKAMA — stay ${input.publicCode} confirmed` : `TOKAMA — pobyt ${input.publicCode} zaakceptowany`,
    html:`<div style="margin:0;padding:32px 12px;background:#fff;font-family:Arial,sans-serif;color:#111"><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;height:auto"><p style="margin:8px 0 0;font-size:9px;letter-spacing:3px;color:#777">${english?"STAY CONFIRMED":"POBYT ZAAKCEPTOWANY"}</p></td></tr><tr><td style="padding:42px 34px;text-align:center"><h1 style="margin:0 0 18px;font:400 38px/1.05 Georgia,serif">${english?`Dear ${escapeHtml(input.guestName)}, your dates are confirmed.`:`${escapeHtml(input.guestName)}, termin jest potwierdzony.`}</h1><p style="margin:0 auto 26px;max-width:480px;color:#555;line-height:1.7">${english?"Complete the payment using the secure link below.":"Dokończ rezerwację, korzystając z bezpiecznego linku do płatności."}</p><div style="padding:22px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;line-height:1.8"><span style="display:block;font-size:10px;letter-spacing:2px;color:#777">${english?"RESERVATION":"REZERWACJA"} ${escapeHtml(input.publicCode)}</span><strong>${formatDate(input.checkin,locale)} — ${formatDate(input.checkout,locale)}</strong><br><span>${escapeHtml(input.amount)}</span></div><a href="${escapeHtml(input.paymentPageUrl)}" style="display:inline-block;margin-top:28px;padding:17px 28px;background:#111;color:#fff;text-decoration:none">${english?"Go to payment":"Przejdź do płatności"}</a><p style="margin:28px auto 0;max-width:480px;color:#777;font-size:12px;line-height:1.6">${english?"If you need any help, we are at your disposal.":"Jeśli potrzebujesz pomocy, jesteśmy do Twojej dyspozycji."}</p></td></tr></table></div>`,
  };
}
