import { NextResponse } from "next/server";

type Inquiry = {
  name?: string;
  email?: string;
  phone?: string;
  eventType?: string;
  eventDate?: string;
  guests?: string;
  message?: string;
  website?: string;
};

const clean = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export async function POST(request: Request) {
  let data: Inquiry;

  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Nieprawidłowe dane formularza." }, { status: 400 });
  }

  const name = clean(data.name, 120);
  const email = clean(data.email, 180);
  const phone = clean(data.phone, 60);
  const eventType = clean(data.eventType, 100);
  const eventDate = clean(data.eventDate, 40);
  const guests = clean(data.guests, 30);
  const message = clean(data.message, 4000);
  const website = clean(data.website, 200);

  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !message || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Uzupełnij imię, adres e-mail i wiadomość." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TOKAMA_EMAIL_FROM || "TOKAMA <noreply@tokama.pl>";
  const to = process.env.TOKAMA_EVENTS_TO || "kontakt@tokama.pl";

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Formularz nie jest jeszcze skonfigurowany." },
      { status: 503 }
    );
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Zapytanie eventowe — ${name}`,
      html: `<div style="margin:0;padding:32px 12px;background:#fff;font-family:Arial,sans-serif;color:#111"><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;height:auto"><p style="margin:8px 0 0;font-size:9px;letter-spacing:3px;color:#777">NOWE ZAPYTANIE EVENTOWE</p></td></tr><tr><td style="padding:38px 34px"><h1 style="margin:0 0 24px;font:400 34px/1.1 Georgia,serif">${escapeHtml(name)}</h1><p style="line-height:1.7"><strong>E-mail:</strong> ${escapeHtml(email)}<br><strong>Telefon:</strong> ${escapeHtml(phone || "—")}<br><strong>Rodzaj wydarzenia:</strong> ${escapeHtml(eventType || "—")}<br><strong>Planowany termin:</strong> ${escapeHtml(eventDate || "—")}<br><strong>Liczba gości:</strong> ${escapeHtml(guests || "—")}</p><p style="margin-top:28px;padding-top:24px;border-top:1px solid #e5e5e5;color:#555;line-height:1.7;white-space:pre-line">${escapeHtml(message)}</p></td></tr></table></div>`,
      text: [
        "Nowe zapytanie z formularza Eventy TOKAMA",
        "",
        `Imię i nazwisko: ${name}`,
        `E-mail: ${email}`,
        `Telefon: ${phone || "—"}`,
        `Rodzaj wydarzenia: ${eventType || "—"}`,
        `Planowany termin: ${eventDate || "—"}`,
        `Liczba gości: ${guests || "—"}`,
        "",
        "Wiadomość:",
        message,
      ].join("\n"),
    }),
  });

  if (!emailResponse.ok) {
    console.error("TOKAMA events email error:", await emailResponse.text());
    return NextResponse.json(
      { ok: false, error: "Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na kontakt@tokama.pl." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
