import styles from "./TokamaJournal.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Journal",
    title: (
      <>
        Notatki z miejsca, które pozwala <em>zwolnić</em>.
      </>
    ),
    text:
      "Journal Tokamy będzie przestrzenią dla historii o pobycie nad jeziorem, sezonach, śniadaniach, naturze i małych rytuałach odpoczynku.",
    posts: [
      "Weekend nad jeziorem blisko Iławy",
      "Poranek w Tokamie",
      "Sauna, woda i cisza",
    ],
    cta: "Przejdź do Journal",
  },
  en: {
    kicker: "Journal",
    title: (
      <>
        Notes from a place made to <em>slow down</em>.
      </>
    ),
    text:
      "Tokama Journal will become a space for stories about lakeside stays, seasons, breakfasts, nature and small rituals of rest.",
    posts: [
      "A weekend by the lake near Iława",
      "A morning at Tokama",
      "Sauna, water and stillness",
    ],
    cta: "Open Journal",
  },
};

export function TokamaJournal({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id="journal" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy} data-reveal>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2>{t.title}</h2>
          <p className={styles.text}>{t.text}</p>
        </div>

        <div className={styles.posts} data-reveal data-delay="160">
          {t.posts.map((post, index) => (
            <a href="#" className={styles.post} key={post}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{post}</strong>
              <i>→</i>
            </a>
          ))}
        </div>

        <div className={styles.imageWrap} data-reveal="image" data-delay="240">
          <img src="/images/tokama-journal.jpg" alt={locale === "pl" ? "Journal Tokamy" : "Tokama Journal"} />
        </div>
      </div>
    </section>
  );
}
