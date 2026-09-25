import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isHostApiRequest, unauthorizedResponse } from "@/lib/tokama/hostAuth";
import { normaliseKanzanOptions } from "@/lib/tokama/kanzanVendor";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value || "").trim() || null;
}

export async function GET(request: Request) {
  if (!(await isHostApiRequest(request))) return unauthorizedResponse();

  const supabase = getSupabaseAdmin();

  const { data: orders, error: ordersError } = await supabase
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
      created_at,
      updated_at,
      vendor_sms_sent_at,
      vendor_confirmed_at
    `)
    .order("created_at", { ascending: false });

  if (ordersError) {
    return NextResponse.json(
      { ok: false, message: ordersError.message },
      { status: 500 }
    );
  }

  const orderIds = (orders || []).map((order) => order.id);
  const reservationIds = [...new Set((orders || []).map((order) => order.reservation_id).filter(Boolean))];
  const houseIds = [...new Set((orders || []).map((order) => order.house_id).filter(Boolean))];

  const [
    { data: items, error: itemsError },
    { data: reservations, error: reservationsError },
    { data: houses, error: housesError },
  ] = await Promise.all([
    orderIds.length
      ? supabase
          .from("tokama_onsite_order_items")
          .select(`
            order_id,
            item_name,
            unit_price_cents,
            quantity,
            total_cents,
            selected_options,
            special_instructions,
            product_snapshot
          `)
          .in("order_id", orderIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    reservationIds.length
      ? supabase
          .from("tokama_reservations")
          .select("id, public_code, guest_name, checkin, checkout")
          .in("id", reservationIds)
      : Promise.resolve({ data: [], error: null }),
    houseIds.length
      ? supabase
          .from("tokama_houses")
          .select("id, code, name")
          .in("id", houseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error = itemsError || reservationsError || housesError;

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const reservationById = new Map((reservations || []).map((reservation) => [reservation.id, reservation]));
  const houseById = new Map((houses || []).map((house) => [house.id, house]));

  return NextResponse.json(
    {
      ok: true,
      orders: (orders || []).map((order) => ({
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
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        vendorSmsSentAt: order.vendor_sms_sent_at || null,
        vendorConfirmedAt: order.vendor_confirmed_at || null,
        house: houseById.get(order.house_id) || null,
        reservation: reservationById.get(order.reservation_id) || null,
        items: (items || [])
          .filter((item) => item.order_id === order.id)
          .map((item) => {
            const snapshot = item.product_snapshot && typeof item.product_snapshot === "object"
              ? item.product_snapshot as Record<string, unknown>
              : {};

            return {
              name: item.item_name,
              quantity: Number(item.quantity || 0),
              unitPriceCents: Number(item.unit_price_cents || 0),
              totalCents: Number(item.total_cents || 0),
              selectedOptions: normaliseKanzanOptions(item.selected_options),
              specialInstructions: text(item.special_instructions),
              description: text(snapshot.description),
            };
          }),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
