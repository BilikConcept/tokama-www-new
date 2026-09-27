import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireContentAdmin } from "@/lib/content-studio/auth";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export async function POST(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;
  const { id, recipient } = await request.json();
  const { data: offer, error } = await auth.supabase.from("tokama_individual_offers").select("*").eq("id", id).maybeSingle();
  if (error || !offer) return NextResponse.json({ message: "Nie znaleziono oferty." }, { status: 404 });
  const target = String(recipient || offer.client_email || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(target)) return NextResponse.json({ message: "Podaj poprawny adres e-mail klienta." }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.TOKAMA_EMAIL_FROM) return NextResponse.json({ message: "Wysyłka e-mail nie jest skonfigurowana." }, { status: 503 });

  const items = Array.isArray(offer.line_items) ? offer.line_items : [];
  const rows = items.map((item: { name?: string; description?: string; quantity?: number; unit_price_cents?: number }) => `<tr><td style="padding:14px 0;border-bottom:1px solid #e7e7e7"><strong>${escapeHtml(item.name)}</strong>${item.description ? `<br><span style="color:#666;font-size:13px">${escapeHtml(item.description)}</span>` : ""}</td><td align="center" style="padding:14px;border-bottom:1px solid #e7e7e7">${Number(item.quantity || 1)}</td><td align="right" style="padding:14px 0;border-bottom:1px solid #e7e7e7">${money(Number(item.unit_price_cents || 0) * Number(item.quantity || 1), offer.currency)}</td></tr>`).join("");
  const html = `<div style="margin:0;padding:32px 12px;background:#fff;color:#111;font-family:Arial,sans-serif"><table role="presentation" width="100%" style="max-width:680px;margin:0 auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:30px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA"><p style="margin:10px 0 0;font-size:9px;letter-spacing:3px;color:#666">OFERTA INDYWIDUALNA · ${escapeHtml(offer.offer_number)}</p></td></tr><tr><td style="padding:42px 34px"><p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#666">PRZYGOTOWANA DLA ${escapeHtml(offer.client_name).toUpperCase()}</p><h1 style="margin:0 0 22px;font-family:Georgia,serif;font-weight:400;font-size:38px;line-height:1.05">${escapeHtml(offer.title)}</h1><p style="margin:0 0 28px;color:#555;line-height:1.7">${escapeHtml(offer.introduction).replace(/\n/g,"<br>")}</p><table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table><p style="margin:30px 0 0;text-align:right;font-size:13px;color:#666">Razem<br><strong style="font-family:Georgia,serif;font-size:32px;color:#111">${money(Number(offer.total_cents || 0), offer.currency)}</strong></p>${offer.notes ? `<p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e5e5e5;color:#555;line-height:1.65">${escapeHtml(offer.notes).replace(/\n/g,"<br>")}</p>` : ""}${offer.valid_until ? `<p style="margin:24px 0 0;font-size:12px;color:#777">Oferta ważna do ${escapeHtml(offer.valid_until)}.</p>` : ""}</td></tr></table></div>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sent = await resend.emails.send({ from: process.env.TOKAMA_EMAIL_FROM, to: target, replyTo: "kontakt@tokama.pl", subject: `TOKAMA — ${offer.title || "oferta indywidualna"}`, html });
  if (sent.error) return NextResponse.json({ message: sent.error.message }, { status: 502 });
  const sentAt = new Date().toISOString();
  await auth.supabase.from("tokama_individual_offers").update({ status: "sent", sent_at: sentAt, last_sent_to: target, updated_by: auth.user.id, updated_at: sentAt }).eq("id", id);
  return NextResponse.json({ ok: true, sent_at: sentAt, recipient: target });
}
