import styles from "./TokamaTable.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Śniadania",
    title: (
      <>
        Poranki przy stole. <em>Bez pośpiechu</em>.
      </>
    ),
    text:
      "Śniadania w Tokamie są częścią rytmu pobytu — spokojne, blisko natury, stworzone do długich rozmów i pierwszej kawy wypitej bez patrzenia na zegarek.",
    note: "Śniadania dostępne podczas pobytu.",
    cta: "Sprawdź dostępność",
  },
  en: {
    kicker: "Breakfast",
    title: (
      <>
        Mornings around the table. <em>Without rush</em>.
      </>
    ),
    text:
      "Breakfast at Tokama is part of the rhythm of the stay — calm, close to nature, made for long conversations and the first coffee without watching the clock.",
    note: "Breakfast available during your stay.",
    cta: "Check availability",
  },
};

export function TokamaTable({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy} data-reveal>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2>{t.title}</h2>
        </div>

        <div className={styles.right} data-reveal data-delay="140">
          <p className={styles.text}>{t.text}</p>
          <p className={styles.note}>{t.note}</p>
          <a href={locale === "pl" ? "/rezerwacja" : "/en/book"} className={styles.cta}>
            {t.cta}
          </a>
        </div>

        <div className={styles.imageWrap} data-reveal="image" data-delay="220">
          <img src="/images/tokama-table.jpg" alt={locale === "pl" ? "Śniadanie w Tokamie" : "Breakfast at Tokama"} />
        </div>
      </div>
    </section>
  );
}
