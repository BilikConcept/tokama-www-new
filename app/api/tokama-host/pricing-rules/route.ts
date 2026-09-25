import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";

export const dynamic = "force-dynamic";

const selection = "id,name,price_cents,valid_from,valid_to,weekdays,priority,is_active,created_at,updated_at";

export async function GET(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase
    .from("tokama_pricing_rules")
    .select(selection)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricingRules: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  const id = String(body?.id || "").trim();
  const name = String(body?.name || "").trim();
  const priceCents = Math.round(Number(body?.price_cents));
  const validFrom = body?.valid_from ? String(body.valid_from) : null;
  const validTo = body?.valid_to ? String(body.valid_to) : null;
  const weekdays = Array.isArray(body?.weekdays)
    ? [...new Set(body.weekdays.map(Number).filter((day: number) => day >= 1 && day <= 7))]
    : [];

  if (!name || !Number.isInteger(priceCents) || priceCents < 0 || weekdays.length === 0) {
    return NextResponse.json({ ok: false, message: "Uzupełnij nazwę, cenę i co najmniej jeden dzień tygodnia." }, { status: 400 });
  }
  if (validFrom && validTo && validTo < validFrom) {
    return NextResponse.json({ ok: false, message: "Data końcowa nie może być wcześniejsza niż początkowa." }, { status: 400 });
  }

  const payload = {
    name,
    price_cents: priceCents,
    valid_from: validFrom,
    valid_to: validTo,
    weekdays,
    priority: Math.round(Number(body?.priority || 0)),
    is_active: body?.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? auth.supabase.from("tokama_pricing_rules").update(payload).eq("id", id)
    : auth.supabase.from("tokama_pricing_rules").insert(payload);
  const { data, error } = await query.select(selection).single();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricingRule: data }, { status: id ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireHostApi(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ ok: false, message: "Brak identyfikatora reguły." }, { status: 400 });
  const { error } = await auth.supabase.from("tokama_pricing_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
