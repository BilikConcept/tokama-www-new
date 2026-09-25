import styles from "./TokamaRelax.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Strefa relaksu",
    title: (
      <>
        Basen, jacuzzi i sauna. <em>Spokój</em> w swoim rytmie.
      </>
    ),
    text:
      "Strefa relaksu w Tokamie została pomyślana jako naturalne przedłużenie pobytu — miejsce na poranek przy wodzie, spokojne popołudnie w basenie i wieczór w saunie.",
    items: ["Basen", "Jacuzzi", "Sauna"],
  },
  en: {
    kicker: "Relaxation area",
    title: (
      <>
        Pool, jacuzzi and sauna. <em>Stillness</em> at your own pace.
      </>
    ),
    text:
      "Tokama’s relaxation area is designed as a natural extension of the stay — made for mornings by the water, slow afternoons in the pool and quiet evenings in the sauna.",
    items: ["Pool", "Jacuzzi", "Sauna"],
  },
};

export function TokamaRelax({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id={locale === "pl" ? "doswiadczenia" : "experiences"} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.top} data-reveal>
          <div>
            <p className={styles.kicker}>{t.kicker}</p>
            <h2>{t.title}</h2>
          </div>

          <p className={styles.text}>{t.text}</p>
        </div>

        <div className={styles.gallery}>
          {t.items.map((item, index) => (
            <figure className={styles.card} key={item} data-reveal="image" data-delay={String(120 + index * 180)}>
              <img
                src={`/images/tokama-relax-${index + 1}.jpg`}
                alt={item}
              />
              <figcaption>{item}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
