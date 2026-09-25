import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";
import { normalizeDiscountCode } from "@/lib/tokama/discounts";

export const dynamic = "force-dynamic";

const selection =
  "id, code, discount_percent, is_active, valid_from, expires_at, weekdays, created_at";

function startOfDay(value: unknown) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text;
}

function endOfDay(value: unknown) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59:59.999Z` : text;
}

export async function GET(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tokama_discount_codes")
    .select(selection)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, discountCodes: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const body = await request.json().catch(() => null);
  const code = normalizeDiscountCode(body?.code);
  const discountPercent = Math.round(Number(body?.discount_percent));
  const expiresAt = body?.expires_at ? endOfDay(body.expires_at) : null;
  const validFrom = body?.valid_from ? startOfDay(body.valid_from) : new Date().toISOString();
  const weekdays = Array.isArray(body?.weekdays)
    ? [...new Set(body.weekdays.map(Number).filter((day: number) => day >= 1 && day <= 7))]
    : [1,2,3,4,5,6,7];

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json(
      { ok: false, message: "Kod musi mieć 3–32 znaki: litery, cyfry, _ lub -." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    return NextResponse.json(
      { ok: false, message: "Rabat musi mieć wartość od 1 do 100%." },
      { status: 400 }
    );
  }

  if (expiresAt && !Number.isFinite(new Date(expiresAt).getTime())) {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowa data wygaśnięcia." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(new Date(validFrom).getTime()) || weekdays.length === 0) {
    return NextResponse.json({ ok: false, message: "Wybierz poprawny termin i co najmniej jeden dzień tygodnia." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tokama_discount_codes")
    .insert({
      code,
      discount_percent: discountPercent,
      valid_from: validFrom,
      expires_at: expiresAt,
      weekdays,
      is_active: true,
    })
    .select(selection)
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      {
        ok: false,
        message: conflict ? "Taki kod rabatowy już istnieje." : error.message,
      },
      { status: conflict ? 409 : 500 }
    );
  }

  return NextResponse.json({ ok: true, discountCode: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "").trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Brak identyfikatora kodu." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.discount_percent !== undefined) {
    const percent = Math.round(Number(body.discount_percent));
    if (percent < 1 || percent > 100) return NextResponse.json({ ok: false, message: "Rabat musi mieć wartość od 1 do 100%." }, { status: 400 });
    updates.discount_percent = percent;
  }
  if (body.valid_from !== undefined) updates.valid_from = body.valid_from ? startOfDay(body.valid_from) : new Date().toISOString();
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at ? endOfDay(body.expires_at) : null;
  if (Array.isArray(body.weekdays)) {
    const weekdays = [...new Set(body.weekdays.map(Number).filter((day: number) => day >= 1 && day <= 7))];
    if (!weekdays.length) return NextResponse.json({ ok: false, message: "Wybierz co najmniej jeden dzień tygodnia." }, { status: 400 });
    updates.weekdays = weekdays;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tokama_discount_codes")
    .update(updates)
    .eq("id", id)
    .select(selection)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Nie znaleziono kodu." },
      { status: error?.code === "PGRST116" ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, discountCode: data });
}

export async function DELETE(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ ok: false, message: "Brak identyfikatora kodu." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("tokama_discount_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
