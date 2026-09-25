import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_HOUSE_CODES = new Set(["TO", "KA", "MA"]);

function normaliseHouse(value: string | null) {
  return String(value || "").trim().toUpperCase();
}

async function getGuestSession(houseCode: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("tokama_onsite_session_v3")?.value;

  if (!token || !ALLOWED_HOUSE_CODES.has(houseCode)) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = getSupabaseAdmin();

  const { data: house } = await supabase
    .from("tokama_houses")
    .select("id, code, name")
    .eq("code", houseCode)
    .maybeSingle();

  if (!house) return null;

  const { data: session } = await supabase
    .from("tokama_onsite_guest_sessions")
    .select("id, reservation_id, house_id, expires_at")
    .eq("token_hash", tokenHash)
    .eq("house_id", house.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  await supabase
    .from("tokama_onsite_guest_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return { house, session };
}

function paymentSummary(reservation: any) {
  const totalCents = Number(reservation.total_estimated_cents || 0);
  const paymentStatus = String(reservation.payment_status || "").trim();

  if (paymentStatus === "paid") {
    return {
      status: "paid",
      label: "Rezerwacja opłacona",
      balanceCents: 0,
    };
  }

  if (paymentStatus === "cash_on_arrival") {
    return {
      status: "cash_on_arrival",
      label: "Płatność gotówką przy przyjeździe",
      balanceCents: totalCents,
    };
  }

  if (paymentStatus === "payment_sent") {
    return {
      status: "payment_sent",
      label: "Oczekuje na opłacenie",
      balanceCents: totalCents,
    };
  }

  return {
    status: paymentStatus || "pending",
    label: "Kwota do potwierdzenia z gospodarzem",
    balanceCents: totalCents,
  };
}

export async function GET(request: NextRequest) {
  const houseCode = normaliseHouse(request.nextUrl.searchParams.get("house"));
  const access = await getGuestSession(houseCode);

  if (!access) {
    return NextResponse.json(
      { ok: false, message: "Sesja pobytu wygasła. Wpisz ponownie numer rezerwacji." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  const [
    { data: reservation, error: reservationError },
    { data: reservationAddons, error: reservationAddonsError },
    { data: serviceRequests, error: serviceRequestsError },
    { data: kanzanOrders, error: kanzanOrdersError },
    { data: availableAddons, error: availableAddonsError },
  ] = await Promise.all([
    supabase
      .from("tokama_reservations")
      .select("*")
      .eq("id", access.session.reservation_id)
      .maybeSingle(),
    supabase
      .from("tokama_reservation_addons")
      .select(
        "addon_slug, name_pl, variant_name_pl, pricing_unit, quantity, selected_dates, unit_price_cents, total_price_cents"
      )
      .eq("reservation_id", access.session.reservation_id),
    supabase
      .from("tokama_onsite_service_requests")
      .select("id, public_code, kind, status, total_cents, currency, requested_for_dates, created_at")
      .eq("reservation_id", access.session.reservation_id)
      .eq("house_id", access.house.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tokama_onsite_orders")
      .select("public_code, dispatch_status, status, guest_total_cents, total_cents, currency, created_at")
      .eq("reservation_id", access.session.reservation_id)
      .eq("house_id", access.house.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tokama_addons")
      .select(
        "id, slug, name_pl, description_pl, price_cents, pricing_unit, show_variant_prices, allow_day_selection, day_selection_label_pl, variants, sort_order"
      )
      .eq("is_active", true)
      .eq("allow_day_selection", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (
    reservationError ||
    reservationAddonsError ||
    serviceRequestsError ||
    kanzanOrdersError ||
    availableAddonsError ||
    !reservation
  ) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się pobrać informacji o pobycie." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      house: {
        code: access.house.code,
        name: access.house.name,
      },
      reservation: {
        code: reservation.public_code,
        guestName: reservation.guest_name,
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        nights: Number(reservation.nights || 0),
        adults: Number(reservation.adults || 0),
        children: Number(reservation.children || 0),
        currency: reservation.currency || "PLN",
        stayPriceCents: Number(reservation.stay_price_cents || 0),
        addonsPriceCents: Number(reservation.addons_price_cents || 0),
        totalEstimatedCents: Number(reservation.total_estimated_cents || 0),
        payment: paymentSummary(reservation),
      },
      reservationAddons: (reservationAddons || []).map((addon: any) => ({
        slug: addon.addon_slug,
        name: addon.name_pl,
        variantName: addon.variant_name_pl,
        pricingUnit: addon.pricing_unit,
        quantity: Number(addon.quantity || 0),
        selectedDates: Array.isArray(addon.selected_dates) ? addon.selected_dates : [],
        unitPriceCents: Number(addon.unit_price_cents || 0),
        totalPriceCents: Number(addon.total_price_cents || 0),
      })),
      availableExtras: (availableAddons || []).map((addon: any) => ({
        id: addon.id,
        slug: addon.slug,
        name: addon.name_pl,
        description: addon.description_pl,
        priceCents: Number(addon.price_cents || 0),
        pricingUnit: addon.pricing_unit,
        showVariantPrices: addon.show_variant_prices !== false,
        allowDaySelection: addon.allow_day_selection === true,
        daySelectionLabel: addon.day_selection_label_pl,
        variants: Array.isArray(addon.variants)
          ? addon.variants
              .filter((variant: any) => variant.is_active !== false)
              .map((variant: any) => ({
                id: String(variant.id),
                name: variant.name_pl,
                description: variant.description_pl,
                priceCents: Number(variant.price_cents || 0),
                pricingUnit: variant.pricing_unit || addon.pricing_unit,
              }))
          : [],
      })),
      serviceRequests: (serviceRequests || []).map((item: any) => ({
        code: item.public_code,
        kind: item.kind,
        status: item.status,
        totalCents: Number(item.total_cents || 0),
        currency: item.currency || "PLN",
        requestedForDates: Array.isArray(item.requested_for_dates)
          ? item.requested_for_dates
          : [],
        createdAt: item.created_at,
      })),
      kanzanOrders: (kanzanOrders || []).map((item: any) => ({
        code: item.public_code,
        status: item.dispatch_status || item.status || "new",
        totalCents: Number(item.guest_total_cents ?? item.total_cents ?? 0),
        currency: item.currency || "PLN",
        createdAt: item.created_at,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
