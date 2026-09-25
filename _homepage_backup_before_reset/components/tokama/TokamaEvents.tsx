import styles from "./TokamaEvents.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Eventy",
    title: (
      <>
        Kameralne spotkania. <em>Naturalna</em> oprawa.
      </>
    ),
    text:
      "Tokama może stać się tłem dla małych wydarzeń, prywatnych kolacji, warsztatów i spotkań tworzonych blisko natury. Bez nadmiaru. Z przestrzenią, światłem i spokojem miejsca.",
    items: ["Warsztaty", "Kolacje", "Sesje zdjęciowe", "Spotkania prywatne"],
    cta: "Zapytaj o event",
  },
  en: {
    kicker: "Events",
    title: (
      <>
        Intimate gatherings. <em>A natural</em> setting.
      </>
    ),
    text:
      "Tokama can become a setting for small events, private dinners, workshops and gatherings created close to nature. No excess — just space, light and the calm of the place.",
    items: ["Workshops", "Dinners", "Photo shoots", "Private gatherings"],
    cta: "Ask about events",
  },
};

export function TokamaEvents({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id={locale === "pl" ? "eventy" : "events"} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.imageWrap} data-reveal="image">
          <img src="/images/tokama-events.jpg" alt={locale === "pl" ? "Event w Tokamie" : "Event at Tokama"} />
        </div>

        <div className={styles.copy} data-reveal data-delay="140">
          <p className={styles.kicker}>{t.kicker}</p>
          <h2>{t.title}</h2>
          <p className={styles.text}>{t.text}</p>

          <div className={styles.items}>
            {t.items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <a href="mailto:hello@tokama.pl" className={styles.cta}>{t.cta}</a>
        </div>
      </div>
    </section>
  );
}
