import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://oiqdwgsfpvcuctvxfjpv.supabase.co";

const serviceKey =
  process.env.TOKAMA_ADMIN_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function POST(request: Request) {
  try {
    if (!serviceKey) {
      return NextResponse.json(
        { ok: false, message: "Missing Supabase service key." },
        { status: 500 }
      );
    }

    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing authorization token." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, message: "Invalid user token." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const expoPushToken = String(body?.expo_push_token || "").trim();

    const isExpoPushToken =
      expoPushToken.startsWith("ExponentPushToken[") ||
      expoPushToken.startsWith("ExpoPushToken[");

    if (!isExpoPushToken) {
      return NextResponse.json(
        { ok: false, message: "Invalid Expo push token." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("hostapp_push_tokens")
      .upsert(
        {
          user_id: user.id,
          expo_push_token: expoPushToken,
          platform: body?.platform || null,
          device_name: body?.device_name || null,
          is_active: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "expo_push_token" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, token: data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown push token error.",
      },
      { status: 500 }
    );
  }
}
