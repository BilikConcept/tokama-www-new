import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTokamaHostPush } from "@/lib/tokamaPush";

export const dynamic = "force-dynamic";

type RequestItem = {
  productId?: unknown;
  optionIds?: unknown;
  quantity?: unknown;
  specialInstructions?: unknown;
};

const ALLOWED_HOUSE_CODES = new Set(["TO", "KA", "MA"]);

function normaliseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normaliseQuantity(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 1;

  return Math.min(10, Math.max(1, Math.floor(parsed)));
}

function normaliseIds(value: unknown, limit = 30) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => normaliseText(item, 100))
        .filter(Boolean)
    ),
  ].slice(0, limit);
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

export async function POST(request: Request) {
  let body: { house?: unknown; note?: unknown; items?: RequestItem[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowe dane zamówienia." },
      { status: 400 }
    );
  }

  const houseCode = normaliseText(body.house, 8).toUpperCase();
  const selectedItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const note = normaliseText(body.note, 800);

  if (!selectedItems.length) {
    return NextResponse.json(
      { ok: false, message: "Wybierz przynajmniej jedną pozycję." },
      { status: 400 }
    );
  }

  const access = await getGuestSession(houseCode);

  if (!access) {
    return NextResponse.json(
      { ok: false, message: "Sesja pobytu wygasła. Wpisz ponownie numer rezerwacji." },
      { status: 401 }
    );
  }

  const productIds = [
    ...new Set(
      selectedItems
        .map((item) => normaliseText(item.productId, 100))
        .filter(Boolean)
    ),
  ];

  if (!productIds.length) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się odczytać wybranych dań." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const [
    { data: vendor, error: vendorError },
    { data: reservation, error: reservationError },
  ] = await Promise.all([
    supabase
      .from("tokama_onsite_vendors")
      .select("id, name, discount_percent, delivery_cents")
      .eq("slug", "kanzan")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("tokama_reservations")
      .select("guest_name")
      .eq("id", access.session.reservation_id)
      .maybeSingle(),
  ]);

  if (vendorError || reservationError || !vendor || !reservation) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się przygotować zamówienia." },
      { status: 500 }
    );
  }

  const { data: products, error: productsError } = await supabase
    .from("tokama_onsite_menu_products")
    .select(
      "id, category_id, name_pl, description_pl, base_price_cents, dietary_tags, allergens, is_discount_eligible"
    )
    .eq("vendor_id", vendor.id)
    .eq("is_active", true)
    .in("id", productIds);

  if (productsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się odczytać aktualnego menu." },
      { status: 500 }
    );
  }

  const productById = new Map((products || []).map((product: any) => [String(product.id), product]));

  if (productById.size !== productIds.length) {
    return NextResponse.json(
      { ok: false, message: "Jedna z wybranych pozycji nie jest już dostępna." },
      { status: 409 }
    );
  }

  const { data: groups, error: groupsError } = await supabase
    .from("tokama_onsite_menu_option_groups")
    .select("id, product_id, name_pl, selection_type, min_selected, max_selected")
    .in("product_id", productIds)
    .eq("is_active", true);

  if (groupsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się odczytać konfiguracji dań." },
      { status: 500 }
    );
  }

  const groupsByProduct = new Map<string, any[]>();

  for (const group of groups || []) {
    const productId = String((group as any).product_id);
    const current = groupsByProduct.get(productId) || [];
    current.push(group);
    groupsByProduct.set(productId, current);
  }

  const requestedOptionIds = [
    ...new Set(selectedItems.flatMap((item) => normaliseIds(item.optionIds))),
  ];

  const { data: options, error: optionsError } = requestedOptionIds.length
    ? await supabase
        .from("tokama_onsite_menu_options")
        .select("id, group_id, name_pl, price_delta_cents, is_discount_eligible")
        .in("id", requestedOptionIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (optionsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się odczytać wybranych dodatków." },
      { status: 500 }
    );
  }

  const optionById = new Map((options || []).map((option: any) => [String(option.id), option]));
  const groupById = new Map((groups || []).map((group: any) => [String(group.id), group]));

  const orderItemDrafts: Array<{
    product: any;
    quantity: number;
    selectedOptions: any[];
    specialInstructions: string;
    originalUnitCents: number;
    originalTotalCents: number;
    discountableTotalCents: number;
    nonDiscountedTotalCents: number;
  }> = [];

  for (const selectedItem of selectedItems) {
    const productId = normaliseText(selectedItem.productId, 100);
    const product = productById.get(productId);

    if (!product) {
      return NextResponse.json(
        { ok: false, message: "Jedna z wybranych pozycji nie jest już dostępna." },
        { status: 409 }
      );
    }

    const groupsForProduct = groupsByProduct.get(productId) || [];
    const selectedOptionIds = normaliseIds(selectedItem.optionIds);
    const selectedOptions = selectedOptionIds.map((id) => optionById.get(id));

    if (selectedOptions.some((option) => !option)) {
      return NextResponse.json(
        { ok: false, message: "Jeden z wybranych dodatków nie jest już dostępny." },
        { status: 409 }
      );
    }

    if (
      selectedOptions.some(
        (option) => !groupById.has(String(option.group_id)) ||
          String(groupById.get(String(option.group_id))?.product_id) !== productId
      )
    ) {
      return NextResponse.json(
        { ok: false, message: "Wybrana konfiguracja dania jest nieprawidłowa." },
        { status: 400 }
      );
    }

    for (const group of groupsForProduct) {
      const selectedInGroup = selectedOptions.filter(
        (option) => String(option.group_id) === String(group.id)
      );
      const minimum = Math.max(0, Number(group.min_selected || 0));
      const maximum = Math.max(0, Number(group.max_selected || 0));

      if (selectedInGroup.length < minimum) {
        return NextResponse.json(
          { ok: false, message: `Wybierz: ${group.name_pl}.` },
          { status: 400 }
        );
      }

      if (
        (group.selection_type === "single" && selectedInGroup.length > 1) ||
        (maximum > 0 && selectedInGroup.length > maximum)
      ) {
        return NextResponse.json(
          { ok: false, message: `Zbyt wiele odpowiedzi w sekcji: ${group.name_pl}.` },
          { status: 400 }
        );
      }
    }

    const quantity = normaliseQuantity(selectedItem.quantity);
    let originalUnitCents = Math.max(0, Number(product.base_price_cents || 0));
    let discountableUnitCents =
      product.is_discount_eligible !== false ? originalUnitCents : 0;
    let nonDiscountedUnitCents =
      product.is_discount_eligible === false ? originalUnitCents : 0;

    for (const option of selectedOptions) {
      const priceDelta = Math.max(0, Number(option.price_delta_cents || 0));
      originalUnitCents += priceDelta;

      if (option.is_discount_eligible === false) {
        nonDiscountedUnitCents += priceDelta;
      } else {
        discountableUnitCents += priceDelta;
      }
    }

    orderItemDrafts.push({
      product,
      quantity,
      selectedOptions,
      specialInstructions: normaliseText(selectedItem.specialInstructions, 600),
      originalUnitCents,
      originalTotalCents: originalUnitCents * quantity,
      discountableTotalCents: discountableUnitCents * quantity,
      nonDiscountedTotalCents: nonDiscountedUnitCents * quantity,
    });
  }

  const foodSubtotalCents = orderItemDrafts.reduce(
    (sum, item) => sum + item.discountableTotalCents,
    0
  );
  const nonDiscountedSubtotalCents = orderItemDrafts.reduce(
    (sum, item) => sum + item.nonDiscountedTotalCents,
    0
  );
  const subtotalCents = foodSubtotalCents + nonDiscountedSubtotalCents;
  const discountPercent = Math.max(0, Number(vendor.discount_percent || 0));
  const discountCents = Math.round((foodSubtotalCents * discountPercent) / 100);
  const deliveryCents = Math.max(0, Number(vendor.delivery_cents || 0));
  const guestTotalCents = subtotalCents - discountCents + deliveryCents;

  let discountLeft = discountCents;

  const orderItems = orderItemDrafts.map((item, index) => {
    const isLast = index === orderItemDrafts.length - 1;
    const proposedDiscount = Math.round(
      (item.discountableTotalCents * discountPercent) / 100
    );
    const lineDiscountCents = isLast
      ? discountLeft
      : Math.min(discountLeft, proposedDiscount);

    discountLeft -= lineDiscountCents;

    const lineTotalCents = item.originalTotalCents - lineDiscountCents;
    const selectedOptions = item.selectedOptions.map((option) => ({
      id: String(option.id),
      groupId: String(option.group_id),
      groupName: groupById.get(String(option.group_id))?.name_pl || null,
      name: option.name_pl,
      priceCents: Number(option.price_delta_cents || 0),
      isDiscountEligible: option.is_discount_eligible !== false,
    }));

    return {
      item_name: item.product.name_pl,
      unit_price_cents: item.originalUnitCents,
      quantity: item.quantity,
      total_cents: lineTotalCents,
      menu_product_id: item.product.id,
      product_name_snapshot: item.product.name_pl,
      base_unit_price_cents: item.originalUnitCents,
      discount_cents: lineDiscountCents,
      discounted_unit_price_cents: Math.round(lineTotalCents / item.quantity),
      selected_options: selectedOptions,
      special_instructions: item.specialInstructions || null,
      product_snapshot: {
        id: item.product.id,
        name: item.product.name_pl,
        description: item.product.description_pl,
        dietaryTags: Array.isArray(item.product.dietary_tags) ? item.product.dietary_tags : [],
        allergens: Array.isArray(item.product.allergens) ? item.product.allergens : [],
        basePriceCents: Number(item.product.base_price_cents || 0),
        isDiscountEligible: item.product.is_discount_eligible !== false,
      },
    };
  });

  const publicCode = `ONS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  const { data: order, error: orderError } = await supabase
    .from("tokama_onsite_orders")
    .insert({
      public_code: publicCode,
      reservation_id: access.session.reservation_id,
      house_id: access.house.id,
      guest_session_id: access.session.id,
      vendor_id: vendor.id,
      note: note || null,
      subtotal_cents: subtotalCents,
      food_subtotal_cents: foodSubtotalCents,
      non_discounted_subtotal_cents: nonDiscountedSubtotalCents,
      discount_cents: discountCents,
      delivery_cents: deliveryCents,
      guest_total_cents: guestTotalCents,
      total_cents: guestTotalCents,
      currency: "PLN",
      dispatch_status: "new",
    })
    .select("id, public_code, total_cents, guest_total_cents, discount_cents, delivery_cents, currency")
    .single();

  if (orderError || !order) {
    console.error("[TOKAMA ONSITE] Order creation failed", orderError);

    return NextResponse.json(
      { ok: false, message: "Nie udało się utworzyć zamówienia." },
      { status: 500 }
    );
  }

  const { error: itemsError } = await supabase
    .from("tokama_onsite_order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    console.error("[TOKAMA ONSITE] Order items creation failed", itemsError);
    await supabase.from("tokama_onsite_orders").delete().eq("id", order.id);

    return NextResponse.json(
      { ok: false, message: "Nie udało się zapisać pozycji zamówienia." },
      { status: 500 }
    );
  }

  const guestName = String(reservation.guest_name || "Gość").trim() || "Gość";
  const formattedTotal = `${(Number(order.guest_total_cents ?? order.total_cents ?? 0) / 100)
    .toFixed(2)
    .replace(".", ",")} ${order.currency || "PLN"}`;

  try {
    await sendTokamaHostPush({
      title: "Nowe zamówienie KANZAN",
      body: `${access.house.code} · ${guestName} · ${formattedTotal}`,
      data: {
        type: "onsite_order",
        order_id: order.id,
        reservation_id: access.session.reservation_id,
        public_code: order.public_code,
        house_code: access.house.code,
      },
    });
  } catch (error) {
    console.log("[TOKAMA ONSITE] Push notification failed", error);
  }

  return NextResponse.json({
    ok: true,
    order: {
      code: order.public_code,
      subtotalCents,
      discountCents,
      deliveryCents,
      totalCents: Number(order.guest_total_cents ?? order.total_cents ?? 0),
      currency: order.currency || "PLN",
    },
  });
}
