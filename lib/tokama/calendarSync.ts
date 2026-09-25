import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSafeCalendarUrl, parseIcalEvents } from "./calendars";

type CalendarConnection = {
  id: string;
  provider: "booking" | "alohacamp";
  house_id: string;
  import_url: string;
};

export async function syncActiveCalendarConnections(supabase: SupabaseClient, connectionId?: string) {
  let query = supabase
    .from("tokama_calendar_connections")
    .select("id,provider,house_id,import_url")
    .eq("is_active", true);

  if (connectionId) query = query.eq("id", connectionId);

  const { data: connections, error } = await query;
  if (error) throw error;

  const results = await Promise.all(
    ((connections || []) as CalendarConnection[]).map((connection) =>
      syncCalendarConnection(supabase, connection)
    )
  );

  return {
    connectionCount: connections?.length || 0,
    results,
    failed: results.filter((result) => !result.ok),
  };
}

export async function syncCalendarConnection(supabase: SupabaseClient, connection: CalendarConnection) {
  const startedAt = new Date().toISOString();
  await supabase.from("tokama_calendar_connections").update({ last_status: "syncing", last_error: null, updated_at: startedAt }).eq("id", connection.id);

  try {
    const importUrl = assertSafeCalendarUrl(connection.import_url);
    const response = await fetch(importUrl, {
      cache: "no-store",
      headers: { Accept: "text/calendar, text/plain;q=0.9", "User-Agent": "TOKAMA-Calendar-Sync/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Źródło kalendarza odpowiedziało kodem ${response.status}.`);

    const events = parseIcalEvents(await response.text());
    const rows = events.map((event) => ({
      connection_id: connection.id,
      provider: connection.provider,
      house_id: connection.house_id,
      external_uid: event.uid,
      start_date: event.startDate,
      end_date: event.endDate,
      summary: event.summary,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error } = await supabase.from("tokama_external_calendar_events").upsert(rows, { onConflict: "connection_id,external_uid" });
      if (error) throw error;
    }

    const { data: existing, error: existingError } = await supabase
      .from("tokama_external_calendar_events")
      .select("id,external_uid")
      .eq("connection_id", connection.id);
    if (existingError) throw existingError;

    const freshUids = new Set(events.map((event) => event.uid));
    const staleIds = (existing || []).filter((event) => !freshUids.has(event.external_uid)).map((event) => event.id);
    if (staleIds.length) {
      const { error } = await supabase.from("tokama_external_calendar_events").delete().in("id", staleIds);
      if (error) throw error;
    }

    const completedAt = new Date().toISOString();
    await supabase.from("tokama_calendar_connections").update({
      last_status: "synced",
      last_error: null,
      last_synced_at: completedAt,
      event_count: events.length,
      updated_at: completedAt,
    }).eq("id", connection.id);

    return { ok: true as const, connectionId: connection.id, eventCount: events.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd synchronizacji.";
    await supabase.from("tokama_calendar_connections").update({ last_status: "error", last_error: message, updated_at: new Date().toISOString() }).eq("id", connection.id);
    return { ok: false as const, connectionId: connection.id, message };
  }
}
