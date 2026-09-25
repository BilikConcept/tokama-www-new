import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function requireHostApi(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Brak autoryzacji HOSTapp." },
        { status: 401 }
      ),
    };
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Sesja HOSTapp wygasła." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("hostapp_profiles")
    .select("id, is_active, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.is_active) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "To konto nie ma aktywnego dostępu HOSTapp." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
    profile,
  };
}
