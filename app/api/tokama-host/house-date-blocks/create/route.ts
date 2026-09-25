import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RequestBody = {
  house_code: string;
  start_date: string;
  end_date: string;
  reason?: string;
};

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing authorization token." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RequestBody;

    const houseCode = String(body.house_code || "").trim().toUpperCase();
    const startDate = String(body.start_date || "").trim();
    const endDate = String(body.end_date || "").trim();

    if (!["TO", "KA", "MA"].includes(houseCode)) {
      return NextResponse.json(
        { ok: false, message: "Invalid house code." },
        { status: 400 }
      );
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json(
        { ok: false, message: "Invalid date format." },
        { status: 400 }
      );
    }

    if (new Date(`${endDate}T00:00:00`) <= new Date(`${startDate}T00:00:00`)) {
      return NextResponse.json(
        { ok: false, message: "End date must be after start date." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("hostapp_profiles")
      .select("id, is_active, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_active) {
      return NextResponse.json(
        { ok: false, message: "No active HOSTapp profile." },
        { status: 403 }
      );
    }

    const { data: house, error: houseError } = await supabase
      .from("tokama_houses")
      .select("id, code")
      .eq("code", houseCode)
      .single();

    if (houseError || !house) {
      return NextResponse.json(
        { ok: false, message: "House not found." },
        { status: 404 }
      );
    }

    const { data: block, error: blockError } = await supabase
      .from("tokama_house_date_blocks")
      .insert({
        house_id: house.id,
        house_code: houseCode,
        start_date: startDate,
        end_date: endDate,
        reason: body.reason || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (blockError || !block) {
      return NextResponse.json(
        { ok: false, message: blockError?.message || "Date block failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      block,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown date block error.",
      },
      { status: 500 }
    );
  }
}
