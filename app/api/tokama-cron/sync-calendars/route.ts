import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncActiveCalendarConnections } from "@/lib/tokama/calendarSync";
import { isTokamaCronAuthorized } from "@/lib/tokama/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isTokamaCronAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  try {
    const { connectionCount, results, failed } = await syncActiveCalendarConnections(
      getSupabaseAdmin()
    );

    return NextResponse.json(
      {
        ok: failed.length === 0,
        startedAt,
        completedAt: new Date().toISOString(),
        connectionCount,
        syncedCount: connectionCount - failed.length,
        failedCount: failed.length,
        results,
        message: connectionCount
          ? failed.length
            ? `${failed.length} połączeń wymaga uwagi.`
            : "Automatyczna synchronizacja kalendarzy zakończona."
          : "Brak aktywnych kalendarzy — synchronizacja pominięta.",
      },
      { status: failed.length ? 502 : 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Nieznany błąd synchronizacji.",
      },
      { status: 500 }
    );
  }
}
