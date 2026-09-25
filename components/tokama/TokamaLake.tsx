import styles from "./TokamaLake.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Jezioro i okolica",
    title: (
      <>
        Jezioro, pola i las. <em>Przestrzeń</em> do oddechu.
      </>
    ),
    text:
      "Tokama znajduje się blisko Iławy, w otoczeniu jeziora, pól i spokojnych dróg. To miejsce stworzone do krótkich spacerów, poranków przy wodzie i weekendów, w których nie trzeba niczego przyspieszać.",
    features: ["Jezioro", "Las", "Pola", "Blisko Iławy"],
  },
  en: {
    kicker: "Lake & land",
    title: (
      <>
        Lake, fields and forest. <em>Space</em> to breathe.
      </>
    ),
    text:
      "Tokama is located near Iława, surrounded by the lake, open fields and quiet paths. A place made for short walks, mornings by the water and weekends that do not need to be rushed.",
    features: ["Lake", "Forest", "Fields", "Near Iława"],
  },
};

export function TokamaLake({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id={locale === "pl" ? "jezioro" : "lake"} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.imageWrap} data-reveal="image">
          <img src="/images/tokama-lake.jpg" alt={locale === "pl" ? "Jezioro i okolica Tokamy" : "Tokama lake and surroundings"} />
        </div>

        <div className={styles.copy} data-reveal data-delay="120">
          <p className={styles.kicker}>{t.kicker}</p>
          <h2>{t.title}</h2>
          <p className={styles.text}>{t.text}</p>

          <div className={styles.features}>
            {t.features.map((feature, index) => (
              <span key={feature}>
                {feature}
                {index < t.features.length - 1 && <i>/</i>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
