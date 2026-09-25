import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SelectedOption = {
  groupName: string | null;
  name: string;
  priceCents: number;
};

function text(value: unknown) {
  return String(value || "").trim();
}

export function firstName(value: unknown) {
  return text(value).split(/\s+/).filter(Boolean)[0] || "Gościu";
}

export function formatKanzanMoney(cents: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

export function hashKanzanToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normaliseKanzanOptions(value: unknown): SelectedOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => {
      const item = option && typeof option === "object"
        ? option as Record<string, unknown>
        : {};

      const name = text(item.name);
      if (!name) return null;

      return {
        groupName: text(item.groupName) || null,
        name,
        priceCents: Number(item.priceCents || 0),
      };
    })
    .filter((item): item is SelectedOption => Boolean(item));
}

export async function getKanzanOrderContext(orderId: string) {
  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from("tokama_onsite_orders")
    .select(`
      id,
      public_code,
      status,
      note,
      total_cents,
      subtotal_cents,
      food_subtotal_cents,
      non_discounted_subtotal_cents,
      discount_cents,
      delivery_cents,
      guest_total_cents,
      currency,
      reservation_id,
      house_id,
      accepted_at,
      vendor_confirmation_token_hash,
      vendor_confirmation_expires_at,
      vendor_sms_sent_at,
      vendor_confirmed_at,
      guest_preparing_sms_sent_at,
      host_preparing_push_sent_at
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!order) return null;

  const [
    { data: items, error: itemsError },
    { data: reservation, error: reservationError },
    { data: house, error: houseError },
  ] = await Promise.all([
    supabase
      .from("tokama_onsite_order_items")
      .select(`
        id,
        item_name,
        unit_price_cents,
        quantity,
        total_cents,
        selected_options,
        special_instructions,
        product_snapshot
      `)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("tokama_reservations")
      .select("id, public_code, guest_name, guest_phone, checkin, checkout")
      .eq("id", order.reservation_id)
      .maybeSingle(),
    supabase
      .from("tokama_houses")
      .select("id, code, name")
      .eq("id", order.house_id)
      .maybeSingle(),
  ]);

  const error = itemsError || reservationError || houseError;
  if (error) throw new Error(error.message);

  return {
    order: {
      id: order.id,
      code: order.public_code,
      status: order.status,
      note: order.note,
      totalCents: Number(order.total_cents || 0),
      subtotalCents: Number(order.subtotal_cents || 0),
      foodSubtotalCents: Number(order.food_subtotal_cents || 0),
      nonDiscountedSubtotalCents: Number(order.non_discounted_subtotal_cents || 0),
      discountCents: Number(order.discount_cents || 0),
      deliveryCents: Number(order.delivery_cents || 0),
      guestTotalCents: Number(order.guest_total_cents || order.total_cents || 0),
      currency: order.currency || "PLN",
      acceptedAt: order.accepted_at,
      vendorTokenHash: order.vendor_confirmation_token_hash,
      vendorTokenExpiresAt: order.vendor_confirmation_expires_at,
      vendorSmsSentAt: order.vendor_sms_sent_at,
      vendorConfirmedAt: order.vendor_confirmed_at,
      guestPreparingSmsSentAt: order.guest_preparing_sms_sent_at,
      hostPreparingPushSentAt: order.host_preparing_push_sent_at,
    },
    reservation: reservation
      ? {
          id: reservation.id,
          code: reservation.public_code,
          guestName: reservation.guest_name,
          guestPhone: reservation.guest_phone,
          checkin: reservation.checkin,
          checkout: reservation.checkout,
        }
      : null,
    house: house
      ? {
          code: house.code,
          name: house.name,
        }
      : null,
    items: (items || []).map((item) => {
      const snapshot = item.product_snapshot && typeof item.product_snapshot === "object"
        ? item.product_snapshot as Record<string, unknown>
        : {};

      return {
        id: item.id,
        name: item.item_name,
        quantity: Number(item.quantity || 0),
        unitPriceCents: Number(item.unit_price_cents || 0),
        totalCents: Number(item.total_cents || 0),
        selectedOptions: normaliseKanzanOptions(item.selected_options),
        specialInstructions: text(item.special_instructions) || null,
        description: text(snapshot.description) || null,
      };
    }),
  };
}

export function buildKanzanSms(
  context: NonNullable<Awaited<ReturnType<typeof getKanzanOrderContext>>>,
  link: string
) {
  const house = context.house?.code || "—";
  const code = context.reservation?.code || context.order.code;
  const guest = firstName(context.reservation?.guestName);

  return [
    "TOKAMA · zamówienie do potwierdzenia",
    `Domek: ${house}`,
    `Rezerwacja: ${code}`,
    `Gość: ${guest}`,
    `Kwota: ${formatKanzanMoney(context.order.guestTotalCents, context.order.currency)}`,
    `Szczegóły i potwierdzenie: ${link}`,
  ].join("\n");
}
