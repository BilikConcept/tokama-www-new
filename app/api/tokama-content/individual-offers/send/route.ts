import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireContentAdmin } from "@/lib/content-studio/auth";
import { getAvailableHouseIdsForOffer } from "@/lib/tokama/offerHolds";

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
  if (offer.reservation_id || offer.status === "accepted") return NextResponse.json({ message: "Zaakceptowanej oferty nie można wysłać ponownie." }, { status: 409 });
  const target = String(recipient || offer.client_email || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(target)) return NextResponse.json({ message: "Podaj poprawny adres e-mail klienta." }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.TOKAMA_EMAIL_FROM) return NextResponse.json({ message: "Wysyłka e-mail nie jest skonfigurowana." }, { status: 503 });

  const variants = Array.isArray(offer.variants) ? offer.variants : [];
  if (!variants.length) return NextResponse.json({ message: "Dodaj co najmniej jeden wariant oferty." }, { status: 400 });
  if (!offer.checkin || !offer.checkout || offer.checkout <= offer.checkin) return NextResponse.json({ message: "Ustaw poprawny termin oferty." }, { status: 400 });
  const { data: settings, error: settingsError } = await auth.supabase.from("tokama_booking_settings").select("max_adults_per_house,houses_total").limit(1).maybeSingle();
  if (settingsError || !settings) return NextResponse.json({ message: settingsError?.message || "Nie udało się odczytać ustawień rezerwacji." }, { status: 500 });
  const maxGuestsPerHouse = Math.max(1, Number(settings?.max_adults_per_house || 7));
  const housesNeeded = Math.ceil(Math.max(1, Number(offer.guests || 1)) / maxGuestsPerHouse);
  if (housesNeeded > Number(settings?.houses_total || 3)) return NextResponse.json({ message: `Ta oferta wymaga ${housesNeeded} domków, a dostępne są maksymalnie ${settings?.houses_total || 3}.` }, { status: 400 });
  let heldHouseIds: string[];
  try {
    heldHouseIds = await getAvailableHouseIdsForOffer({ supabase: auth.supabase, checkin: offer.checkin, checkout: offer.checkout, housesNeeded, excludeOfferId: offer.id });
  } catch (availabilityError) {
    return NextResponse.json({ message: availabilityError instanceof Error ? availabilityError.message : "Nie udało się sprawdzić dostępności." }, { status: 500 });
  }
  if (heldHouseIds.length < housesNeeded) return NextResponse.json({ message: "Ten termin nie jest już dostępny dla wymaganej liczby domków. Oferta nie została wysłana." }, { status: 409 });
  const holdExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error: holdError } = await auth.supabase.from("tokama_individual_offers").update({ held_house_ids: heldHouseIds, hold_expires_at: holdExpiresAt, updated_at: new Date().toISOString() }).eq("id", offer.id);
  if (holdError) return NextResponse.json({ message: holdError.message }, { status: 500 });
  const rows = variants.map((variant: { label?: string; description?: string; total_cents?: number },index:number) => `<tr><td style="padding:18px 0;border-bottom:1px solid #e7e7e7"><small style="letter-spacing:2px;color:#777">OFERTA ${index+1}</small><br><strong style="font-size:18px">${escapeHtml(variant.label)}</strong>${variant.description ? `<br><span style="color:#666;font-size:13px">${escapeHtml(variant.description)}</span>` : ""}</td><td align="right" style="padding:18px 0;border-bottom:1px solid #e7e7e7"><strong>${money(Number(variant.total_cents || 0), offer.currency)}</strong></td></tr>`).join("");
  const offerUrl = `https://tokama-www-new.vercel.app/oferta/${offer.public_token}`;
  const html = `<div style="margin:0;padding:32px 12px;background:#fff;color:#111;font-family:Arial,sans-serif"><table role="presentation" width="100%" style="max-width:680px;margin:0 auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:30px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA"><p style="margin:10px 0 0;font-size:9px;letter-spacing:3px;color:#666">OFERTA INDYWIDUALNA · ${escapeHtml(offer.offer_number)}</p></td></tr><tr><td style="padding:42px 34px"><p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#666">PRZYGOTOWANA DLA ${escapeHtml(offer.client_name).toUpperCase()}</p><h1 style="margin:0 0 22px;font-family:Georgia,serif;font-weight:400;font-size:38px;line-height:1.05">${escapeHtml(offer.title)}</h1><p style="margin:0 0 28px;color:#555;line-height:1.7">${escapeHtml(offer.introduction).replace(/\n/g,"<br>")}</p><table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table><p style="margin:32px 0;text-align:center"><a href="${offerUrl}" style="display:inline-block;padding:17px 26px;background:#111;color:#fff;text-decoration:none">Zobacz i zaakceptuj ofertę</a></p>${offer.notes ? `<p style="margin:28px 0 0;padding-top:22px;border-top:1px solid #e5e5e5;color:#555;line-height:1.65">${escapeHtml(offer.notes).replace(/\n/g,"<br>")}</p>` : ""}${offer.valid_until ? `<p style="margin:24px 0 0;font-size:12px;color:#777">Oferta ważna do ${escapeHtml(offer.valid_until)}.</p>` : ""}</td></tr></table></div>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const sent = await resend.emails.send({ from: process.env.TOKAMA_EMAIL_FROM, to: target, replyTo: "kontakt@tokama.pl", subject: `TOKAMA — ${offer.title || "oferta indywidualna"}`, html });
  if (sent.error) {
    await auth.supabase.from("tokama_individual_offers").update({ held_house_ids: [], hold_expires_at: null }).eq("id", offer.id);
    return NextResponse.json({ message: sent.error.message }, { status: 502 });
  }
  const sentAt = new Date().toISOString();
  await auth.supabase.from("tokama_individual_offers").update({ status: "sent", sent_at: sentAt, last_sent_to: target, hold_expires_at: holdExpiresAt, held_house_ids: heldHouseIds, updated_by: auth.user.id, updated_at: sentAt }).eq("id", id);
  return NextResponse.json({ ok: true, sent_at: sentAt, recipient: target, hold_expires_at: holdExpiresAt });
}
