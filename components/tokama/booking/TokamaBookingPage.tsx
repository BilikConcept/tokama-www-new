"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  calculateDynamicStayPrice,
  formatMoney,
  getHousesNeeded,
  getNights,
  type BookingSettings,
} from "@/lib/tokama/pricing";
import {
  calculateDiscountCents,
  normalizeDiscountCode,
} from "@/lib/tokama/discounts";
import {
  TOKAMA_PRIVACY_PATH,
  TOKAMA_PRIVACY_VERSION,
  TOKAMA_TERMS_PATH,
  TOKAMA_TERMS_VERSION,
} from "@/lib/tokama/legal";
import { TokamaDateRangePicker } from "./TokamaDateRangePicker";
import styles from "./TokamaBookingPage.module.css";

type Locale = "pl" | "en";
type BookingPackage = {
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  short_description: string;
  package_price_cents: number | null;
  currency: string;
  min_nights: number;
  max_guests: number | null;
  booking_note: string;
};

const content = {
  pl: {
    kicker: "Rezerwacja",
    title: (
      <>
        Zaplanuj swój <em>pobyt</em>.
      </>
    ),
    intro:
      "Wybierz termin, liczbę gości i dodatki. Zobaczysz wyliczoną cenę pobytu, a po wysłaniu prośby host potwierdzi dostępność i wyśle link do płatności.",
    dates: "Termin",
    guests: "Goście",
    details: "Dane gościa",
    checkin: "Przyjazd",
    checkout: "Wyjazd",
    adults: "Dorośli",
    children: "Dzieci",
    name: "Imię i nazwisko",
    email: "Email",
    phone: "Telefon",
    message: "Wiadomość opcjonalna",
    messagePlaceholder: "Napisz, jeśli chcesz dodać coś do rezerwacji.",
    addons: "Opcje dodatkowe",
    summary: "Twój pobyt",
    houses: "Domki",
    nights: "Noce",
    stay: "Pobyt",
    extras: "Dodatki",
    total: "Razem",
    minimumStay: "Minimalna liczba dób",
    submit: "Wyślij prośbę o rezerwację — z obowiązkiem zapłaty",
    success: "Prośba została wysłana. Host potwierdzi rezerwację i wyśle link do płatności.",
    error: "Nie udało się wysłać prośby. Sprawdź dane i spróbuj ponownie.",
    paymentInfo: "Płatność wykonasz dopiero po akceptacji terminu przez hosta.",
    onsiteExtras:
      "Śniadanie, piknik, sushi i inne opcje dodatkowe zamówisz wygodnie już podczas pobytu.",
    processRequest: "Prośba",
    processApproval: "Akceptacja hosta",
    processPayment: "Płatność",
    decrease: "Zmniejsz",
    increase: "Zwiększ",
    perStay: "za pobyt",
    perNight: "za noc",
    perHouse: "za domek / pobyt",
    perPersonNight: "za osobę / noc",
    discountCode: "Kod rabatowy",
    discountPlaceholder: "Wpisz kod",
    applyDiscount: "Zastosuj",
    applyingDiscount: "Sprawdzam...",
    discountApplied: "Kod został zastosowany",
    invalidDiscount: "Kod jest nieprawidłowy, nieaktywny lub wygasł.",
    discount: "Rabat",
    filmCaption: "TOKAMA · NAD JEZIOREM",
  },
  en: {
    kicker: "Booking",
    title: (
      <>
        Plan your <em>stay</em>.
      </>
    ),
    intro:
      "Choose your dates, number of guests and extras. You will see the calculated stay price, and after sending the request, the host will confirm availability and send a payment link.",
    dates: "Dates",
    guests: "Guests",
    details: "Guest details",
    checkin: "Check-in",
    checkout: "Check-out",
    adults: "Adults",
    children: "Children",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    message: "Optional message",
    messagePlaceholder: "Add anything you would like us to know about your stay.",
    addons: "Additional options",
    summary: "Your stay",
    houses: "Houses",
    nights: "Nights",
    stay: "Stay",
    extras: "Extras",
    total: "Total",
    minimumStay: "Minimum stay",
    submit: "Send booking request — with obligation to pay",
    success: "Your request has been sent. The host will confirm it and send a payment link.",
    error: "Could not send the request. Please check the details and try again.",
    paymentInfo: "Payment is due only after the host accepts your dates.",
    onsiteExtras:
      "Breakfast, picnic baskets, sushi and other extras can be ordered during your stay.",
    processRequest: "Request",
    processApproval: "Host approval",
    processPayment: "Transfer details",
    decrease: "Decrease",
    increase: "Increase",
    perStay: "per stay",
    perNight: "per night",
    perHouse: "per house / stay",
    perPersonNight: "per person / night",
    discountCode: "Discount code",
    discountPlaceholder: "Enter code",
    applyDiscount: "Apply",
    applyingDiscount: "Checking...",
    discountApplied: "Discount code applied",
    invalidDiscount: "The code is invalid, inactive or expired.",
    discount: "Discount",
    filmCaption: "TOKAMA · BY THE LAKE",
  },
};

const fallbackSettings: BookingSettings = {
  currency: "PLN",
  base_price_per_house_per_night_cents: 120000,
  min_nights: 2,
  max_adults_per_house: 7,
  houses_total: 3,
  is_booking_open: true,
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}


function getFiniteNumber(value: unknown, fallback: number) {
  const nextValue = Number(value);

  return Number.isFinite(nextValue) ? nextValue : fallback;
}

const PHONE_COUNTRY_CODES = [
  { code: "+48", label: "Poland", flag: "PL" },
  { code: "+49", label: "Germany", flag: "DE" },
  { code: "+44", label: "United Kingdom", flag: "UK" },
  { code: "+31", label: "Netherlands", flag: "NL" },
  { code: "+33", label: "France", flag: "FR" },
  { code: "+34", label: "Spain", flag: "ES" },
  { code: "+39", label: "Italy", flag: "IT" },
  { code: "+47", label: "Norway", flag: "NO" },
  { code: "+46", label: "Sweden", flag: "SE" },
  { code: "+45", label: "Denmark", flag: "DK" },
  { code: "+354", label: "Iceland", flag: "IS" },
  { code: "+1", label: "United States / Canada", flag: "US" },
];

function normalizePhone(countryCode: string, phone: string) {
  const cleanCountryCode = countryCode.replace(/[^+0-9]/g, "");
  const cleanPhone = phone.replace(/[^0-9]/g, "");

  if (!cleanPhone) return "";

  return `${cleanCountryCode}${cleanPhone}`;
}


function formatDate(value: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}.${month}.${year}`;
}

function polishNightLabel(nights: number) {
  if (nights === 1) return "noc";
  if (nights >= 2 && nights <= 4) return "noce";
  return "nocy";
}

export function TokamaBookingPage({ locale = "pl" }: { locale?: Locale }) {
  const params = useSearchParams();
  const t = content[locale];
  const packageSlug = params.get("package") || "";

  const [settings, setSettings] = useState<BookingSettings>(fallbackSettings);
  const [dateSignals, setDateSignals] = useState<Record<string, { level: "calm" | "popular" | "hot"; available_houses: number; price_cents: number }>>({});
  const [selectedPackage, setSelectedPackage] = useState<BookingPackage | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [availabilitySuggestions, setAvailabilitySuggestions] = useState<
    { checkin: string; checkout: string }[]
  >([]);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [submittedReservationCode, setSubmittedReservationCode] = useState<string | null>(null);

  const [checkin, setCheckin] = useState(params.get("checkin") || "");
  const [checkout, setCheckout] = useState(params.get("checkout") || "");
  const [adults, setAdults] = useState(
    clampNumber(Number(params.get("adults") || 2), 1, 21)
  );
  const [children, setChildren] = useState(
    clampNumber(Number(params.get("children") || 0), 0, 30)
  );

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+48");
  const [guestMessage, setGuestMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountStatus, setDiscountStatus] = useState<
    "idle" | "loading" | "applied" | "error"
  >("idle");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountPercent: number;
  } | null>(null);

  useEffect(() => {
    async function loadBookingData() {
      const [settingsResponse, packageResponse, heatResponse] = await Promise.all([
        fetch("/api/tokama-booking/settings"),
        packageSlug ? fetch(`/api/tokama-booking/package?slug=${encodeURIComponent(packageSlug)}`) : Promise.resolve(null),
        fetch("/api/tokama-booking/calendar-heat"),
      ]);
      const settingsData = await settingsResponse.json();
      setSettings(settingsData.settings);
      if (packageResponse?.ok) {
        const packageData = await packageResponse.json();
        setSelectedPackage(packageData.package || null);
      }
      if (heatResponse.ok) {
        const heatData = await heatResponse.json();
        setDateSignals(Object.fromEntries((heatData.signals || []).map((signal: { date: string; level: "calm" | "popular" | "hot"; available_houses: number; price_cents: number }) => [signal.date, signal])));
      }
    }

    void loadBookingData();
  }, [packageSlug]);

  const nights = useMemo(() => getNights(checkin, checkout), [checkin, checkout]);
  const housesNeeded = useMemo(
    () => getHousesNeeded(adults, settings.max_adults_per_house),
    [adults, settings.max_adults_per_house]
  );
  const stayPrice = useMemo(() => {
    const packagePrice = Number(selectedPackage?.package_price_cents || 0);
    return packagePrice > 0
      ? packagePrice * housesNeeded
      : calculateDynamicStayPrice({
          checkin,
          checkout,
          housesCount: housesNeeded,
          basePriceCents: settings.base_price_per_house_per_night_cents,
          rules: settings.pricing_rules,
        }).totalCents;
  }, [checkin, checkout, housesNeeded, settings.base_price_per_house_per_night_cents, settings.pricing_rules, selectedPackage?.package_price_cents]);

  const discountCents = useMemo(
    () =>
      calculateDiscountCents(
        stayPrice,
        appliedDiscount?.discountPercent || 0
      ),
    [stayPrice, appliedDiscount?.discountPercent]
  );
  const total = Math.max(0, stayPrice - discountCents);
  const effectiveMinNights = Math.max(settings.min_nights, selectedPackage?.min_nights || 1);
  const isBelowMinNights = nights > 0 && nights < effectiveMinNights;
  const packageDurationMismatch = Boolean(
    selectedPackage && nights > 0 && nights !== selectedPackage.min_nights
  );
  const tooManyGuests = housesNeeded > settings.houses_total;
  const maxAdults = settings.houses_total * settings.max_adults_per_house;

  function decreaseAdults() {
    setAdults((value) => {
      const currentValue = getFiniteNumber(value, 1);
      const limit = getFiniteNumber(maxAdults, 21);

      return clampNumber(currentValue - 1, 1, limit);
    });
  }

  function increaseAdults() {
    setAdults((value) => {
      const currentValue = getFiniteNumber(value, 1);
      const limit = getFiniteNumber(maxAdults, 21);

      return clampNumber(currentValue + 1, 1, limit);
    });
  }

  function decreaseChildren() {
    setChildren((value) => {
      const currentValue = getFiniteNumber(value, 0);

      return clampNumber(currentValue - 1, 0, 30);
    });
  }

  function increaseChildren() {
    setChildren((value) => {
      const currentValue = getFiniteNumber(value, 0);

      return clampNumber(currentValue + 1, 0, 30);
    });
  }

  const safeAdults = Number.isFinite(adults) ? adults : 1;
  const safeChildren = Number.isFinite(children) ? children : 0;

  async function handleApplyDiscount() {
    const normalizedCode = normalizeDiscountCode(discountCode);

    setDiscountCode(normalizedCode);
    setDiscountError(null);

    if (!normalizedCode) {
      setAppliedDiscount(null);
      setDiscountStatus("error");
      setDiscountError(t.invalidDiscount);
      return;
    }

    setDiscountStatus("loading");

    try {
      const response = await fetch("/api/tokama-booking/discount-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode, checkin }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true || !result?.discount) {
        setAppliedDiscount(null);
        setDiscountStatus("error");
        setDiscountError(result?.message || t.invalidDiscount);
        return;
      }

      setDiscountCode(result.discount.code);
      setAppliedDiscount({
        code: result.discount.code,
        discountPercent: Number(result.discount.discountPercent),
      });
      setDiscountStatus("applied");
    } catch {
      setAppliedDiscount(null);
      setDiscountStatus("error");
      setDiscountError(t.invalidDiscount);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!termsAccepted || !privacyAcknowledged) {
      setSubmitStatus("error");
      setSubmitErrorMessage(
        locale === "pl"
          ? "Zaakceptuj Regulamin rezerwacji i potwierdź zapoznanie się z Polityką prywatności."
          : "Accept the booking terms and confirm that you have read the privacy notice."
      );
      return;
    }

    if (packageDurationMismatch) {
      setSubmitStatus("error");
      setSubmitErrorMessage(
        locale === "pl"
          ? `Ten pakiet obejmuje dokładnie ${selectedPackage?.min_nights} ${polishNightLabel(selectedPackage?.min_nights || 0)}. Jeśli chcesz przedłużyć pobyt, skontaktuj się z hostem.`
          : `This package is available for exactly ${selectedPackage?.min_nights} nights. To extend your stay, please contact the host.`
      );
      return;
    }

    setSubmitStatus("loading");
    setSubmitErrorMessage(null);
    setAvailabilitySuggestions([]);
    setAvailabilityModalOpen(false);

    const payload = {
      locale,
      checkin,
      checkout,
      adults: safeAdults,
      children: safeChildren,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: normalizePhone(phoneCountryCode, guestPhone),
      guest_message: guestMessage,
      discount_code: appliedDiscount?.code || undefined,
      package_slug: selectedPackage?.slug || undefined,
      terms_accepted: termsAccepted,
      terms_version: TOKAMA_TERMS_VERSION,
      privacy_acknowledged: privacyAcknowledged,
      privacy_version: TOKAMA_PRIVACY_VERSION,
      addons: [],
    };

    const response = await fetch("/api/tokama-booking/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || result?.ok !== true) {
      const suggestions = Array.isArray(result?.suggestions)
        ? result.suggestions
        : [];

      setSubmitErrorMessage(result?.message || t.error);
      setSubmitStatus("error");

      if (result?.code === "NO_AVAILABLE_HOUSES" && suggestions.length) {
        setAvailabilitySuggestions(suggestions);
        setAvailabilityModalOpen(true);
      }

      return;
    }

    setSubmitErrorMessage(null);
    setAvailabilitySuggestions([]);
    setAvailabilityModalOpen(false);
    setSubmittedReservationCode(result?.reservation?.public_code || null);
    setSubmitStatus("success");
  }

  if (submitStatus === "success") {
    const isEnglish = locale === "en";

    return (
      <main className={styles.page}>
        <section className={styles.successScreen}>
          <div className={styles.successCard}>
            <div className={styles.successMarkWrap} aria-hidden="true">
              <div className={styles.successMark}>
                <span />
              </div>
            </div>

            <p className={styles.successKicker}>
              {isEnglish ? "Request sent" : "Prośba wysłana"}
            </p>

            <h1 className={styles.successTitle}>
              {isEnglish
                ? "Your reservation request has been sent."
                : "Twoja prośba o rezerwację została wysłana."}
            </h1>

            {submittedReservationCode ? (
              <div className={styles.successReservationCode}>
                <span>{isEnglish ? "Reservation number" : "Numer rezerwacji"}</span>
                <strong>{submittedReservationCode}</strong>
              </div>
            ) : null}

            <p className={styles.successText}>
              {isEnglish
                ? "The host will verify availability and contact you with the next step. Payment is not required yet."
                : "Host zweryfikuje dostępność i skontaktuje się z Tobą z kolejnym krokiem. Płatność nie jest jeszcze wymagana."}
            </p>

            <div className={styles.successActions}>
              <a
                href={isEnglish ? "/en" : "/"}
                className={styles.successPrimary}
              >
                {isEnglish ? "Back to homepage" : "Wróć do strony głównej"}
              </a>

              <a
                href={isEnglish ? "/en/book" : "/rezerwacja"}
                className={styles.successSecondary}
              >
                {isEnglish ? "Make another reservation" : "Zrób kolejną rezerwację"}
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.bookingHero}>
        <div className={styles.editorial}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1>{t.title}</h1>
          <p className={styles.intro}>{t.intro}</p>

          <div className={styles.bookingFilm}>
            <video autoPlay muted loop playsInline preload="metadata">
              <source src="/desktop/main-hero.mp4" type="video/mp4" />
            </video>
            <div className={styles.bookingFilmShade} />
            <span>{t.filmCaption}</span>
          </div>

          <div className={styles.process}>
            <span>01 / {t.processRequest}</span>
            <span>02 / {t.processApproval}</span>
            <span>03 / {t.processPayment}</span>
          </div>
        </div>

        <form className={styles.bookingPanel} onSubmit={handleSubmit}>
          {selectedPackage ? (
            <div className={styles.packageNotice}>
              <span>{selectedPackage.eyebrow || "PAKIET TOKAMA"}</span>
              <strong>{selectedPackage.name}</strong>
              <p>{selectedPackage.booking_note || selectedPackage.short_description}</p>
            </div>
          ) : null}
          <div className={styles.panelSection}>
            <p className={styles.sectionLabel}>{t.dates}</p>

            <TokamaDateRangePicker
              locale={locale}
              checkin={checkin}
              checkout={checkout}
              minNights={effectiveMinNights}
              exactNights={selectedPackage?.min_nights}
              onCheckinChange={setCheckin}
              onCheckoutChange={setCheckout}
              dateSignals={dateSignals}
            />
          </div>

          <div className={styles.panelSection}>
            <p className={styles.sectionLabel}>{t.guests}</p>

            <div className={styles.counterGrid}>
              <div className={styles.counterCard}>
                <input type="hidden" name="adults" value={String(safeAdults)} />
                <span>{t.adults}</span>

                <div className={styles.counterControl}>
                  <button type="button" onClick={decreaseAdults} aria-label={`${t.decrease} ${t.adults}`}>
                    −
                  </button>
                  <strong>{safeAdults}</strong>
                  <button type="button" onClick={increaseAdults} aria-label={`${t.increase} ${t.adults}`}>
                    +
                  </button>
                </div>
              </div>

              <div className={styles.counterCard}>
                <input type="hidden" name="children" value={String(safeChildren)} />
                <span>{t.children}</span>

                <div className={styles.counterControl}>
                  <button type="button" onClick={decreaseChildren} aria-label={`${t.decrease} ${t.children}`}>
                    −
                  </button>
                  <strong>{safeChildren}</strong>
                  <button type="button" onClick={increaseChildren} aria-label={`${t.increase} ${t.children}`}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.priceCard}>
            <p className={styles.priceLabel}>{t.summary}</p>

            <strong className={styles.totalPrice}>
              {packageDurationMismatch ? "—" : formatMoney(total, settings.currency)}
            </strong>

            <div className={styles.pricePills}>
              <span>
                {t.nights}: <b>{nights || "—"}</b>
              </span>
              <span>
                {t.houses}: <b>{Number.isFinite(Number(housesNeeded)) ? Number(housesNeeded) : 1}</b>
              </span>
              <span>
                {t.stay}:{" "}
                <b>
                  {packageDurationMismatch
                    ? "—"
                    : formatMoney(Number.isFinite(Number(stayPrice)) ? Number(stayPrice) : 0, settings.currency)}
                </b>
              </span>
              {appliedDiscount ? (
                <span>
                  {t.discount}: <b>-{formatMoney(discountCents, settings.currency)}</b>
                </span>
              ) : null}
            </div>

            <div className={styles.discountBox}>
              <label className={styles.discountLabel} htmlFor="discount-code">
                {t.discountCode}
              </label>
              <div className={styles.discountRow}>
                <input
                  id="discount-code"
                  className={styles.discountInput}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={32}
                  placeholder={t.discountPlaceholder}
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value.toUpperCase());
                    setAppliedDiscount(null);
                    setDiscountStatus("idle");
                    setDiscountError(null);
                  }}
                />
                <button
                  type="button"
                  className={styles.discountButton}
                  onClick={handleApplyDiscount}
                  disabled={discountStatus === "loading"}
                >
                  {discountStatus === "loading"
                    ? t.applyingDiscount
                    : t.applyDiscount}
                </button>
              </div>
              {discountStatus === "applied" && appliedDiscount ? (
                <p className={styles.discountFeedback}>
                  {t.discountApplied}: <b>{appliedDiscount.code}</b> (−{appliedDiscount.discountPercent}%)
                </p>
              ) : null}
              {discountStatus === "error" ? (
                <p className={`${styles.discountFeedback} ${styles.discountFeedbackError}`}>
                  {discountError || t.invalidDiscount}
                </p>
              ) : null}
            </div>

            <p className={styles.paymentInfo}>{t.paymentInfo}</p>
            <p className={styles.onsiteExtrasNotice}>{t.onsiteExtras}</p>

            {isBelowMinNights && (
              <p className={styles.warning}>
                {locale === "pl"
                  ? `Minimalna długość pobytu to ${effectiveMinNights} noce.`
                  : `Minimum stay is ${effectiveMinNights} nights.`}
              </p>
            )}

            {packageDurationMismatch && selectedPackage ? (
              <p className={styles.warning}>
                {locale === "pl" ? (
                  <>
                    Ten pakiet obejmuje dokładnie {selectedPackage.min_nights}{" "}
                    {polishNightLabel(selectedPackage.min_nights)}. Jeśli chcesz przedłużyć pobyt,
                    skontaktuj się z hostem: <a href="tel:+48604811474">+48 604 811 474</a> lub{" "}
                    <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>.
                  </>
                ) : (
                  <>
                    This package is available for exactly {selectedPackage.min_nights} nights. To extend
                    your stay, contact the host at <a href="tel:+48604811474">+48 604 811 474</a> or{" "}
                    <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>.
                  </>
                )}
              </p>
            ) : null}

            {tooManyGuests && (
              <p className={styles.warning}>
                {locale === "pl"
                  ? "Wybrana liczba dorosłych przekracza dostępność domków."
                  : "The selected number of adults exceeds house availability."}
              </p>
            )}
          </div>

          <div className={styles.panelSection}>
            <p className={styles.sectionLabel}>{t.details}</p>

            <div className={styles.guestFields}>
              <label className={styles.softField}>
                <span>{t.name}</span>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </label>

              <div className={styles.fieldsTwo}>
                <label className={styles.softField}>
                  <span>{t.email}</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                  />
                </label>

                <label className={styles.softField}>
                  <span>{t.phone}</span>
                  <div className={styles.phoneField}>
              <select
                className={styles.phoneCodeSelect}
                value={phoneCountryCode}
                onChange={(event) => setPhoneCountryCode(event.target.value)}
                aria-label={locale === "en" ? "Country code" : "Numer kierunkowy"}
              >
                {PHONE_COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.flag} {item.code}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                name="guest_phone"
                value={guestPhone}
                onChange={(event) => setGuestPhone(event.target.value)}
                placeholder={locale === "en" ? "Phone number" : "Numer telefonu"}
                required
              />
            </div>
</label>
              </div>

              <label className={styles.softField}>
                <span>{t.message}</span>
                <textarea
                  name="message"
                  placeholder={t.messagePlaceholder}
                  value={guestMessage}
                  onChange={(event) => setGuestMessage(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className={styles.legalPanel}>
            <div className={styles.legalHeading}>
              <span>{locale === "pl" ? "Przed wysłaniem" : "Before sending"}</span>
              <strong>{locale === "pl" ? "Warunki rezerwacji" : "Booking conditions"}</strong>
            </div>

            <label className={styles.legalConsent}>
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>
                {locale === "pl" ? (
                  <>
                    Akceptuję <Link href={TOKAMA_TERMS_PATH}>Regulamin rezerwacji</Link>,
                    w tym zasady płatności i anulowania. Przyjmuję do wiadomości, że pobyt jest usługą
                    zakwaterowania w oznaczonym terminie i nie przysługuje mi ustawowe 14-dniowe prawo
                    odstąpienia.
                  </>
                ) : (
                  <>
                    I accept the <Link href={TOKAMA_TERMS_PATH}>booking terms</Link>,
                    including payment and cancellation rules. I understand that a fixed-date accommodation
                    service is not covered by the statutory 14-day withdrawal right.
                  </>
                )}
              </span>
            </label>

            <label className={styles.legalConsent}>
              <input
                type="checkbox"
                required
                checked={privacyAcknowledged}
                onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
              />
              <span>
                {locale === "pl" ? (
                  <>Potwierdzam zapoznanie się z <Link href={TOKAMA_PRIVACY_PATH}>Polityką prywatności</Link>.</>
                ) : (
                  <>I confirm that I have read the <Link href={TOKAMA_PRIVACY_PATH}>privacy notice</Link>.</>
                )}
              </span>
            </label>

            <p className={styles.legalNotice}>
              {locale === "pl"
                ? "Wysłanie prośby oznacza obowiązek zapłaty dopiero po zaakceptowaniu terminu przez hosta. Na tym etapie środki nie są pobierane — otrzymasz ostateczną kwotę i bezpieczny link do płatności."
                : "Sending the request creates an obligation to pay only after the host accepts your dates. No funds are collected now — you will receive the final amount and a secure payment link."}
            </p>
          </div>

          <button
            type="submit"
            className={styles.submit}
            disabled={
              submitStatus === "loading" ||
              !checkin ||
              !checkout ||
              isBelowMinNights ||
              packageDurationMismatch ||
              tooManyGuests ||
              !termsAccepted ||
              !privacyAcknowledged
            }
          >
            {submitStatus === "loading" ? "..." : t.submit}
          </button>

          {(submitStatus as string) === "success" && <p className={styles.success}>{t.success}</p>}
          <div className={styles.bankTransferBanner}>
            <a
              className={styles.p24OfficialBanner}
              href="https://www.przelewy24.pl/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={locale === "en" ? "Przelewy24 official website" : "Oficjalna strona Przelewy24"}
            >
              <span className={styles.p24LogoWrap}>
                <Image
                  src="https://www.przelewy24.pl/themes/przelewy24/assets/img/base/przelewy24_logo_2022.svg"
                  alt="Przelewy24"
                  width={192}
                  height={67}
                  unoptimized
                />
              </span>
              <span className={styles.p24OfficialCopy}>
                <small>{locale === "en" ? "ONLINE PAYMENT OPERATOR" : "OPERATOR PŁATNOŚCI ONLINE"}</small>
                <strong>{locale === "en" ? "Secure payment handled by Przelewy24" : "Płatność bezpiecznie obsługiwana przez Przelewy24"}</strong>
              </span>
              <b aria-hidden="true">↗</b>
            </a>
            <div className={styles.bankTransferHeading}>
              <span>{locale === "en" ? "Payment after approval" : "Płatność po akceptacji"}</span>
              <strong>{locale === "en" ? "Secure payment with Przelewy24" : "Bezpieczna płatność Przelewy24"}</strong>
              <p>
                {locale === "en"
                  ? "The host will first confirm your dates and final amount. You will then receive a secure Przelewy24 payment link."
                  : "Host najpierw potwierdzi termin i ostateczną kwotę. Następnie otrzymasz bezpieczny link do płatności Przelewy24."}
              </p>
            </div>
            <div className={styles.paymentMethods} aria-label={locale === "en" ? "Available payment methods" : "Dostępne metody płatności"}>
              <span>BLIK</span>
              <span>{locale === "en" ? "Fast transfer" : "Szybki przelew"}</span>
              <span>{locale === "en" ? "Payment card" : "Karta płatnicza"}</span>
              <span>Apple Pay / Google Pay</span>
            </div>
            <small>
              {locale === "en"
                ? "No funds are collected when you send this booking request."
                : "Wysłanie prośby o rezerwację nie powoduje pobrania środków."}
            </small>
          </div>

          {submitStatus === "error" && (
            <p className={styles.warning}>{submitErrorMessage || t.error}</p>
          )}
        </form>
      </section>

      {availabilityModalOpen ? (
        <div className={styles.availabilityOverlay} role="dialog" aria-modal="true">
          <div className={styles.availabilityModal}>
            <button
              type="button"
              className={styles.availabilityClose}
              onClick={() => setAvailabilityModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>

            <p className={styles.availabilityKicker}>
              {locale === "en" ? "Availability" : "Dostępność"}
            </p>

            <h2>
              {locale === "en"
                ? "This date is no longer available."
                : "Ten termin nie jest już dostępny."}
            </h2>

            <p>
              {locale === "en"
                ? "Choose one of the nearest available dates below."
                : "Wybierz jeden z najbliższych dostępnych terminów poniżej."}
            </p>

            <div className={styles.availabilityDates}>
              {availabilitySuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.checkin}-${suggestion.checkout}`}
                  type="button"
                  className={styles.availabilityDate}
                  onClick={() => {
                    setCheckin(suggestion.checkin);
                    setCheckout(suggestion.checkout);
                    setAvailabilityModalOpen(false);
                    setSubmitStatus("idle");
                    setSubmitErrorMessage(null);
                  }}
                >
                  <span>
                    {formatDate(suggestion.checkin)} — {formatDate(suggestion.checkout)}
                  </span>
                  <strong>{locale === "en" ? "Choose" : "Wybierz"}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
