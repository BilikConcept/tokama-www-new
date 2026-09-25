import { NextResponse } from "next/server";
import { requireHostApi } from "@/lib/tokama/hostApi";

type RouteContext = {
  params: Promise<{ reservationId: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireHostApi(request);
    if (!auth.ok) return auth.response;

    const { reservationId } = await context.params;

    const { data: reservation, error: reservationError } = await auth.supabase
      .from("tokama_reservations")
      .select(`
        id,
        public_code,
        status,
        checkin,
        checkout,
        nights,
        adults,
        children,
        guest_name,
        guest_email,
        guest_phone,
        currency,
        stay_price_cents,
        addons_price_cents,
        total_estimated_cents,
        host_final_amount_cents,
        payment_method,
        payment_status,
        payment_confirmed_at,
        payment_confirmation_sms_sent_at,
        houses:tokama_reservation_houses(
          house:tokama_houses(code, name)
        ),
        addons:tokama_reservation_addons(
          addon_slug,
          name_pl,
          variant_name_pl,
          quantity,
          selected_dates,
          total_price_cents
        )
      `)
      .eq("id", reservationId)
      .maybeSingle();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: "Nie znaleziono pobytu." },
        { status: 404 }
      );
    }

    const [
      { data: serviceRequests, error: serviceRequestsError },
      { data: orders, error: ordersError },
    ] = await Promise.all([
      auth.supabase
        .from("tokama_onsite_service_requests")
        .select(`
          id,
          public_code,
          kind,
          status,
          note,
          total_cents,
          currency,
          requested_for_dates,
          created_at,
          updated_at,
          items:tokama_onsite_service_request_items(
            item_name,
            variant_name,
            quantity,
            selected_dates,
            total_price_cents
          )
        `)
        .eq("reservation_id", reservation.id)
        .order("created_at", { ascending: false }),
      auth.supabase
        .from("tokama_onsite_orders")
        .select(
          "id, public_code, status, dispatch_status, note, total_cents, guest_total_cents, currency, created_at, updated_at"
        )
        .eq("reservation_id", reservation.id)
        .order("created_at", { ascending: false }),
    ]);

    if (serviceRequestsError || ordersError) {
      return NextResponse.json(
        { ok: false, message: "Nie udało się pobrać zamówień pobytu." },
        { status: 500 }
      );
    }

    const orderIds = (orders || []).map((order: any) => order.id).filter(Boolean);

    const { data: orderItems, error: orderItemsError } = orderIds.length
      ? await auth.supabase
          .from("tokama_onsite_order_items")
          .select(
            "id, order_id, item_name, product_name_snapshot, quantity, total_cents, selected_options, special_instructions"
          )
          .in("order_id", orderIds)
      : { data: [], error: null };

    if (orderItemsError) {
      return NextResponse.json(
        { ok: false, message: "Nie udało się pobrać pozycji zamówień." },
        { status: 500 }
      );
    }

    const itemsByOrder = new Map<string, any[]>();

    for (const item of orderItems || []) {
      const current = itemsByOrder.get(item.order_id) || [];
      current.push(item);
      itemsByOrder.set(item.order_id, current);
    }

    return NextResponse.json(
      {
        ok: true,
        stayCard: {
          reservation: {
            id: reservation.id,
            publicCode: reservation.public_code,
            guestName: reservation.guest_name,
            checkin: reservation.checkin,
            checkout: reservation.checkout,
            currency: reservation.currency || "PLN",
            stayPriceCents: Number(reservation.stay_price_cents || 0),
            addonsPriceCents: Number(reservation.addons_price_cents || 0),
            totalEstimatedCents: Number(reservation.total_estimated_cents || 0),
            paymentStatus: reservation.payment_status || "pending",
            paymentMethod: reservation.payment_method || null,
            paymentConfirmedAt: reservation.payment_confirmed_at || null,
            paymentConfirmationSmsSentAt:
              reservation.payment_confirmation_sms_sent_at || null,
            houses: (reservation.houses || [])
              .map((item: any) => item.house?.code)
              .filter(Boolean),
            addons: (reservation.addons || []).map((item: any) => ({
              name: item.name_pl || item.addon_slug || "Dodatek",
              variantName: item.variant_name_pl || null,
              quantity: Number(item.quantity || 1),
              selectedDates: Array.isArray(item.selected_dates)
                ? item.selected_dates
                : [],
              totalCents: Number(item.total_price_cents || 0),
            })),
          },
          serviceRequests: (serviceRequests || []).map((item: any) => ({
            id: item.id,
            code: item.public_code,
            kind: item.kind,
            status: item.status,
            note: item.note || null,
            totalCents: Number(item.total_cents || 0),
            currency: item.currency || "PLN",
            requestedForDates: Array.isArray(item.requested_for_dates)
              ? item.requested_for_dates
              : [],
            createdAt: item.created_at,
            items: Array.isArray(item.items)
              ? item.items.map((line: any) => ({
                  name: line.item_name || "Usługa",
                  variantName: line.variant_name || null,
                  quantity: Number(line.quantity || 1),
                  selectedDates: Array.isArray(line.selected_dates)
                    ? line.selected_dates
                    : [],
                  totalCents: Number(line.total_price_cents || 0),
                }))
              : [],
          })),
          kanzanOrders: (orders || []).map((order: any) => ({
            id: order.id,
            code: order.public_code,
            status: order.dispatch_status || order.status || "new",
            note: order.note || null,
            totalCents: Number(order.guest_total_cents ?? order.total_cents ?? 0),
            currency: order.currency || "PLN",
            createdAt: order.created_at,
            items: (itemsByOrder.get(order.id) || []).map((line: any) => ({
              name: line.product_name_snapshot || line.item_name || "Pozycja menu",
              quantity: Number(line.quantity || 1),
              totalCents: Number(line.total_cents || 0),
              selectedOptions: line.selected_options || [],
              specialInstructions: line.special_instructions || null,
            })),
          })),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nie udało się pobrać karty pobytu.",
      },
      { status: 500 }
    );
  }
}
