"use client";

import { useState } from "react";
import { TokamaEventInquiryModal } from "./TokamaEventInquiryModal";
import styles from "./TokamaEventsPage.module.css";

type Locale = "pl" | "en";

type Props = {
  locale: Locale;
};

const content = {
  pl: {
    introTitle: <>Wydarzenia bliżej <em>natury.</em></>,
    introText:
      "TOKAMA tworzy kameralną oprawę dla ważnych spotkań — od rodzinnych uroczystości po warsztaty, wyjazdy zespołowe i spokojne weekendy z własnym programem.",
    videoTitle: <>Spotkania, które<br />mają swój <em>charakter.</em></>,
    videoText:
      "Przestrzeń rekreacyjno-integracyjna, trzy domki i natura wokół — wszystko w jednym miejscu, sześć kilometrów od Iławy.",
    contact: "Zapytaj o termin",
    detailsTitle: <>Dobra przestrzeń<br />na wspólny <em>czas.</em></>,
    details: [
      ["01", "Do 40 osób", "Przestrzeń rekreacyjno-integracyjna sprawdza się przy kameralnych przyjęciach, spotkaniach rodzinnych i wydarzeniach firmowych."],
      ["02", "Noclegi na miejscu", "Trzy całoroczne domki pozwalają przedłużyć spotkanie o spokojny wieczór i poranek nad jeziorem."],
      ["03", "Elastyczna oprawa", "Wyposażona kuchnia, nagłośnienie oraz catering dobierany do charakteru wydarzenia i liczby gości."],
    ],
    formTitle: <>Opowiedz nam<br />o swoim <em>wydarzeniu.</em></>,
    formText: "Odpowiemy z propozycją dopasowaną do terminu, liczby gości i charakteru spotkania.",
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
    introTitle: <>Events closer to <em>nature.</em></>,
    introText:
      "TOKAMA offers an intimate setting for important gatherings — from family celebrations to workshops, team getaways and hosted weekends.",
    videoTitle: <>Gatherings with<br />their own <em>character.</em></>,
    videoText:
      "An event room, three cottages and nature all around — six kilometres from Iława.",
    contact: "Ask about a date",
    detailsTitle: <>A good setting<br />for time <em>together.</em></>,
    details: [
      ["01", "Up to 40 guests", "The event room suits intimate celebrations, family gatherings and company events."],
      ["02", "Stay on site", "Three year-round cottages let your gathering continue into a quiet evening and morning by the lake."],
      ["03", "A flexible setting", "An equipped kitchen, sound system and catering tailored to your occasion and group."],
    ],
    formTitle: <>Tell us about<br />your <em>event.</em></>,
    formText: "We will respond with a proposal based on your date, group and plans.",
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

export function TokamaEventsPage({ locale }: Props) {
  const t = content[locale];
  const [isInquiryOpen, setInquiryOpen] = useState(false);

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introContent}>
          <h1>{t.introTitle}</h1>
          <p>{t.introText}</p>
        </div>
      </section>

      <section className={styles.showcase} aria-label={locale === "pl" ? "Przestrzeń rekreacyjno-integracyjna TOKAMA" : "TOKAMA event room"}>
        <video className={styles.video} autoPlay muted loop playsInline preload="metadata">
          <source src="/desktop/sala.mp4" type="video/mp4" />
        </video>
        <div className={styles.videoOverlay} />

        <div className={styles.showcaseContent}>
          <h2>{t.videoTitle}</h2>
          <p>{t.videoText}</p>
          <button type="button" className={styles.contactButton} onClick={() => setInquiryOpen(true)}>
            {t.contact}
          </button>
        </div>
      </section>

      <section className={styles.details}>
        <div className={styles.detailsInner}>
          <h2>{t.detailsTitle}</h2>

          <div className={styles.detailList}>
            {t.details.map(([number, title, text]) => (
              <article key={number} className={styles.detail}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>


      <section className={styles.inquiry}>
        <div className={styles.inquiryInner}>
          <div className={styles.inquiryIntro}>
            <h2>{t.formTitle}</h2>
            <p>{t.formText}</p>
            <button
              type="button"
              className={styles.inquiryButton}
              onClick={() => setInquiryOpen(true)}
            >
              {t.contact}
            </button>
          </div>
        </div>
      </section>


      <TokamaEventInquiryModal
        locale={locale}
        open={isInquiryOpen}
        onClose={() => setInquiryOpen(false)}
      />

    </main>
  );
}
