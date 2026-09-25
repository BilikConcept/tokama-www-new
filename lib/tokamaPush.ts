import { createClient } from "@supabase/supabase-js";

type PushData = Record<string, string | number | boolean | null | undefined>;

type HostPushPayload = {
  title: string;
  body: string;
  data?: PushData;
};

type ReservationPushInput = {
  id?: string | null;
  public_code?: string | null;
  guest_name?: string | null;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://oiqdwgsfpvcuctvxfjpv.supabase.co";

const supabaseServiceKey =
  process.env.TOKAMA_ADMIN_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isExpoToken(token: string) {
  return (
    token.startsWith("ExpoPushToken[") ||
    token.startsWith("ExponentPushToken[")
  );
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

function getReservationName(reservation: ReservationPushInput) {
  return cleanText(reservation.guest_name, "Gość");
}

function getReservationCode(reservation: ReservationPushInput) {
  return cleanText(reservation.public_code, "—");
}

export async function sendTokamaHostPush(payload: HostPushPayload) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.log("[TOKAMA PUSH] Missing Supabase admin config.");
    return;
  }

  const { data: tokens, error } = await supabase
    .from("hostapp_push_tokens")
    .select("expo_push_token")
    .eq("is_active", true);

  if (error) {
    console.log("[TOKAMA PUSH] Token lookup failed", error);
    return;
  }

  const uniqueTokens = Array.from(
    new Set(
      (tokens || [])
        .map((item) => String(item.expo_push_token || "").trim())
        .filter(Boolean)
        .filter(isExpoToken)
    )
  );

  if (uniqueTokens.length === 0) {
    console.log("[TOKAMA PUSH] No active push tokens.");
    return;
  }

  const messages = uniqueTokens.map((token) => ({
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    console.log("[TOKAMA PUSH] Expo push failed", result);
    return;
  }

  console.log("[TOKAMA PUSH] Sent", result);
}

export async function sendTokamaNewReservationPush(reservation: ReservationPushInput) {
  const guestName = getReservationName(reservation);
  const reservationCode = getReservationCode(reservation);

  await sendTokamaHostPush({
    title: "Nowa rezerwacja",
    body: `${guestName} · nr zamówienia ${reservationCode}`,
    data: {
      type: "new_reservation",
      reservation_id: reservation.id || null,
      public_code: reservation.public_code || null,
    },
  });
}

export async function sendTokamaReservationPaidPush(reservation: ReservationPushInput) {
  const guestName = getReservationName(reservation);
  const reservationCode = getReservationCode(reservation);

  await sendTokamaHostPush({
    title: "Rezerwacja opłacona",
    body: `${guestName} · nr zamówienia ${reservationCode} · opłacone`,
    data: {
      type: "reservation_paid",
      reservation_id: reservation.id || null,
      public_code: reservation.public_code || null,
    },
  });
}
