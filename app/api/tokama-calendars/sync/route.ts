import { NextResponse } from "next/server";
import { requireContentAdmin } from "@/lib/content-studio/auth";
import { syncActiveCalendarConnections } from "@/lib/tokama/calendarSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { connectionCount, results, failed } = await syncActiveCalendarConnections(
    auth.supabase,
    body.connection_id ? String(body.connection_id) : undefined
  );
  if (!connectionCount) return NextResponse.json({ message: "Brak aktywnych kalendarzy do synchronizacji." }, { status: 400 });

  return NextResponse.json({
    ok: failed.length === 0,
    results,
    message: failed.length ? `${failed.length} połączeń wymaga uwagi.` : "Kalendarze zostały zsynchronizowane.",
  }, { status: failed.length === connectionCount ? 502 : 200 });
}
