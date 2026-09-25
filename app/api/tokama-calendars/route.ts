import { NextResponse } from "next/server";
import { requireContentAdmin } from "@/lib/content-studio/auth";
import { assertSafeCalendarUrl } from "@/lib/tokama/calendars";

const providers = new Set(["booking", "alohacamp"]);
const houseCodes = new Set(["TO", "KA", "MA"]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;

  const [connectionsResult, feedsResult, eventsResult, blocksResult] = await Promise.all([
    auth.supabase
      .from("tokama_calendar_connections")
      .select("id,provider,house_id,is_active,last_status,last_error,last_synced_at,event_count,created_at,updated_at,house:tokama_houses(code,name)")
      .order("provider")
      .order("created_at"),
    auth.supabase
      .from("tokama_calendar_feeds")
      .select("id,token,house_id,house:tokama_houses(code,name)")
      .order("created_at"),
    auth.supabase.from("tokama_external_calendar_events").select("id,connection_id,provider,house_id,start_date,end_date,summary").order("start_date"),
    auth.supabase.from("tokama_house_date_blocks").select("id,house_id,house_code,start_date,end_date,reason").order("start_date"),
  ]);

  const error = connectionsResult.error || feedsResult.error || eventsResult.error || blocksResult.error;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    connections: connectionsResult.data || [],
    feeds: (feedsResult.data || []).map((feed) => ({ ...feed, url: `${origin}/api/tokama-calendars/feed/${feed.token}` })),
    events: eventsResult.data || [],
    blocks: blocksResult.data || [],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const provider = String(body.provider || "").toLowerCase();
    const houseCode = String(body.house_code || "").toUpperCase();
    if (!providers.has(provider) || !houseCodes.has(houseCode)) {
      return NextResponse.json({ message: "Wybierz prawidłową platformę i domek." }, { status: 400 });
    }

    const importUrl = assertSafeCalendarUrl(String(body.import_url || "").trim());
    const { data: house, error: houseError } = await auth.supabase.from("tokama_houses").select("id,code").eq("code", houseCode).maybeSingle();
    if (houseError || !house) return NextResponse.json({ message: houseError?.message || "Nie znaleziono domku." }, { status: 404 });

    const { data, error } = await auth.supabase.from("tokama_calendar_connections").upsert({
      provider,
      house_id: house.id,
      import_url: importUrl,
      is_active: true,
      last_status: "configured",
      last_error: null,
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,house_id" }).select("id,provider,house_id,is_active,last_status").single();

    return error
      ? NextResponse.json({ message: error.message }, { status: 400 })
      : NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Nie udało się zapisać kalendarza." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ message: "Brak połączenia." }, { status: 400 });

  const { data, error } = await auth.supabase.from("tokama_calendar_connections")
    .update({ is_active: Boolean(body.is_active), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,is_active")
    .single();
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Brak połączenia." }, { status: 400 });

  const { error } = await auth.supabase.from("tokama_calendar_connections").delete().eq("id", id);
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
