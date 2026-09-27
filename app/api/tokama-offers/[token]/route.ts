import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Variant = { id: string; label: string; description?: string; total_cents: number; line_items?: unknown[] };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { data } = await getSupabaseAdmin().from("tokama_individual_offers").select("id,offer_number,status,client_name,title,introduction,checkin,checkout,guests,currency,notes,valid_until,variants,accepted_variant_id,accepted_at").eq("public_token", token).maybeSingle();
  if (!data || !["sent", "accepted"].includes(data.status)) return NextResponse.json({ message: "Oferta nie jest dostępna." }, { status: 404 });
  if (data.valid_until && data.valid_until < new Date().toISOString().slice(0,10)) return NextResponse.json({ message: "Oferta wygasła." }, { status: 410 });
  return NextResponse.json({ offer: data });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { variant_id } = await request.json();
  const supabase = getSupabaseAdmin();
  const { data: offer } = await supabase.from("tokama_individual_offers").select("*").eq("public_token", token).maybeSingle();
  if (!offer || !["sent", "accepted"].includes(offer.status)) return NextResponse.json({ message: "Oferta nie jest dostępna." }, { status: 404 });
  if (offer.accepted_at && offer.accepted_variant_id !== variant_id) return NextResponse.json({ message: "Ta oferta została już zaakceptowana w innym wariancie." }, { status: 409 });
  const variants = (Array.isArray(offer.variants) ? offer.variants : []) as Variant[];
  const variant = variants.find(item => item.id === variant_id);
  if (!variant) return NextResponse.json({ message: "Wybierz poprawny wariant oferty." }, { status: 400 });
  const acceptedAt = offer.accepted_at || new Date().toISOString();
  await supabase.from("tokama_individual_offers").update({ status:"accepted", accepted_variant_id:variant.id, accepted_at:acceptedAt, updated_at:new Date().toISOString() }).eq("id",offer.id);
  if (!offer.accepted_at && process.env.RESEND_API_KEY && process.env.TOKAMA_EMAIL_FROM) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from:process.env.TOKAMA_EMAIL_FROM, to:"kontakt@tokama.pl", subject:`TOKAMA — zaakceptowano ${offer.offer_number}`, html:`<div style="margin:0;padding:32px 12px;background:#fff;font-family:Arial,sans-serif;color:#111"><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;height:auto"><p style="margin:8px 0 0;font-size:9px;letter-spacing:3px;color:#777">AKCEPTACJA OFERTY INDYWIDUALNEJ</p></td></tr><tr><td style="padding:40px 34px;text-align:center"><h1 style="margin:0 0 22px;font:400 36px/1.05 Georgia,serif">Klient zaakceptował ofertę</h1><p style="color:#555;line-height:1.7"><strong>${escapeHtml(offer.client_name)}</strong> wybrał wariant „${escapeHtml(variant.label)}”.</p><p style="margin:24px 0 0;padding:20px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5"><strong>${escapeHtml(offer.checkin)} — ${escapeHtml(offer.checkout)}</strong><br><span style="color:#777">${escapeHtml(offer.offer_number)}</span></p></td></tr></table></div>` });
  }
  return NextResponse.json({ ok:true, booking_url:`/rezerwacja?individual_offer=${token}` });
}
