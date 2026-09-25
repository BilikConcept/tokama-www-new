import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaHostPush } from "@/lib/tokamaPush";

export const dynamic = "force-dynamic";

const ALLOWED_HOUSE_CODES = new Set(["TO", "KA", "MA"]);

type RequestItem = {
  slug?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  selectedDates?: unknown;
};

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseQuantity(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 1;

  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

function getWarsawDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function normaliseDates(value: unknown, reservation: any) {
  if (!Array.isArray(value)) return [];

  const today = getWarsawDate();
  const checkin = String(reservation.checkin || "");
  const checkout = String(reservation.checkout || "");

  return [
    ...new Set(
      value
        .map((date) => String(date || "").trim())
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .filter((date) => date >= today && date >= checkin && date <= checkout)
    ),
  ].sort();
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

  return { house, session };
}

function calculateExtraTotal(input: {
  priceCents: number;
  pricingUnit: string;
  quantity: number;
  selectedDatesCount: number;
  adults: number;
  children: number;
  housesCount: number;
}) {
  const price = Math.max(0, input.priceCents);
  const quantity = Math.max(1, input.quantity);
  const serviceDays = Math.max(1, input.selectedDatesCount);
  const adults = Math.max(1, input.adults);
  const children = Math.max(0, input.children);
  const guests = adults + children;
  const houses = Math.max(1, input.housesCount);

  if (input.pricingUnit === "per_two_people_per_night") {
    return price * quantity * serviceDays * Math.ceil(guests / 2);
  }

  if (input.pricingUnit === "per_night") {
    return price * quantity * serviceDays;
  }

  if (input.pricingUnit === "per_adult") {
    return price * quantity * adults * serviceDays;
  }

  if (input.pricingUnit === "per_child") {
    return price * quantity * children * serviceDays;
  }

  if (input.pricingUnit === "per_guest" || input.pricingUnit === "per_person") {
    return price * quantity * guests * serviceDays;
  }

  if (input.pricingUnit === "per_house") {
    return price * quantity * houses;
  }

  if (input.pricingUnit === "per_house_per_night") {
    return price * quantity * houses * serviceDays;
  }

  return price * quantity;
}

export async function POST(request: Request) {
  let body: {
    house?: unknown;
    kind?: unknown;
    housekeepingService?: unknown;
    note?: unknown;
    items?: RequestItem[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowe dane zgłoszenia." },
      { status: 400 }
    );
  }

  const houseCode = normaliseText(body.house, 8).toUpperCase();
  const kind = normaliseText(body.kind, 40);
  const note = normaliseText(body.note, 800);
  const access = await getGuestSession(houseCode);

  if (!access) {
    return NextResponse.json(
      { ok: false, message: "Sesja pobytu wygasła. Wpisz ponownie numer rezerwacji." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: reservation, error: reservationError } = await supabase
    .from("tokama_reservations")
    .select("guest_name, checkin, checkout, adults, children, houses_count, currency")
    .eq("id", access.session.reservation_id)
    .maybeSingle();

  if (reservationError || !reservation) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się przygotować zgłoszenia." },
      { status: 500 }
    );
  }

  let requestKind: "housekeeping" | "guest_extras";
  let itemRows: Array<Record<string, unknown>> = [];
  let requestedForDates: string[] = [];
  let totalCents = 0;
  let pushLabel = "";

  if (kind === "housekeeping") {
    const serviceKey = normaliseText(body.housekeepingService, 60);
    const housekeeping = {
      towel_change: "Wymiana ręczników",
      extra_towels: "Dodatkowe ręczniki",
      supplies: "Uzupełnienie podstawowych środków",
    } as const;

    const serviceName = housekeeping[serviceKey as keyof typeof housekeeping];

    if (!serviceName) {
      return NextResponse.json(
        { ok: false, message: "Wybierz rodzaj zgłoszenia." },
        { status: 400 }
      );
    }

    requestKind = "housekeeping";
    pushLabel = serviceName;
    itemRows = [
      {
        addon_id: null,
        addon_slug: serviceKey,
        item_name: serviceName,
        variant_id: null,
        variant_name: null,
        pricing_unit: "request",
        quantity: 1,
        selected_dates: [],
        unit_price_cents: 0,
        total_price_cents: 0,
      },
    ];
  } else if (kind === "guest_extras") {
    const selectedItems = Array.isArray(body.items) ? body.items.slice(0, 10) : [];

    if (!selectedItems.length) {
      return NextResponse.json(
        { ok: false, message: "Wybierz śniadanie, piknik lub inny dodatek." },
        { status: 400 }
      );
    }

    const slugs = [
      ...new Set(
        selectedItems
          .map((item) => normaliseText(item.slug, 120))
          .filter(Boolean)
      ),
    ];

    const { data: addons, error: addonsError } = await supabase
      .from("tokama_addons")
      .select("*")
      .in("slug", slugs)
      .eq("is_active", true)
      .eq("allow_day_selection", true);

    if (addonsError) {
      return NextResponse.json(
        { ok: false, message: "Nie udało się odczytać dostępnych dodatków." },
        { status: 500 }
      );
    }

    const addonBySlug = new Map((addons || []).map((addon: any) => [addon.slug, addon]));

    for (const selected of selectedItems) {
      const slug = normaliseText(selected.slug, 120);
      const addon = addonBySlug.get(slug);

      if (!addon) {
        return NextResponse.json(
          { ok: false, message: "Jedna z wybranych pozycji nie jest już dostępna." },
          { status: 409 }
        );
      }

      const variants = Array.isArray(addon.variants)
        ? addon.variants.filter((variant: any) => variant.is_active !== false)
        : [];
      const variantId = normaliseText(selected.variantId, 120);
      const variant = variants.find((entry: any) => String(entry.id) === variantId) || variants[0] || null;
      const selectedDates = normaliseDates(selected.selectedDates, reservation);

      if (addon.allow_day_selection === true && !selectedDates.length) {
        return NextResponse.json(
          { ok: false, message: `Wybierz dzień realizacji: ${addon.name_pl}.` },
          { status: 400 }
        );
      }

      const quantity = normaliseQuantity(selected.quantity);
      const unitPriceCents = Math.max(0, Number(variant?.price_cents ?? addon.price_cents ?? 0));
      const pricingUnit = String(variant?.pricing_unit || addon.pricing_unit || "per_stay");
      const itemTotalCents = calculateExtraTotal({
        priceCents: unitPriceCents,
        pricingUnit,
        quantity,
        selectedDatesCount: selectedDates.length,
        adults: Number(reservation.adults || 1),
        children: Number(reservation.children || 0),
        housesCount: Number(reservation.houses_count || 1),
      });

      totalCents += itemTotalCents;
      requestedForDates.push(...selectedDates);
      itemRows.push({
        addon_id: addon.id,
        addon_slug: addon.slug,
        item_name: addon.name_pl,
        variant_id: variant?.id || null,
        variant_name: variant?.name_pl || null,
        pricing_unit: pricingUnit,
        quantity,
        selected_dates: selectedDates,
        unit_price_cents: unitPriceCents,
        total_price_cents: itemTotalCents,
      });
    }

    requestKind = "guest_extras";
    pushLabel = "Śniadanie / piknik";
    requestedForDates = [...new Set(requestedForDates)].sort();
  } else {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowy rodzaj zgłoszenia." },
      { status: 400 }
    );
  }

  const publicCode = `SRV-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  const { data: serviceRequest, error: requestError } = await supabase
    .from("tokama_onsite_service_requests")
    .insert({
      public_code: publicCode,
      reservation_id: access.session.reservation_id,
      house_id: access.house.id,
      guest_session_id: access.session.id,
      kind: requestKind,
      status: "new",
      note: note || null,
      total_cents: totalCents,
      currency: reservation.currency || "PLN",
      requested_for_dates: requestedForDates,
    })
    .select("id, public_code, total_cents, currency")
    .single();

  if (requestError || !serviceRequest) {
    console.error("[TOKAMA ONSITE] Service request creation failed", requestError);

    return NextResponse.json(
      { ok: false, message: "Nie udało się zapisać zgłoszenia." },
      { status: 500 }
    );
  }

  const { error: itemsError } = await supabase
    .from("tokama_onsite_service_request_items")
    .insert(itemRows.map((item) => ({ ...item, request_id: serviceRequest.id })));

  if (itemsError) {
    console.error("[TOKAMA ONSITE] Service request items creation failed", itemsError);
    await supabase.from("tokama_onsite_service_requests").delete().eq("id", serviceRequest.id);

    return NextResponse.json(
      { ok: false, message: "Nie udało się zapisać pozycji zgłoszenia." },
      { status: 500 }
    );
  }

  const guestName = String(reservation.guest_name || "Gość").trim() || "Gość";
  const formattedTotal = totalCents
    ? ` · ${(totalCents / 100).toFixed(2).replace(".", ",")} ${reservation.currency || "PLN"}`
    : "";

  try {
    await sendTokamaHostPush({
      title: "Nowe zgłoszenie pobytu",
      body: `${access.house.code} · ${guestName} · ${pushLabel}${formattedTotal}`,
      data: {
        type: "onsite_service_request",
        request_id: serviceRequest.id,
        public_code: serviceRequest.public_code,
        reservation_id: access.session.reservation_id,
        house_code: access.house.code,
      },
    });
  } catch (error) {
    console.log("[TOKAMA ONSITE] Service request push failed", error);
  }

  return NextResponse.json({
    ok: true,
    request: {
      code: serviceRequest.public_code,
      totalCents: Number(serviceRequest.total_cents || 0),
      currency: serviceRequest.currency || "PLN",
    },
  });
}
