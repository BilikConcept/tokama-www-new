import type { SupabaseClient } from "@supabase/supabase-js";

export const TOKAMA_GLOBAL_GATE_CODE = "1515";

export async function ensureTokamaGateCode(input: {
  supabase: SupabaseClient;
  reservationId: string;
  currentGateCode?: string | null;
}) {
  const existingCode = String(input.currentGateCode || "").trim();
  if (existingCode === TOKAMA_GLOBAL_GATE_CODE) {
    return TOKAMA_GLOBAL_GATE_CODE;
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await input.supabase
    .from("tokama_reservations")
    .update({ gate_code: TOKAMA_GLOBAL_GATE_CODE, updated_at: now })
    .eq("id", input.reservationId)
    .select("gate_code")
    .single();

  if (updateError) throw updateError;
  if (updated?.gate_code !== TOKAMA_GLOBAL_GATE_CODE) {
    throw new Error("Nie udało się przygotować kodu do bramy.");
  }

  return TOKAMA_GLOBAL_GATE_CODE;
}
