export type DiscountCodeRecord = {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  valid_from: string | null;
  expires_at: string | null;
  weekdays?: number[];
  created_at?: string;
};

export function normalizeDiscountCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function calculateDiscountCents(subtotalCents: number, discountPercent: number) {
  const safeSubtotal = Math.max(0, Math.round(Number(subtotalCents) || 0));
  const safePercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));

  return Math.min(safeSubtotal, Math.round((safeSubtotal * safePercent) / 100));
}

export function isDiscountCodeAvailable(
  discount: Pick<DiscountCodeRecord, "is_active" | "valid_from" | "expires_at" | "weekdays">,
  now = new Date()
) {
  if (!discount.is_active) return false;

  const nowTime = now.getTime();
  const validFromTime = discount.valid_from
    ? new Date(discount.valid_from).getTime()
    : null;
  const expiresAtTime = discount.expires_at
    ? new Date(discount.expires_at).getTime()
    : null;

  if (validFromTime !== null && Number.isFinite(validFromTime) && validFromTime > nowTime) {
    return false;
  }

  if (expiresAtTime !== null && Number.isFinite(expiresAtTime) && expiresAtTime < nowTime) {
    return false;
  }

  const isoWeekday = now.getUTCDay() || 7;
  if (discount.weekdays?.length && !discount.weekdays.includes(isoWeekday)) return false;

  return true;
}

export async function findDiscountCode(supabase: SupabaseClient, rawCode: unknown, stayDate?: string) {
  const code = normalizeDiscountCode(rawCode);

  if (!code) return null;

  const { data, error } = await supabase
    .from("tokama_discount_codes")
    .select("id, code, discount_percent, is_active, valid_from, expires_at, weekdays, created_at")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  const validationDate = stayDate ? new Date(`${stayDate}T12:00:00Z`) : new Date();
  if (!data || !isDiscountCodeAvailable(data, validationDate)) return null;

  return data as DiscountCodeRecord;
}
import type { SupabaseClient } from "@supabase/supabase-js";
