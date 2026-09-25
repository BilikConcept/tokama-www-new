import styles from "./TokamaFinalBooking.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Rezerwacja",
    title: (
      <>
        Zaplanuj pobyt <em>bliżej spokoju</em>.
      </>
    ),
    text:
      "Wybierz termin, liczbę gości i sprawdź dostępność prywatnych domków w Tokamie.",
    cta: "Sprawdź dostępność",
  },
  en: {
    kicker: "Booking",
    title: (
      <>
        Plan a stay <em>closer to stillness</em>.
      </>
    ),
    text:
      "Choose your dates, number of guests and check the availability of Tokama’s private lake houses.",
    cta: "Check availability",
  },
};

export function TokamaFinalBooking({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section className={styles.section}>
      <div className={styles.inner} data-reveal>
        <p className={styles.kicker}>{t.kicker}</p>
        <h2>{t.title}</h2>
        <p className={styles.text}>{t.text}</p>
        <a href={locale === "pl" ? "/rezerwacja" : "/en/book"} className={styles.cta}>
          {t.cta}
        </a>
      </div>
    </section>
  );
}
