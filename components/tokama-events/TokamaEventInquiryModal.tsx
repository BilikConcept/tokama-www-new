"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./TokamaEventInquiryModal.module.css";

type Locale = "pl" | "en";

type Props = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

const copy = {
  pl: {
    title: <>Opowiedz nam<br />o swoim <em>wydarzeniu.</em></>,
    intro: "Odpowiemy z propozycją dopasowaną do terminu, liczby gości i charakteru spotkania.",
    close: "Zamknij formularz",
    name: "Imię i nazwisko",
    email: "Adres e-mail",
    phone: "Numer telefonu",
    type: "Rodzaj wydarzenia",
    date: "Planowany termin",
    guests: "Przybliżona liczba gości",
    message: "Napisz kilka słów o wydarzeniu",
    select: "Wybierz",
    options: ["Przyjęcie rodzinne", "Wesele", "Spotkanie firmowe", "Warsztaty lub retreat", "Inne"],
    send: "Wyślij zapytanie",
    sending: "Wysyłanie…",
    success: "Dziękujemy. Twoje zapytanie zostało wysłane.",
    error: "Nie udało się wysłać formularza. Spróbuj ponownie.",
  },
  en: {
    title: <>Tell us about<br />your <em>event.</em></>,
    intro: "We will respond with a proposal based on your date, group and plans.",
    close: "Close form",
    name: "Name",
    email: "Email address",
    phone: "Phone number",
    type: "Type of event",
    date: "Preferred date",
    guests: "Estimated number of guests",
    message: "Tell us a little about your event",
    select: "Select",
    options: ["Family celebration", "Wedding", "Company event", "Workshop or retreat", "Other"],
    send: "Send an inquiry",
    sending: "Sending…",
    success: "Thank you. Your inquiry has been sent.",
    error: "We could not send the form. Please try again.",
  },
} as const;

export function TokamaEventInquiryModal({ locale, open, onClose }: Props) {
  const t = copy[locale];
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/tokama-events/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Request failed");

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-inquiry-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t.close}>
          <span />
          <span />
        </button>

        <div className={styles.intro}>
          <h2 id="event-inquiry-heading">{t.title}</h2>
          <p>{t.intro}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.honeypot} name="website" tabIndex={-1} autoComplete="off" />

          <label className={styles.field}>
            <span>{t.name}</span>
            <input name="name" autoComplete="name" required />
          </label>

          <label className={styles.field}>
            <span>{t.email}</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label className={styles.field}>
            <span>{t.phone}</span>
            <input name="phone" type="tel" autoComplete="tel" />
          </label>

          <label className={styles.field}>
            <span>{t.type}</span>
            <select name="eventType" defaultValue="">
              <option value="" disabled>{t.select}</option>
              {t.options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <label className={styles.field}>
            <span>{t.date}</span>
            <input name="eventDate" type="date" />
          </label>

          <label className={styles.field}>
            <span>{t.guests}</span>
            <input name="guests" type="number" min="1" />
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>{t.message}</span>
            <textarea name="message" rows={5} required />
          </label>

          <div className={`${styles.formFooter} ${styles.fullWidth}`}>
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? t.sending : t.send}
            </button>

            {status === "success" ? <p className={styles.success}>{t.success}</p> : null}
            {status === "error" ? <p className={styles.error}>{t.error}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
