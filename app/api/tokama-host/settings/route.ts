import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AddonVariantInput = {
  id?: string;
  name_pl?: string;
  name_en?: string;
  description_pl?: string | null;
  description_en?: string | null;
  price_cents?: number;
  pricing_unit?: string;
  is_active?: boolean;
};

type AddonInput = {
  id?: string;
  code?: string;
  name_pl?: string;
  name_en?: string;
  description_pl?: string | null;
  description_en?: string | null;
  price_cents?: number;
  pricing_unit?: string;
  is_active?: boolean;
  sort_order?: number;
  show_variant_prices?: boolean;
  allow_day_selection?: boolean;
  day_selection_label_pl?: string | null;
  day_selection_label_en?: string | null;
  variants?: AddonVariantInput[];
};

type SettingsBody = {
  base_price_per_house_per_night_cents?: number;
  currency?: string;
  addons?: AddonInput[];
  deleted_addon_ids?: string[];
};

async function verifyHost(request: Request, supabase: ReturnType<typeof getSupabaseAdmin>) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { ok: false as const, response: NextResponse.json({ ok: false, message: "Missing authorization token." }, { status: 401 }) };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("hostapp_profiles")
    .select("id, is_active, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_active) {
    return { ok: false as const, response: NextResponse.json({ ok: false, message: "No active HOSTapp profile." }, { status: 403 }) };
  }

  return { ok: true as const, user };
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = await verifyHost(request, supabase);

    if (!auth.ok) return auth.response;

    const [{ data: settings, error: settingsError }, { data: addons, error: addonsError }] =
      await Promise.all([
        supabase.from("tokama_booking_settings").select("*").limit(1).maybeSingle(),
        supabase.from("tokama_addons").select("*").order("sort_order", { ascending: true }),
      ]);

    if (settingsError || addonsError) {
      return NextResponse.json(
        {
          ok: false,
          message: settingsError?.message || addonsError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      settings,
      addons: addons || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown settings error.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = await verifyHost(request, supabase);

    if (!auth.ok) return auth.response;

    const body = (await request.json()) as SettingsBody;

    const currency = String(body.currency || "PLN").trim().toUpperCase();
    const basePrice = Number(body.base_price_per_house_per_night_cents || 0);

    const { data: existingSettings } = await supabase
      .from("tokama_booking_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existingSettings?.id) {
      const { error: updateSettingsError } = await supabase
        .from("tokama_booking_settings")
        .update({
          currency,
          base_price_per_house_per_night_cents: basePrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSettings.id);

      if (updateSettingsError) {
        return NextResponse.json(
          { ok: false, message: updateSettingsError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertSettingsError } = await supabase
        .from("tokama_booking_settings")
        .insert({
          currency,
          base_price_per_house_per_night_cents: basePrice,
        });

      if (insertSettingsError) {
        return NextResponse.json(
          { ok: false, message: insertSettingsError.message },
          { status: 500 }
        );
      }
    }

    const deletedAddonIds = Array.isArray(body.deleted_addon_ids)
      ? body.deleted_addon_ids
          .map((id) => String(id || "").trim())
          .filter((id) => id && !id.startsWith("local-"))
      : [];

    if (deletedAddonIds.length > 0) {
      const { error: deleteAddonsError } = await supabase
        .from("tokama_addons")
        .delete()
        .in("id", deletedAddonIds);

      if (deleteAddonsError) {
        return NextResponse.json(
          { ok: false, message: deleteAddonsError.message },
          { status: 500 }
        );
      }
    }

    if (Array.isArray(body.addons)) {
      for (const addon of body.addons) {
        const addonId = addon.id ? String(addon.id) : "";

        const variants = Array.isArray(addon.variants)
          ? addon.variants.map((variant, index) => ({
              id: String(variant.id || `variant_${index + 1}`).trim(),
              name_pl: String(variant.name_pl || "").trim(),
              name_en: String(variant.name_en || "").trim(),
              description_pl: variant.description_pl || null,
              description_en: variant.description_en || null,
              price_cents: Number(variant.price_cents || 0),
              pricing_unit: String(
                variant.pricing_unit || addon.pricing_unit || "per_stay"
              ),
              is_active: variant.is_active !== false,
            }))
          : [];

        const payload = {
          name_pl: String(addon.name_pl || "").trim(),
          name_en: String(addon.name_en || "").trim(),
          description_pl: addon.description_pl || null,
          description_en: addon.description_en || null,
          price_cents: Number(addon.price_cents || 0),
          pricing_unit: String(addon.pricing_unit || "per_stay"),
          is_active: addon.is_active !== false,
          sort_order: Number(addon.sort_order || 0),
          show_variant_prices: addon.show_variant_prices !== false,
          allow_day_selection: addon.allow_day_selection === true,
          day_selection_label_pl: addon.day_selection_label_pl || null,
          day_selection_label_en: addon.day_selection_label_en || null,
          variants,
          updated_at: new Date().toISOString(),
        };

        if (addonId) {
          const { error } = await supabase
            .from("tokama_addons")
            .update(payload)
            .eq("id", addonId);

          if (error) {
            return NextResponse.json(
              { ok: false, message: error.message },
              { status: 500 }
            );
          }
        } else {
          const { error } = await supabase
            .from("tokama_addons")
            .insert(payload);

          if (error) {
            return NextResponse.json(
              { ok: false, message: error.message },
              { status: 500 }
            );
          }
        }
      }
    }

    const [{ data: settings }, { data: addons }] = await Promise.all([
      supabase.from("tokama_booking_settings").select("*").limit(1).maybeSingle(),
      supabase.from("tokama_addons").select("*").order("sort_order", { ascending: true }),
    ]);

    return NextResponse.json({
      ok: true,
      settings,
      addons: addons || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown save settings error.",
      },
      { status: 500 }
    );
  }
}
