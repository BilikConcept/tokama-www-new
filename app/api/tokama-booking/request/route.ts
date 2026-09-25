import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  calculateDiscountCents,
  findDiscountCode,
  normalizeDiscountCode,
} from "@/lib/tokama/discounts";
import { sendTokamaEmail } from "@/lib/tokamaNotifications";
import { sendTokamaNewReservationPush } from "@/lib/tokamaPush";
import {
  TOKAMA_PRIVACY_VERSION,
  TOKAMA_TERMS_VERSION,
  validateLegalAcceptance,
} from "@/lib/tokama/legal";
import { calculateDynamicStayPrice } from "@/lib/tokama/pricing";

type RequestBody = {
  locale: "pl" | "en";
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_message?: string;
  discount_code?: string;
  package_slug?: string;
  terms_accepted: boolean;
  terms_version: string;
  privacy_acknowledged: boolean;
  privacy_version: string;
  addons: {
    slug: string;
    quantity: number;
    variant_id?: string | null;
    selected_dates?: string[];
  }[];
};

function getNights(checkin: string, checkout: string) {
  const start = new Date(`${checkin}T00:00:00`);
  const end = new Date(`${checkout}T00:00:00`);

  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function getHousesNeeded(adults: number, maxAdultsPerHouse: number) {
  return Math.ceil(adults / maxAdultsPerHouse);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function formatMoney(cents: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function calculateAddonTotal(input: {
  addon: any;
  quantity: number;
  nights: number;
  adults: number;
  children: number;
  housesCount: number;
}) {
  const { addon, quantity, nights, adults, children, housesCount } = input;
  const price = Number(addon.price_cents || 0);
  const unit = addon.pricing_unit;

  if (unit === "per_night") return price * quantity * nights;
  if (unit === "per_adult") return price * quantity * adults;
  if (unit === "per_child") return price * quantity * children;
  if (unit === "per_guest") return price * quantity * (adults + children);
  if (unit === "per_person") return price * quantity * (adults + children);
  if (unit === "per_house") return price * quantity * housesCount;
  if (unit === "per_house_per_night") return price * quantity * housesCount * nights;

  return price * quantity;
}

function buildGuestEmail(input: {
  locale: "pl" | "en";
  guestName: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  housesCount: number;
  total: string;
}) {
  const isEnglish = input.locale === "en";

  const subject = isEnglish
    ? "TOKAMA — reservation request received"
    : "TOKAMA — otrzymaliśmy Twoją rezerwację";

  const intro = isEnglish
    ? "Thank you. We have received your reservation request. The host will verify availability and contact you with the next step."
    : "Dziękujemy. Otrzymaliśmy Twoją prośbę o rezerwację. Host zweryfikuje dostępność i skontaktuje się z Tobą z kolejnym krokiem.";

  const labels = isEnglish
    ? { guest: "Guest", stay: "Stay", adults: "Adults", children: "Children", houses: "Houses", total: "Estimated total", payment: "Payment is not required yet. You will receive details after the host accepts your reservation." }
    : { guest: "Gość", stay: "Pobyt", adults: "Dorośli", children: "Dzieci", houses: "Domki", total: "Szacunkowa suma", payment: "Płatność nie jest jeszcze wymagana. Szczegóły otrzymasz po akceptacji rezerwacji przez hosta." };

  const html = `
    <div style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;line-height:1.55;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;">
        <tr><td style="padding:28px 32px 18px;border-bottom:1px solid #e5e5e5;text-align:center;">
          <a href="https://tokama-www-new.vercel.app/" style="text-decoration:none;color:#111111;">
            <img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;max-width:142px;height:auto;" />
            <span style="display:block;margin-top:6px;font-size:9px;letter-spacing:3px;color:#666666;">WINDYKI · BLISKO NATURY</span>
          </a>
        </td></tr>
        <tr><td style="padding:0;"><img src="https://tokama-www-new.vercel.app/email/tokama-hero.gif" width="620" alt="TOKAMA nad jeziorem" style="display:block;width:100%;height:auto;border:0;" /></td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#666666;text-align:center;">TOKAMA · ${isEnglish ? "RESERVATION REQUEST" : "PROŚBA O REZERWACJĘ"}</p>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.12;font-weight:500;letter-spacing:-.5px;text-align:center;">${isEnglish ? "We have your request." : "Mamy Twoją prośbę."}</h1>
          <p style="margin:0 0 26px;font-size:16px;color:#444444;text-align:center;">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dedbd1;border-bottom:1px solid #dedbd1;">
            <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">${labels.guest}</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.guestName}</td></tr>
            <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">${labels.stay}</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${formatDate(input.checkin)} — ${formatDate(input.checkout)}</td></tr>
            <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">${labels.adults} / ${labels.children}</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.adults} / ${input.children}</td></tr>
            <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">${labels.houses}</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.housesCount}</td></tr>
            <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">${labels.total}</td><td align="right" style="padding:12px 0;font-size:18px;font-weight:bold;">${input.total}</td></tr>
          </table>
          <p style="margin:24px 0 0;padding:16px;background:#f7f7f7;color:#444444;font-size:13px;text-align:center;">${labels.payment}</p>
        </td></tr>
        <tr><td style="padding:22px 32px;background:#20211e;color:#e9e7df;font-size:11px;letter-spacing:.4px;">TOKAMA · Windyki 116 · Iława<br /><a href="https://tokama-www-new.vercel.app/" style="color:#e9e7df;">tokama-www-new.vercel.app</a></td></tr>
      </table>
    </div>
  `;

  const text = `${intro}

${isEnglish ? "Guest" : "Gość"}: ${input.guestName}
${isEnglish ? "Stay" : "Pobyt"}: ${formatDate(input.checkin)} — ${formatDate(input.checkout)}
${isEnglish ? "Adults" : "Dorośli"}: ${input.adults}
${isEnglish ? "Children" : "Dzieci"}: ${input.children}
${isEnglish ? "Houses" : "Domki"}: ${input.housesCount}
${isEnglish ? "Estimated total" : "Szacunkowa suma"}: ${input.total}
`;

  return { subject, html, text };
}

function buildHostEmail(input: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  housesCount: number;
  total: string;
}) {
  return {
    subject: "TOKAMA — nowa rezerwacja",
    html: `
      <div style="margin:0;padding:32px 12px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;line-height:1.55;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;">
          <tr><td style="padding:28px 32px 18px;border-bottom:1px solid #e5e5e5;text-align:center;"><img src="https://tokama-www-new.vercel.app/tokama-logo.svg" width="142" alt="TOKAMA" style="display:inline-block;border:0;max-width:142px;height:auto;" /><span style="display:block;margin-top:6px;font-size:9px;letter-spacing:3px;color:#666666;">PANEL HOSTA · NOWA REZERWACJA</span></td></tr>
          <tr><td style="padding:32px;"><p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#666666;text-align:center;">NOWE ZGŁOSZENIE</p><h1 style="margin:0 0 22px;font-size:30px;line-height:1.12;font-weight:500;text-align:center;">Nowa rezerwacja TOKAMA</h1>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dedbd1;border-bottom:1px solid #dedbd1;">
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Gość</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.guestName}</td></tr>
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Kontakt</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.guestEmail}<br />${input.guestPhone}</td></tr>
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Pobyt</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${formatDate(input.checkin)} — ${formatDate(input.checkout)}</td></tr>
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Goście</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.adults} dorosłych · ${input.children} dzieci</td></tr>
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Domki</td><td align="right" style="padding:12px 0;font-size:14px;font-weight:bold;">${input.housesCount}</td></tr>
              <tr><td style="padding:12px 0;color:#77766f;font-size:12px;">Szacunkowa suma</td><td align="right" style="padding:12px 0;font-size:18px;font-weight:bold;">${input.total}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:22px 32px;background:#20211e;color:#e9e7df;font-size:11px;letter-spacing:.4px;">TOKAMA · Windyki 116 · Iława</td></tr>
        </table>
      </div>
    `,
    text: `Nowa rezerwacja TOKAMA

Gość: ${input.guestName}
Email: ${input.guestEmail}
Telefon: ${input.guestPhone}
Pobyt: ${formatDate(input.checkin)} — ${formatDate(input.checkout)}
Dorośli: ${input.adults}
Dzieci: ${input.children}
Domki: ${input.housesCount}
Szacunkowa suma: ${input.total}
`,
  };
}


function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function findSuggestedAvailableDates(input: {
  supabase: any;
  requestedCheckin: string;
  nights: number;
  housesCount: number;
  activeReservationStatuses: string[];
  allHouses: any[];
}) {
  const suggestions: {
    checkin: string;
    checkout: string;
  }[] = [];

  const requestedStart = new Date(`${input.requestedCheckin}T00:00:00`);

  for (let offset = 1; offset <= 90; offset += 1) {
    if (suggestions.length >= 3) break;

    const checkinDate = addDays(requestedStart, offset);
    const checkoutDate = addDays(checkinDate, input.nights);

    const checkin = toDateInputValue(checkinDate);
    const checkout = toDateInputValue(checkoutDate);

    const { data: overlappingReservations, error: overlappingError } =
      await input.supabase
        .from("tokama_reservations")
        .select("id")
        .lt("checkin", checkout)
        .gt("checkout", checkin)
        .in("status", input.activeReservationStatuses);

    if (overlappingError) {
      continue;
    }

    const overlappingReservationIds =
      overlappingReservations?.map((item: any) => item.id) || [];

    const reservedHouseIds = new Set<string>();

    if (overlappingReservationIds.length) {
      const { data: reservedHouses, error: reservedHousesError } =
        await input.supabase
          .from("tokama_reservation_houses")
          .select("house_id")
          .in("reservation_id", overlappingReservationIds);

      if (reservedHousesError) {
        continue;
      }

      for (const item of reservedHouses || []) {
        if (item.house_id) {
          reservedHouseIds.add(item.house_id);
        }
      }
    }

    const blockedHouseKeysForSuggestion =
      await getBlockedHouseKeys(input.supabase, checkin, checkout);

    blockedHouseKeysForSuggestion.forEach((houseKey) =>
      reservedHouseIds.add(houseKey)
    );

    const availableHousesCount = input.allHouses.filter(
      (house: any) => !reservedHouseIds.has(house.id)
    ).length;

    if (availableHousesCount >= input.housesCount) {
      suggestions.push({
        checkin,
        checkout,
      });
    }
  }

  return suggestions;
}



async function getBlockedHouseKeys(
  supabase: any,
  checkin: string,
  checkout: string
) {
  const [manualResult, externalResult] = await Promise.all([
    supabase
      .from("tokama_house_date_blocks")
      .select("house_id, house_code")
      .lt("start_date", checkout)
      .gt("end_date", checkin),
    supabase
      .from("tokama_external_calendar_events")
      .select("house_id")
      .lt("start_date", checkout)
      .gt("end_date", checkin),
  ]);

  if (manualResult.error || externalResult.error) {
    throw new Error(`Could not read date blocks: ${manualResult.error?.message || externalResult.error?.message}`);
  }

  const blockedKeys = new Set<string>();
  const blockedCodes = new Set<string>();

  (manualResult.data || []).forEach((block: any) => {
    const houseId = String(block.house_id || "").trim();
    const houseCode = String(block.house_code || "").trim().toUpperCase();

    if (houseId) blockedKeys.add(houseId);
    if (houseCode) {
      blockedKeys.add(houseCode);
      blockedCodes.add(houseCode);
    }
  });

  (externalResult.data || []).forEach((block: any) => {
    const houseId = String(block.house_id || "").trim();
    if (houseId) blockedKeys.add(houseId);
  });

  if (blockedCodes.size > 0) {
    const { data: houses, error: housesError } = await supabase
      .from("tokama_houses")
      .select("id, code")
      .in("code", Array.from(blockedCodes));

    if (housesError) {
      throw new Error(`Could not resolve blocked houses: ${housesError.message}`);
    }

    (houses || []).forEach((house: any) => {
      const houseId = String(house.id || "").trim();
      const houseCode = String(house.code || "").trim().toUpperCase();

      if (houseId) blockedKeys.add(houseId);
      if (houseCode) blockedKeys.add(houseCode);
    });
  }

  return blockedKeys;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const legalAcceptanceError = validateLegalAcceptance({
      termsAccepted: body.terms_accepted,
      termsVersion: body.terms_version,
      privacyAcknowledged: body.privacy_acknowledged,
      privacyVersion: body.privacy_version,
    });

    if (legalAcceptanceError) {
      return NextResponse.json(
        { ok: false, code: "LEGAL_ACCEPTANCE_REQUIRED", message: legalAcceptanceError },
        { status: 400 }
      );
    }

    const acceptedAt = new Date().toISOString();
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const acceptanceIp = forwardedFor.split(",")[0]?.trim() || null;
    const acceptanceUserAgent = (request.headers.get("user-agent") || "").slice(0, 500) || null;

    const supabase = getSupabaseAdmin();

    const [{ data: settings }, { data: addons }, { data: pricingRules }] = await Promise.all([
      supabase
        .from("tokama_booking_settings")
        .select("*")
        .eq("id", true)
        .single(),
      supabase
        .from("tokama_addons")
        .select("*")
        .eq("is_active", true),
      supabase
        .from("tokama_pricing_rules")
        .select("id,name,price_cents,valid_from,valid_to,weekdays,priority,is_active")
        .eq("is_active", true)
        .order("priority", { ascending: false }),
    ]);

    if (!settings) {
      return NextResponse.json(
        { ok: false, message: "Booking settings not found." },
        { status: 500 }
      );
    }

    const packageSlug = String(body.package_slug || "").trim();
    const { data: selectedPackage, error: packageError } = packageSlug
      ? await supabase
          .from("tokama_packages")
          .select("id,slug,name,status,package_price_cents,currency,valid_from,valid_to,weekdays,min_nights,max_guests")
          .eq("slug", packageSlug)
          .eq("status", "active")
          .maybeSingle()
      : { data: null, error: null };

    if (packageError || (packageSlug && !selectedPackage)) {
      return NextResponse.json(
        { ok: false, code: "PACKAGE_UNAVAILABLE", message: "Wybrany pakiet nie jest już dostępny." },
        { status: 400 }
      );
    }

    const nights = getNights(body.checkin, body.checkout);
    const adults = Math.max(1, Number(body.adults || 1));
    const children = Math.max(0, Number(body.children || 0));

    const maxAdultsPerHouse = Number(settings.max_adults_per_house || 7);
    const housesTotal = Number(settings.houses_total || 3);
    const minNights = Math.max(Number(settings.min_nights || 2), Number(selectedPackage?.min_nights || 1));
    const currency = settings.currency || "PLN";

    const basePrice =
      Number(settings.base_price_per_house_per_night_cents) ||
      Number(settings.base_price_per_house_night_cents) ||
      120000;

    const housesCount = getHousesNeeded(adults, maxAdultsPerHouse);

    if (selectedPackage?.valid_from && body.checkin < selectedPackage.valid_from) {
      return NextResponse.json({ ok: false, code: "PACKAGE_DATES", message: "Pakiet nie obowiązuje w wybranym terminie." }, { status: 400 });
    }
    if (selectedPackage?.valid_to && body.checkout > selectedPackage.valid_to) {
      return NextResponse.json({ ok: false, code: "PACKAGE_DATES", message: "Pakiet nie obowiązuje w wybranym terminie." }, { status: 400 });
    }
    if (selectedPackage?.max_guests && adults + children > Number(selectedPackage.max_guests)) {
      return NextResponse.json({ ok: false, code: "PACKAGE_GUESTS", message: "Liczba gości przekracza limit tego pakietu." }, { status: 400 });
    }
    if (selectedPackage?.weekdays?.length) {
      const checkinDay = new Date(`${body.checkin}T12:00:00Z`).getUTCDay() || 7;
      if (!selectedPackage.weekdays.includes(checkinDay)) {
        return NextResponse.json({ ok: false, code: "PACKAGE_WEEKDAY", message: "Pakiet nie jest dostępny w wybranym dniu przyjazdu." }, { status: 400 });
      }
    }

    const packageNights = Number(selectedPackage?.min_nights || 0);

    if (selectedPackage && nights !== packageNights) {
      const polishNightLabel = packageNights === 1 ? "noc" : packageNights >= 2 && packageNights <= 4 ? "noce" : "nocy";

      return NextResponse.json(
        {
          ok: false,
          code: "PACKAGE_DURATION",
          message:
            body.locale === "en"
              ? `This package is available for exactly ${packageNights} nights. To extend your stay, please contact the host.`
              : `Ten pakiet obejmuje dokładnie ${packageNights} ${polishNightLabel}. Jeśli chcesz przedłużyć pobyt, skontaktuj się z hostem.`,
        },
        { status: 400 }
      );
    }

    if (housesCount > housesTotal) {
      return NextResponse.json(
        { ok: false, message: "Too many adult guests for available houses." },
        { status: 400 }
      );
    }

    if (nights < minNights) {
      return NextResponse.json(
        { ok: false, message: "Stay is shorter than minimum nights." },
        { status: 400 }
      );
    }

    const packagePrice = Number(selectedPackage?.package_price_cents || 0);
    const dynamicPricing = calculateDynamicStayPrice({
      checkin: body.checkin,
      checkout: body.checkout,
      housesCount,
      basePriceCents: basePrice,
      rules: pricingRules || [],
    });
    const stayPrice = packagePrice > 0 ? packagePrice * housesCount : dynamicPricing.totalCents;

    const activeReservationStatuses = [
      "requested",
      "approved",
      "payment_sent",
      "paid",
      "confirmed",
    ];

    const { data: overlappingReservations, error: overlappingError } = await supabase
      .from("tokama_reservations")
      .select("id")
      .lt("checkin", body.checkout)
      .gt("checkout", body.checkin)
      .in("status", activeReservationStatuses);

    if (overlappingError) {
      return NextResponse.json(
        { ok: false, message: overlappingError.message },
        { status: 500 }
      );
    }

    const overlappingReservationIds =
      overlappingReservations?.map((item: any) => item.id) || [];

    const reservedHouseIds = new Set<string>();

    if (overlappingReservationIds.length) {
      const { data: reservedHouses, error: reservedHousesError } = await supabase
        .from("tokama_reservation_houses")
        .select("house_id")
        .in("reservation_id", overlappingReservationIds);

      if (reservedHousesError) {
        return NextResponse.json(
          { ok: false, message: reservedHousesError.message },
          { status: 500 }
        );
      }

      for (const item of reservedHouses || []) {
        if (item.house_id) {
          reservedHouseIds.add(item.house_id);
        }
      }
    }

    const { data: allHouses, error: allHousesError } = await supabase
      .from("tokama_houses")
      .select("id, code, name, sort_order")
      .order("sort_order", { ascending: true });

    if (allHousesError || !allHouses) {
      return NextResponse.json(
        { ok: false, message: allHousesError?.message || "Houses not found." },
        { status: 500 }
      );
    }

    const blockedHouseKeysForRequestedDates =
      await getBlockedHouseKeys(supabase, body.checkin, body.checkout);

    blockedHouseKeysForRequestedDates.forEach((houseKey) =>
      reservedHouseIds.add(houseKey)
    );

    const availableHouses = allHouses
      .filter((house: any) => !reservedHouseIds.has(house.id) && !reservedHouseIds.has(String(house.code || "").toUpperCase()))
      .slice(0, housesCount);

    if (availableHouses.length < housesCount) {
      const suggestions = await findSuggestedAvailableDates({
        supabase,
        requestedCheckin: body.checkin,
        nights,
        housesCount,
        activeReservationStatuses,
        allHouses,
      });

      return NextResponse.json(
        {
          ok: false,
          code: "NO_AVAILABLE_HOUSES",
          message:
            "Brak dostępnych domków w wybranym terminie. Sprawdź sugerowane wolne terminy.",
          suggestions,
        },
        { status: 409 }
      );
    }

    const selectedAddons = body.addons || [];
    const availableAddons = addons || [];

    const addonRows = selectedAddons
      .map((selected) => {
        const addon = availableAddons.find((item: any) => item.slug === selected.slug);
        if (!addon) return null;

        const variants = Array.isArray(addon.variants)
          ? addon.variants.filter((variant: any) => variant.is_active !== false)
          : [];
        const selectedVariantId = String(selected.variant_id || "").trim();
        const variant =
          variants.find((item: any) => String(item.id) === selectedVariantId) ||
          variants[0] ||
          null;

        const quantity = Math.max(1, Number(selected.quantity || 1));
        const selectedDates = Array.isArray(selected.selected_dates)
          ? selected.selected_dates.filter((date: any) =>
              /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))
            )
          : [];

        const total = calculateAddonTotal({
          addon,
          variant,
          quantity,
          nights,
          adults,
          children,
          housesCount,
          selectedDatesCount: selectedDates.length,
        } as any);

        return {
          addon,
          variant,
          quantity,
          selectedDates,
          total,
        };
      })
      .filter(Boolean) as {
      addon: any;
      variant: any | null;
      quantity: number;
      selectedDates: string[];
      total: number;
    }[];

    const addonsPrice = addonRows.reduce((sum, row) => sum + row.total, 0);
    const subtotalBeforeDiscount = stayPrice + addonsPrice;
    const requestedDiscountCode = normalizeDiscountCode(body.discount_code);
    const discount = requestedDiscountCode
      ? await findDiscountCode(supabase, requestedDiscountCode, body.checkin)
      : null;

    if (requestedDiscountCode && !discount) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_DISCOUNT_CODE",
          message:
            body.locale === "en"
              ? "The discount code is invalid, inactive or expired."
              : "Kod rabatowy jest nieprawidłowy, nieaktywny lub wygasł.",
        },
        { status: 400 }
      );
    }

    const discountPercent = Number(discount?.discount_percent || 0);
    const discountCents = calculateDiscountCents(
      subtotalBeforeDiscount,
      discountPercent
    );
    const totalEstimated = Math.max(0, subtotalBeforeDiscount - discountCents);

    const { data: reservation, error: reservationError } = await supabase
      .from("tokama_reservations")
      .insert({
        source: "website",
        status: "requested",
        locale: body.locale || "pl",
        checkin: body.checkin,
        checkout: body.checkout,
        nights,
        adults,
        children,
        houses_count: housesCount,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_phone: body.guest_phone,
        guest_message: body.guest_message || null,
        currency,
        stay_price_cents: stayPrice,
        addons_price_cents: addonsPrice,
        subtotal_before_discount_cents: subtotalBeforeDiscount,
        discount_code: discount?.code || null,
        discount_percent: discountPercent,
        discount_cents: discountCents,
        total_estimated_cents: totalEstimated,
        min_nights_at_booking: minNights,
        base_price_per_house_per_night_cents_at_booking: basePrice,
        package_id: selectedPackage?.id || null,
        package_slug_at_booking: selectedPackage?.slug || null,
        package_name_at_booking: selectedPackage?.name || null,
        package_price_cents_at_booking: packagePrice || null,
        pricing_breakdown: packagePrice > 0 ? [] : dynamicPricing.nightlyPrices,
        terms_version: TOKAMA_TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        privacy_notice_version: TOKAMA_PRIVACY_VERSION,
        privacy_acknowledged_at: acceptedAt,
        legal_acceptance_ip: acceptanceIp,
        legal_acceptance_user_agent: acceptanceUserAgent,
      })
      .select("*")
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { ok: false, message: reservationError?.message || "Reservation failed." },
        { status: 500 }
      );
    }

    if (availableHouses.length) {
      const { error: reservationHousesError } = await supabase
        .from("tokama_reservation_houses")
        .insert(
          availableHouses.map((house: any) => ({
            reservation_id: reservation.id,
            house_id: house.id,
          }))
        );

      if (reservationHousesError) {
        return NextResponse.json(
          { ok: false, message: reservationHousesError.message },
          { status: 500 }
        );
      }
    }

    if (addonRows.length) {
      const rows = addonRows.map((row) => ({
        reservation_id: reservation.id,
        addon_id: row.addon.id,
        addon_slug: row.addon.slug,
        name_pl: row.addon.name_pl,
        name_en: row.addon.name_en,
        variant_id: row.variant?.id || null,
        variant_name_pl: row.variant?.name_pl || null,
        variant_name_en: row.variant?.name_en || null,
        pricing_unit: row.variant?.pricing_unit || row.addon.pricing_unit,
        quantity: row.quantity,
        selected_dates: row.selectedDates || [],
        unit_price_cents: Number(row.variant?.price_cents ?? row.addon.price_cents ?? 0),
        total_price_cents: row.total,
      }));

      const { error: addonError } = await supabase
        .from("tokama_reservation_addons")
        .insert(rows);

      if (addonError) {
        return NextResponse.json(
          { ok: false, message: addonError.message },
          { status: 500 }
        );
      }
    }

    try {
      await sendTokamaNewReservationPush({
        id: reservation.id,
        public_code: reservation.public_code,
        guest_name: body.guest_name,
      });
    } catch (pushError) {
      console.log("[TOKAMA PUSH] New reservation push failed", pushError);
    }

    let emailSent = false;
    let emailErrorMessage: string | null = null;
    let guestEmailSent = false;
    let hostEmailSent = false;

    try {
      const totalFormatted = formatMoney(totalEstimated, currency);

      const guestEmail = buildGuestEmail({
        locale: body.locale || "pl",
        guestName: body.guest_name,
        checkin: body.checkin,
        checkout: body.checkout,
        adults,
        children,
        housesCount,
        total: totalFormatted,
      });

      const hostEmail = buildHostEmail({
        guestName: body.guest_name,
        guestEmail: body.guest_email,
        guestPhone: body.guest_phone,
        checkin: body.checkin,
        checkout: body.checkout,
        adults,
        children,
        housesCount,
        total: totalFormatted,
      });

      const emailJobs: Array<{ kind: "guest" | "host"; promise: Promise<unknown> }> = [{
        kind: "guest",
        promise: sendTokamaEmail({
          to: body.guest_email,
          subject: guestEmail.subject,
          html: guestEmail.html,
          text: guestEmail.text,
        }),
      }];

      if (process.env.TOKAMA_HOST_EMAIL) {
        emailJobs.push({
          kind: "host",
          promise: sendTokamaEmail({
            to: process.env.TOKAMA_HOST_EMAIL,
            subject: hostEmail.subject,
            html: hostEmail.html,
            text: hostEmail.text,
          }),
        });
      }

      const results = await Promise.allSettled(emailJobs.map(job => job.promise));
      const failures: string[] = [];
      results.forEach((result, index) => {
        const kind = emailJobs[index].kind;
        if (result.status === "fulfilled") {
          if (kind === "guest") guestEmailSent = true;
          if (kind === "host") hostEmailSent = true;
        } else {
          failures.push(`${kind}: ${result.reason instanceof Error ? result.reason.message : "unknown error"}`);
        }
      });

      emailSent = guestEmailSent && (!process.env.TOKAMA_HOST_EMAIL || hostEmailSent);
      emailErrorMessage = failures.length ? failures.join(" | ") : null;
      if (failures.length) {
        console.error("[TOKAMA EMAIL] Booking notification failure", {
          reservationId: reservation.id,
          guestEmailSent,
          hostEmailSent,
          failures,
        });
      }

      if (emailSent) {
        await supabase
          .from("tokama_reservations")
          .update({ booking_email_sent_at: new Date().toISOString() })
          .eq("id", reservation.id);
      }
    } catch (emailError) {
      emailErrorMessage =
        emailError instanceof Error ? emailError.message : "Unknown email error.";

      console.error("TOKAMA booking email failed:", emailError);
    }

    return NextResponse.json({
      ok: true,
      reservation,
      discount: discount
        ? {
            code: discount.code,
            discountPercent,
            discountCents,
          }
        : null,
      emailSent,
      guestEmailSent,
      hostEmailSent,
      emailError: emailErrorMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}
