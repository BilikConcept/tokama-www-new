"use client";

import { useMemo, useState } from "react";
import styles from "./TokamaDateRangePicker.module.css";

type Locale = "pl" | "en";

type TokamaDateRangePickerProps = {
  locale: Locale;
  checkin: string;
  checkout: string;
  minNights: number;
  exactNights?: number;
  onCheckinChange: (value: string) => void;
  onCheckoutChange: (value: string) => void;
  dateSignals?: Record<string, { level: "calm" | "popular" | "hot"; available_houses: number; price_cents: number }>;
};

const content = {
  pl: {
    checkin: "Przyjazd",
    checkout: "Wyjazd",
    selectCheckin: "Wybierz dzień przyjazdu",
    selectCheckout: "Wybierz dzień wyjazdu",
    minStay: "Minimalny pobyt",
    exactStay: "Długość pakietu",
    nights: "noce",
    week: ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"],
    previous: "Poprzedni miesiąc",
    next: "Następny miesiąc",
    calm: "Spokojny termin", popular: "Popularny termin", hot: "Gorący termin",
  },
  en: {
    checkin: "Check-in",
    checkout: "Check-out",
    selectCheckin: "Choose check-in date",
    selectCheckout: "Choose check-out date",
    minStay: "Minimum stay",
    exactStay: "Package length",
    nights: "nights",
    week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    previous: "Previous month",
    next: "Next month",
    calm: "Calm dates", popular: "Popular dates", hot: "Hot dates",
  },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromIso(value: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatDate(value: string, locale: Locale) {
  const date = fromIso(value);

  if (!date) {
    return locale === "pl" ? "Wybierz datę" : "Choose date";
  }

  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonth(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];

  for (let i = 0; i < mondayBasedOffset; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function isBetween(dateIso: string, startIso: string, endIso: string) {
  return Boolean(startIso && endIso && dateIso > startIso && dateIso < endIso);
}

export function TokamaDateRangePicker({
  locale,
  checkin,
  checkout,
  minNights,
  exactNights,
  onCheckinChange,
  onCheckoutChange,
  dateSignals = {},
}: TokamaDateRangePickerProps) {
  const t = content[locale];

  const initialMonth = fromIso(checkin) || new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  const todayIso = useMemo(() => toIso(new Date()), []);

  const months = useMemo(
    () => [visibleMonth, addMonths(visibleMonth, 1)],
    [visibleMonth]
  );

  function handleSelect(dateIso: string) {
    if (exactNights) {
      const selectedDate = fromIso(dateIso);

      if (!selectedDate) return;

      onCheckinChange(dateIso);
      onCheckoutChange(toIso(addDays(selectedDate, exactNights)));
      return;
    }

    if (!checkin || checkout) {
      onCheckinChange(dateIso);
      onCheckoutChange("");
      return;
    }

    if (dateIso <= checkin) {
      onCheckinChange(dateIso);
      onCheckoutChange("");
      return;
    }

    onCheckoutChange(dateIso);
  }

  return (
    <div className={styles.wrap}>
      <input type="hidden" name="checkin" value={checkin} />
      <input type="hidden" name="checkout" value={checkout} />

      <div className={styles.selectedDates}>
        <div className={styles.selectedDate}>
          <span>{t.checkin}</span>
          <strong>{formatDate(checkin, locale)}</strong>
        </div>

        <div className={styles.selectedDate}>
          <span>{t.checkout}</span>
          <strong>{formatDate(checkout, locale)}</strong>
        </div>
      </div>

      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            aria-label={t.previous}
          >
            ←
          </button>

          <p>
            {checkin && !checkout ? t.selectCheckout : t.selectCheckin}
          </p>

          <button
            type="button"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            aria-label={t.next}
          >
            →
          </button>
        </div>

        <div className={styles.months}>
          {months.map((month) => (
            <div className={styles.month} key={month.toISOString()}>
              <h3>{formatMonth(month, locale)}</h3>

              <div className={styles.week}>
                {t.week.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className={styles.days}>
                {getCalendarDays(month).map((date, index) => {
                  if (!date) {
                    return <span className={styles.empty} key={`empty-${index}`} />;
                  }

                  const iso = toIso(date);
                  const disabled = iso < todayIso;
                  const isStart = iso === checkin;
                  const isEnd = iso === checkout;
                  const inRange = isBetween(iso, checkin, checkout);
                  const signal = dateSignals[iso];
                  const soldOutForArrival = signal?.available_houses === 0 && (!checkin || Boolean(checkout));

                  return (
                    <button
                      type="button"
                      key={iso}
                      disabled={disabled || soldOutForArrival}
                      title={signal ? `${signal.available_houses} / 3 · ${Math.round(signal.price_cents / 100)} PLN` : undefined}
                      onClick={() => handleSelect(iso)}
                      className={[
                        styles.day,
                        isStart ? styles.start : "",
                        isEnd ? styles.end : "",
                        inRange ? styles.range : "",
                        signal ? styles[signal.level] : "",
                      ].join(" ")}
                    >
                      <span>{date.getDate()}</span>{signal ? <i /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <span>
            {exactNights ? t.exactStay : t.minStay}: {exactNights || minNights} {t.nights}
          </span>
          <div className={styles.legend}><span><i className={styles.calm} />{t.calm}</span><span><i className={styles.popular} />{t.popular}</span><span><i className={styles.hot} />{t.hot}</span></div>
        </div>
      </div>
    </div>
  );
}
