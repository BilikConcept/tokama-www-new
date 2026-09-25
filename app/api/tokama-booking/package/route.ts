import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ ok: false, message: "Brak pakietu." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tokama_packages")
    .select("id,slug,name,eyebrow,headline,short_description,package_price_cents,currency,valid_from,valid_to,weekdays,min_nights,max_guests,booking_note")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, message: "Pakiet nie jest dostępny." }, { status: 404 });
  return NextResponse.json({ ok: true, package: data }, { headers: { "Cache-Control": "no-store" } });
}
