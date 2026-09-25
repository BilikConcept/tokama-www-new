import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function requireContentAdmin(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false as const, response: NextResponse.json({ message: "Brak sesji." }, { status: 401 }) };

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { ok: false as const, response: NextResponse.json({ message: "Sesja wygasła." }, { status: 401 }) };

  const { data: profile } = await supabase.from("hostapp_profiles").select("is_active, role").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || !["owner", "admin", "editor"].includes(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ message: "Brak dostępu do Content Studio." }, { status: 403 }) };
  }
  return { ok: true as const, supabase, user, role: profile.role as string };
}

