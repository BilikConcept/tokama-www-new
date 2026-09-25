"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./TokamaOnsiteDashboard.module.css";

type AddonVariant = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  pricingUnit: string;
};

type AvailableExtra = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  pricingUnit: string;
  showVariantPrices: boolean;
  allowDaySelection: boolean;
  daySelectionLabel: string | null;
  variants: AddonVariant[];
};

type ExtraSelection = {
  variantId: string;
  quantity: number;
  dates: string[];
};

type StayData = {
  house: { code: string; name: string };
  reservation: {
    code: string;
    guestName: string;
    checkin: string;
    checkout: string;
    nights: number;
    adults: number;
    children: number;
    currency: string;
    stayPriceCents: number;
    addonsPriceCents: number;
    totalEstimatedCents: number;
    payment: {
      status: string;
      label: string;
      balanceCents: number;
    };
  };
  reservationAddons: Array<{
    slug: string;
    name: string;
    variantName: string | null;
    quantity: number;
    selectedDates: string[];
    totalPriceCents: number;
  }>;
  availableExtras: AvailableExtra[];
  serviceRequests: Array<{
    code: string;
    kind: "housekeeping" | "guest_extras";
    status: string;
    totalCents: number;
    currency: string;
    requestedForDates: string[];
    createdAt: string;
  }>;
  kanzanOrders: Array<{
    code: string;
    status: string;
    totalCents: number;
    currency: string;
    createdAt: string;
  }>;
};

type Props = {
  houseCode: string;
};

function money(value: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function requestStatus(status: string) {
  const labels: Record<string, string> = {
    new: "Nowe zgłoszenie",
    seen: "Przyjęte przez gospodarza",
    confirmed: "Potwierdzone",
    completed: "Zrealizowane",
    cancelled: "Anulowane",
    saved_for_kanzan: "Przygotowane do wysłania",
    sent_to_kanzan: "Wysłane do restauracji",
    accepted_by_kanzan: "Przyjęte przez restaurację",
    ready: "Gotowe",
    delivered: "Dostarczone",
  };

  return labels[status] || "W trakcie";
}

function calculateExtraTotal(
  extra: AvailableExtra,
  selection: ExtraSelection,
  adults: number,
  children: number
) {
  const variant = extra.variants.find((item) => item.id === selection.variantId);
  const priceCents = variant?.priceCents ?? extra.priceCents;
  const unit = variant?.pricingUnit || extra.pricingUnit;
  const quantity = Math.max(1, selection.quantity);
  const serviceDays = Math.max(1, selection.dates.length);
  const guests = Math.max(1, adults) + Math.max(0, children);

  if (unit === "per_two_people_per_night") {
    return priceCents * quantity * serviceDays * Math.ceil(guests / 2);
  }

  if (unit === "per_night") return priceCents * quantity * serviceDays;
  if (unit === "per_adult") return priceCents * quantity * Math.max(1, adults) * serviceDays;
  if (unit === "per_child") return priceCents * quantity * Math.max(0, children) * serviceDays;
  if (unit === "per_guest" || unit === "per_person") return priceCents * quantity * guests * serviceDays;

  return priceCents * quantity;
}

export function TokamaOnsiteDashboard({ houseCode }: Props) {
  const [data, setData] = useState<StayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extraSelections, setExtraSelections] = useState<Record<string, ExtraSelection>>({});
  const [housekeepingNote, setHousekeepingNote] = useState("");
  const [extrasNote, setExtrasNote] = useState("");
  const [sending, setSending] = useState("");
  const [message, setMessage] = useState("");

  async function loadStay(silent = false) {
    if (!silent) setLoading(true);

    try {
      const response = await fetch(`/api/tokama-onsite/stay?house=${houseCode}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.message || "Sesja pobytu wygasła.");
        return;
      }

      setData(result);
      setError("");
    } catch {
      setError("Nie udało się pobrać informacji o pobycie.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadStay();
  }, [houseCode]);

  const availableDates = useMemo(() => {
    if (!data) return [];

    const start = new Date(`${data.reservation.checkin}T12:00:00`);
    const end = new Date(`${data.reservation.checkout}T12:00:00`);
    const today = isoDate(new Date());
    const dates: string[] = [];

    for (let cursor = start; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const value = isoDate(cursor);

      if (value >= today) dates.push(value);
    }

    return dates;
  }, [data]);

  const selectedExtras = useMemo(() => {
    if (!data) return [];

    return data.availableExtras
      .map((extra) => {
        const selection = extraSelections[extra.slug];

        if (!selection) return null;

        return {
          extra,
          selection,
          totalCents: calculateExtraTotal(
            extra,
            selection,
            data.reservation.adults,
            data.reservation.children
          ),
        };
      })
      .filter(Boolean) as Array<{
      extra: AvailableExtra;
      selection: ExtraSelection;
      totalCents: number;
    }>;
  }, [data, extraSelections]);

  const extrasTotalCents = selectedExtras.reduce((sum, item) => sum + item.totalCents, 0);

  function toggleExtra(extra: AvailableExtra) {
    setExtraSelections((current) => {
      if (current[extra.slug]) {
        const next = { ...current };
        delete next[extra.slug];
        return next;
      }

      return {
        ...current,
        [extra.slug]: {
          variantId: extra.variants[0]?.id || "",
          quantity: 1,
          dates: availableDates[0] ? [availableDates[0]] : [],
        },
      };
    });
  }

  function updateExtra(extraSlug: string, patch: Partial<ExtraSelection>) {
    setExtraSelections((current) => {
      const selected = current[extraSlug];

      if (!selected) return current;

      return {
        ...current,
        [extraSlug]: {
          ...selected,
          ...patch,
        },
      };
    });
  }

  function toggleDate(extraSlug: string, date: string) {
    setExtraSelections((current) => {
      const selected = current[extraSlug];

      if (!selected) return current;

      const dates = selected.dates.includes(date)
        ? selected.dates.filter((item) => item !== date)
        : [...selected.dates, date].sort();

      return {
        ...current,
        [extraSlug]: {
          ...selected,
          dates,
        },
      };
    });
  }

  async function submitHousekeeping(service: string) {
    if (sending) return;

    setSending(service);
    setMessage("");

    try {
      const response = await fetch("/api/tokama-onsite/service-requests", {
        credentials: "include",
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          house: houseCode,
          kind: "housekeeping",
          housekeepingService: service,
          note: housekeepingNote,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setMessage(result?.message || "Nie udało się wysłać zgłoszenia.");
        return;
      }

      setHousekeepingNote("");
      setMessage(`Zgłoszenie ${result.request.code} zostało wysłane do gospodarza.`);
      await loadStay(true);
    } catch {
      setMessage("Nie udało się wysłać zgłoszenia.");
    } finally {
      setSending("");
    }
  }

  async function submitExtras() {
    if (!selectedExtras.length || sending) return;

    setSending("extras");
    setMessage("");

    try {
      const response = await fetch("/api/tokama-onsite/service-requests", {
        credentials: "include",
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          house: houseCode,
          kind: "guest_extras",
          note: extrasNote,
          items: selectedExtras.map(({ extra, selection }) => ({
            slug: extra.slug,
            variantId: selection.variantId,
            quantity: selection.quantity,
            selectedDates: selection.dates,
          })),
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setMessage(result?.message || "Nie udało się wysłać zgłoszenia.");
        return;
      }

      setExtraSelections({});
      setExtrasNote("");
      setMessage(
        `Zgłoszenie ${result.request.code} zostało wysłane. Szacunkowa kwota: ${money(result.request.totalCents, result.request.currency)}.`
      );
      await loadStay(true);
    } catch {
      setMessage("Nie udało się wysłać zgłoszenia.");
    } finally {
      setSending("");
    }
  }

  if (loading) {
    return <main className={styles.page}><p className={styles.loading}>Ładujemy Twój pobyt…</p></main>;
  }

  if (error || !data) {
    return (
      <main className={styles.page}>
        <section className={styles.errorScreen}>
          <h1>Nie udało się<br />otworzyć <em>pobytu.</em></h1>
          <p>{error || "Sesja pobytu wygasła."}</p>
          <a href={`/pobyt/${houseCode.toLowerCase()}`}>Wróć do weryfikacji</a>
        </section>
      </main>
    );
  }

  const { reservation } = data;

  return (
    <main className={styles.page}>
      <section className={styles.dashboard}>
        <header className={styles.header}>
          <p className={styles.kicker}>TOKAMA · DOMEK {data.house.code}</p>
          <h1>Twój czas<br /><em>nad jeziorem.</em></h1>
          <p>
            Witaj, {reservation.guestName}. Tutaj znajdziesz najważniejsze informacje
            o swoim pobycie i możesz zamówić usługi bez kontaktu telefonicznego.
          </p>
        </header>

        <nav className={styles.nav} aria-label="Panel pobytu">
          <a href="#moj-pobyt">Mój pobyt</a>
          <a href="#uslugi">Usługi w domku</a>
          <a href="#dodatki">Śniadanie i piknik</a>
          <a href="#kanzan">KANZAN</a>
        </nav>

        <section id="moj-pobyt" className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Mój pobyt</p>
            <h2>Wszystko w jednym<br /><em>miejscu.</em></h2>
          </div>

          <div className={styles.stayOverview}>
            <div className={styles.stayFacts}>
              <span><small>Numer rezerwacji</small><b>{reservation.code}</b></span>
              <span><small>Termin</small><b>{formatDate(reservation.checkin)} — {formatDate(reservation.checkout)}</b></span>
              <span><small>Domek</small><b>{data.house.name || data.house.code}</b></span>
              <span><small>Goście</small><b>{reservation.adults} dorosłych{reservation.children ? ` · ${reservation.children} dzieci` : ""}</b></span>
            </div>

            <aside className={styles.payment}>
              <p>Podsumowanie rezerwacji</p>
              <span><i>Pobyt</i><b>{money(reservation.stayPriceCents, reservation.currency)}</b></span>
              {reservation.addonsPriceCents ? (
                <span><i>Dodatki wybrane wcześniej</i><b>{money(reservation.addonsPriceCents, reservation.currency)}</b></span>
              ) : null}
              <span className={styles.total}><i>Łącznie</i><b>{money(reservation.totalEstimatedCents, reservation.currency)}</b></span>
              <div className={styles.paymentStatus}>
                <small>{reservation.payment.label}</small>
                <strong>
                  {reservation.payment.balanceCents
                    ? `Do uregulowania: ${money(reservation.payment.balanceCents, reservation.currency)}`
                    : "Brak należności"}
                </strong>
              </div>
            </aside>
          </div>

          {data.reservationAddons.length ? (
            <div className={styles.previousAddons}>
              <p>Wybrane dodatki</p>
              {data.reservationAddons.map((addon, index) => (
                <span key={`${addon.slug}-${index}`}>
                  <i>{addon.quantity} × {addon.name}{addon.variantName ? ` · ${addon.variantName}` : ""}</i>
                  <b>{money(addon.totalPriceCents, reservation.currency)}</b>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section id="uslugi" className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Usługi w domku</p>
            <h2>Potrzebujesz<br /><em>pomocy?</em></h2>
            <p>Wyślij krótkie zgłoszenie, a gospodarz je otrzyma.</p>
          </div>

          <div className={styles.housekeeping}>
            <label className={styles.note}>
              <span>Opcjonalna wiadomość do gospodarza</span>
              <textarea
                rows={3}
                value={housekeepingNote}
                onChange={(event) => setHousekeepingNote(event.target.value)}
                placeholder="Np. proszę o wymianę po godzinie 13:00"
              />
            </label>

            <div className={styles.serviceActions}>
              <button type="button" onClick={() => submitHousekeeping("towel_change")} disabled={Boolean(sending)}>
                <strong>Wymiana ręczników</strong>
                <span>{sending === "towel_change" ? "Wysyłanie…" : "Wyślij zgłoszenie →"}</span>
              </button>
              <button type="button" onClick={() => submitHousekeeping("extra_towels")} disabled={Boolean(sending)}>
                <strong>Dodatkowe ręczniki</strong>
                <span>{sending === "extra_towels" ? "Wysyłanie…" : "Wyślij zgłoszenie →"}</span>
              </button>
              <button type="button" onClick={() => submitHousekeeping("supplies")} disabled={Boolean(sending)}>
                <strong>Uzupełnienie środków</strong>
                <span>{sending === "supplies" ? "Wysyłanie…" : "Wyślij zgłoszenie →"}</span>
              </button>
            </div>
          </div>
        </section>

        <section id="dodatki" className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Śniadanie i piknik</p>
            <h2>Smakuj poranek<br /><em>bez pośpiechu.</em></h2>
            <p>Wybierz dodatki oraz dzień realizacji. Gospodarz potwierdzi dostępność.</p>
          </div>

          <div className={styles.extraList}>
            {data.availableExtras.map((extra) => {
              const selection = extraSelections[extra.slug];
              const variant = extra.variants.find((item) => item.id === selection?.variantId);
              const visiblePrice = variant?.priceCents ?? extra.priceCents;

              return (
                <article key={extra.slug} className={styles.extra}>
                  <button
                    type="button"
                    className={styles.extraToggle}
                    onClick={() => toggleExtra(extra)}
                  >
                    <span>
                      <strong>{extra.name}</strong>
                      {extra.description ? <small>{extra.description}</small> : null}
                    </span>
                    <b>{selection ? "−" : "+"}</b>
                  </button>

                  <p>{money(visiblePrice, reservation.currency)} <span>za 2 osoby / wybrany dzień</span></p>

                  {selection ? (
                    <div className={styles.extraOptions}>
                      {extra.variants.length > 1 ? (
                        <div className={styles.variants}>
                          {extra.variants.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={selection.variantId === item.id ? styles.variantActive : ""}
                              onClick={() => updateExtra(extra.slug, { variantId: item.id })}
                            >
                              <strong>{item.name}</strong>
                              {item.description ? <small>{item.description}</small> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className={styles.datePicker}>
                        <p>{extra.daySelectionLabel || "Wybierz dzień realizacji."}</p>
                        <div>
                          {availableDates.map((date) => (
                            <button
                              key={date}
                              type="button"
                              className={selection.dates.includes(date) ? styles.dateActive : ""}
                              onClick={() => toggleDate(extra.slug, date)}
                            >
                              {formatDate(date)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.quantity}>
                        <button
                          type="button"
                          onClick={() => updateExtra(extra.slug, { quantity: Math.max(1, selection.quantity - 1) })}
                        >
                          −
                        </button>
                        <b>{selection.quantity}</b>
                        <button
                          type="button"
                          onClick={() => updateExtra(extra.slug, { quantity: Math.min(10, selection.quantity + 1) })}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {selectedExtras.length ? (
            <div className={styles.extrasSummary}>
              <label className={styles.note}>
                <span>Uwagi do śniadania lub pikniku</span>
                <textarea
                  rows={3}
                  value={extrasNote}
                  onChange={(event) => setExtrasNote(event.target.value)}
                  placeholder="Np. proszę o dostarczenie na taras"
                />
              </label>

              <div>
                <span>Szacunkowa kwota</span>
                <strong>{money(extrasTotalCents, reservation.currency)}</strong>
              </div>

              <button type="button" className={styles.submit} onClick={submitExtras} disabled={Boolean(sending)}>
                {sending === "extras" ? "Wysyłanie…" : "Wyślij zgłoszenie do gospodarza"}
              </button>
            </div>
          ) : null}
        </section>

        <section id="kanzan" className={`${styles.section} ${styles.kanzan}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>KANZAN Food & Cocktails</p>
            <h2>Jedzenie<br /><em>do domku.</em></h2>
            <p>
              Dania objęte są rabatem 10% dla gości TOKAMA. Napoje nie są objęte rabatem, a dostawa jest gratis.
            </p>
          </div>

          <a href={`/pobyt/${houseCode.toLowerCase()}/menu`} className={styles.kanzanLink}>
            <span>Otwórz menu KANZAN</span>
            <b>→</b>
          </a>

          {data.kanzanOrders.length ? (
            <div className={styles.requestHistory}>
              <p>Twoje zamówienia KANZAN</p>
              {data.kanzanOrders.map((order) => (
                <span key={order.code}>
                  <i>{order.code} · {requestStatus(order.status)}</i>
                  <b>{money(order.totalCents, order.currency)}</b>
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {data.serviceRequests.length ? (
          <section className={`${styles.section} ${styles.history}`}>
            <div className={styles.sectionHeading}>
              <p className={styles.kicker}>Historia</p>
              <h2>Twoje<br /><em>zgłoszenia.</em></h2>
            </div>

            <div className={styles.requestHistory}>
              {data.serviceRequests.map((request) => (
                <span key={request.code}>
                  <i>
                    {request.kind === "housekeeping" ? "Usługa w domku" : "Śniadanie / piknik"}
                    {" · "}{requestStatus(request.status)}
                  </i>
                  <b>{request.totalCents ? money(request.totalCents, request.currency) : "—"}</b>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </main>
  );
}
