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

  const { data: vendor, error: vendorError } = await supabase
    .from("tokama_onsite_vendors")
    .select("id, slug, name, description, discount_percent, delivery_cents")
    .eq("slug", "kanzan")
    .eq("is_active", true)
    .maybeSingle();

  if (vendorError || !vendor) {
    return NextResponse.json(
      { ok: false, message: "Menu jest obecnie niedostępne." },
      { status: 503 }
    );
  }

  const [{ data: categories, error: categoriesError }, { data: products, error: productsError }] =
    await Promise.all([
      supabase
        .from("tokama_onsite_menu_categories")
        .select("id, slug, name_pl, description_pl, image_url, sort_order, is_discount_eligible")
        .eq("vendor_id", vendor.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tokama_onsite_menu_products")
        .select(
          "id, category_id, source_key, name_pl, description_pl, image_url, base_price_cents, dietary_tags, allergens, sort_order, is_discount_eligible"
        )
        .eq("vendor_id", vendor.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (categoriesError || productsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się pobrać aktualnego menu." },
      { status: 500 }
    );
  }

  const productRows = products || [];
  const productIds = productRows.map((product: any) => String(product.id));

  const { data: groups, error: groupsError } = productIds.length
    ? await supabase
        .from("tokama_onsite_menu_option_groups")
        .select(
          "id, product_id, name_pl, helper_text_pl, selection_type, min_selected, max_selected, sort_order"
        )
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (groupsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się pobrać konfiguracji dań." },
      { status: 500 }
    );
  }

  const groupRows = groups || [];
  const groupIds = groupRows.map((group: any) => String(group.id));

  const { data: options, error: optionsError } = groupIds.length
    ? await supabase
        .from("tokama_onsite_menu_options")
        .select(
          "id, group_id, name_pl, price_delta_cents, sort_order, is_default, is_discount_eligible"
        )
        .in("group_id", groupIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (optionsError) {
    return NextResponse.json(
      { ok: false, message: "Nie udało się pobrać dodatków do dań." },
      { status: 500 }
    );
  }

  const optionsByGroup = new Map<string, any[]>();

  for (const option of options || []) {
    const groupId = String((option as any).group_id);
    const current = optionsByGroup.get(groupId) || [];
    current.push(option);
    optionsByGroup.set(groupId, current);
  }

  const groupsByProduct = new Map<string, any[]>();

  for (const group of groupRows) {
    const productId = String((group as any).product_id);
    const current = groupsByProduct.get(productId) || [];
    current.push(group);
    groupsByProduct.set(productId, current);
  }

  const categoriesWithProducts = (categories || []).map((category: any) => ({
    id: String(category.id),
    slug: category.slug,
    name: category.name_pl,
    description: category.description_pl,
    imageUrl: category.image_url,
    isDiscountEligible: category.is_discount_eligible !== false,
    products: productRows
      .filter((product: any) => String(product.category_id) === String(category.id))
      .map((product: any) => ({
        id: String(product.id),
        sourceKey: product.source_key,
        name: product.name_pl,
        description: product.description_pl,
        imageUrl: product.image_url,
        priceCents: Number(product.base_price_cents || 0),
        dietaryTags: Array.isArray(product.dietary_tags) ? product.dietary_tags : [],
        allergens: Array.isArray(product.allergens) ? product.allergens : [],
        isDiscountEligible: product.is_discount_eligible !== false,
        optionGroups: (groupsByProduct.get(String(product.id)) || []).map((group: any) => ({
          id: String(group.id),
          name: group.name_pl,
          helperText: group.helper_text_pl,
          selectionType: group.selection_type === "single" ? "single" : "multiple",
          minSelected: Number(group.min_selected || 0),
          maxSelected: Number(group.max_selected || 0),
          options: (optionsByGroup.get(String(group.id)) || []).map((option: any) => ({
            id: String(option.id),
            name: option.name_pl,
            priceCents: Number(option.price_delta_cents || 0),
            isDefault: option.is_default === true,
            isDiscountEligible: option.is_discount_eligible !== false,
          })),
        })),
      })),
  }));

  return NextResponse.json(
    {
      ok: true,
      house: {
        code: access.house.code,
        name: access.house.name,
      },
      vendor: {
        name: vendor.name,
        description: vendor.description,
        discountPercent: Number(vendor.discount_percent || 0),
        deliveryCents: Number(vendor.delivery_cents || 0),
      },
      categories: categoriesWithProducts,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
