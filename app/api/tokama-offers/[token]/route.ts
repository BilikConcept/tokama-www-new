import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAvailableHouseIdsForOffer } from "@/lib/tokama/offerHolds";
import { getNights } from "@/lib/tokama/pricing";

type Variant = { id: string; label: string; description?: string; total_cents: number; line_items?: unknown[] };

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] || character));

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("tokama_individual_offers").select("id,offer_number,status,client_name,title,introduction,checkin,checkout,guests,currency,notes,valid_until,variants,accepted_variant_id,accepted_at,hold_expires_at,reservation_id").eq("public_token", token).maybeSingle();
  if (!data || !["sent", "accepted"].includes(data.status)) return NextResponse.json({ message: "Oferta nie jest dostępna." }, { status: 404 });
  if (data.valid_until && data.valid_until < new Date().toISOString().slice(0,10)) return NextResponse.json({ message: "Oferta wygasła." }, { status: 410 });
  if (!data.accepted_at && (!data.hold_expires_at || data.hold_expires_at <= new Date().toISOString())) return NextResponse.json({ message: "24-godzinna blokada tej oferty wygasła. Skontaktuj się z TOKAMA, aby ponownie potwierdzić termin." }, { status: 410 });
  let paymentUrl: string | null = null;
  if (data.reservation_id) {
    const { data: reservation } = await supabase.from("tokama_reservations").select("public_code").eq("id", data.reservation_id).maybeSingle();
    if (reservation?.public_code) paymentUrl = `/platnosc/${encodeURIComponent(reservation.public_code)}`;
  }
  return NextResponse.json({ offer: { ...data, payment_url: paymentUrl } });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { variant_id } = await request.json();
  const supabase = getSupabaseAdmin();
  const { data: offer } = await supabase.from("tokama_individual_offers").select("*").eq("public_token", token).maybeSingle();
  if (!offer || !["sent", "accepted"].includes(offer.status)) return NextResponse.json({ message: "Oferta nie jest dostępna." }, { status: 404 });
  if (offer.valid_until && offer.valid_until < new Date().toISOString().slice(0,10)) return NextResponse.json({ message: "Oferta wygasła." }, { status: 410 });
  if (!offer.accepted_at && (!offer.hold_expires_at || offer.hold_expires_at <= new Date().toISOString())) return NextResponse.json({ message: "24-godzinna blokada terminu wygasła. Poproś TOKAMA o ponowne wysłanie oferty." }, { status: 410 });
  if (offer.accepted_at && offer.accepted_variant_id !== variant_id) return NextResponse.json({ message: "Ta oferta została już zaakceptowana w innym wariancie." }, { status: 409 });
  const variants = (Array.isArray(offer.variants) ? offer.variants : []) as Variant[];
  const variant = variants.find(item => item.id === variant_id);
  if (!variant) return NextResponse.json({ message: "Wybierz poprawny wariant oferty." }, { status: 400 });
  if (offer.reservation_id) {
    const { data: existing } = await supabase.from("tokama_reservations").select("public_code").eq("id", offer.reservation_id).maybeSingle();
    if (existing?.public_code) return NextResponse.json({ ok:true, payment_url:`/platnosc/${existing.public_code}` });
  }

  const { data: settings, error: settingsError } = await supabase.from("tokama_booking_settings").select("max_adults_per_house,houses_total,base_price_per_house_per_night_cents,min_nights").limit(1).maybeSingle();
  if (settingsError || !settings) return NextResponse.json({ message: "Nie udało się odczytać ustawień rezerwacji." }, { status: 500 });
  const guests = Math.max(1, Number(offer.guests || 1));
  const housesNeeded = Math.ceil(guests / Math.max(1, Number(settings.max_adults_per_house || 7)));
  const availableHouseIds = await getAvailableHouseIdsForOffer({ supabase, checkin: offer.checkin, checkout: offer.checkout, housesNeeded:Number(settings.houses_total||3), excludeOfferId: offer.id });
  const heldHouseIds = Array.isArray(offer.held_house_ids) ? offer.held_house_ids : [];
  const verifiedHouseIds = heldHouseIds.filter((houseId: string) => availableHouseIds.includes(houseId)).slice(0, housesNeeded);
  if (verifiedHouseIds.length < housesNeeded) return NextResponse.json({ message: "Termin nie jest już dostępny dla wymaganej liczby domków. Skontaktuj się z TOKAMA." }, { status: 409 });

  const acceptedAt = offer.accepted_at || new Date().toISOString();
  const nights = getNights(offer.checkin, offer.checkout);
  const { data: reservation, error: reservationError } = await supabase.from("tokama_reservations").insert({
    source:"website", status:"payment_sent", locale:"pl", checkin:offer.checkin, checkout:offer.checkout,
    nights, adults:guests, children:0, houses_count:housesNeeded, guest_name:offer.client_name,
    guest_email:offer.client_email, guest_phone:"", currency:offer.currency||"PLN", stay_price_cents:Number(variant.total_cents),
    addons_price_cents:0, total_estimated_cents:Number(variant.total_cents), host_final_amount_cents:Number(variant.total_cents),
    min_nights_at_booking:Math.max(1,nights), base_price_per_house_per_night_cents_at_booking:Number(settings.base_price_per_house_per_night_cents||0),
    individual_offer_id:offer.id, individual_offer_variant_id:variant.id, payment_method:(process.env.TOKAMA_DEFAULT_PAYMENT_PROVIDER||"bank_transfer"),
    payment_link_sent_at:acceptedAt,
  }).select("id,public_code").single();
  if (reservationError || !reservation) return NextResponse.json({ message: reservationError?.message || "Nie udało się utworzyć rezerwacji." }, { status: 500 });
  const { error: housesError } = await supabase.from("tokama_reservation_houses").insert(verifiedHouseIds.map((houseId:string)=>({reservation_id:reservation.id,house_id:houseId})));
  if (housesError) { await supabase.from("tokama_reservations").delete().eq("id",reservation.id); return NextResponse.json({message:housesError.message},{status:500}); }
  const provider = String(process.env.TOKAMA_DEFAULT_PAYMENT_PROVIDER || "bank_transfer").toLowerCase() === "p24" ? "p24" : "bank_transfer";
  const paymentUrl = `/platnosc/${encodeURIComponent(reservation.public_code)}`;
  const { error: paymentError } = await supabase.from("tokama_payment_requests").insert({ reservation_id:reservation.id,provider,public_code:reservation.public_code,payment_page_url:paymentUrl,payment_url:paymentUrl,amount_cents:Number(variant.total_cents),currency:offer.currency||"PLN",status:"sent",sent_at:acceptedAt });
  if (paymentError) { await supabase.from("tokama_reservations").delete().eq("id",reservation.id); return NextResponse.json({message:paymentError.message},{status:500}); }
  await supabase.from("tokama_individual_offers").update({ status:"accepted", accepted_variant_id:variant.id, accepted_at:acceptedAt, reservation_id:reservation.id, updated_at:new Date().toISOString() }).eq("id",offer.id);
  if (!offer.accepted_at && process.env.RESEND_API_KEY && process.env.TOKAMA_EMAIL_FROM) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from:process.env.TOKAMA_EMAIL_FROM, to:"kontakt@tokama.pl", subject:`TOKAMA — zaakceptowano ${offer.offer_number}`, html:`<div style="margin:0;padding:32px 12px;background:#fff;font-family:Arial,sans-serif;color:#111"><table role="presentation" width="100%" style="max-width:620px;margin:auto;border-collapse:collapse;border:1px solid #e5e5e5"><tr><td style="padding:28px;text-align:center;border-bottom:1px solid #e5e5e5"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;height:auto"><p style="margin:8px 0 0;font-size:9px;letter-spacing:3px;color:#777">AKCEPTACJA OFERTY INDYWIDUALNEJ</p></td></tr><tr><td style="padding:40px 34px;text-align:center"><h1 style="margin:0 0 22px;font:400 36px/1.05 Georgia,serif">Klient zaakceptował ofertę</h1><p style="color:#555;line-height:1.7"><strong>${escapeHtml(offer.client_name)}</strong> wybrał wariant „${escapeHtml(variant.label)}”.</p><p style="margin:24px 0 0;padding:20px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5"><strong>${escapeHtml(offer.checkin)} — ${escapeHtml(offer.checkout)}</strong><br><span style="color:#777">${escapeHtml(offer.offer_number)}</span></p></td></tr></table></div>` });
  }
  return NextResponse.json({ ok:true, payment_url:paymentUrl });
}
