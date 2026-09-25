import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fallbackSettings = {
  currency: "PLN",
  base_price_per_house_per_night_cents: 120000,
};

const fallbackAddons: any[] = [];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [{ data: settings, error: settingsError }, { data: addons, error: addonsError }, { data: pricingRules, error: pricingRulesError }] =
      await Promise.all([
        supabase
          .from("tokama_booking_settings")
          .select("*")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tokama_addons")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("tokama_pricing_rules")
          .select("id,name,price_cents,valid_from,valid_to,weekdays,priority,is_active")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
      ]);

    if (settingsError || addonsError || pricingRulesError) {
      return NextResponse.json(
        {
          settings: settings || fallbackSettings,
          addons: addons || fallbackAddons,
          error: settingsError?.message || addonsError?.message || pricingRulesError?.message,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        settings: { ...(settings || fallbackSettings), pricing_rules: pricingRules || [] },
        addons: addons || fallbackAddons,
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
        settings: fallbackSettings,
        addons: fallbackAddons,
        error: error instanceof Error ? error.message : "Unknown settings error.",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
