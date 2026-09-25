import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findDiscountCode, normalizeDiscountCode } from "@/lib/tokama/discounts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = normalizeDiscountCode(body?.code);

  if (!code) {
    return NextResponse.json(
      { ok: false, code: "INVALID_DISCOUNT_CODE", message: "Wpisz kod rabatowy." },
      { status: 400 }
    );
  }

  try {
    const discount = await findDiscountCode(getSupabaseAdmin(), code, body?.checkin);

    if (!discount) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_DISCOUNT_CODE",
          message: "Kod jest nieprawidłowy, nieaktywny lub wygasł.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        discount: {
          code: discount.code,
          discountPercent: Number(discount.discount_percent),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nie udało się sprawdzić kodu.",
      },
      { status: 500 }
    );
  }
}
