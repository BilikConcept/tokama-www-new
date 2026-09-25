import styles from "./TokamaHouses.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Domki",
    title: (
      <>
        Trzy domki. <em>Ten sam</em> spokojny standard.
      </>
    ),
    text:
      "W Tokamie znajdują się trzy prywatne domki zaprojektowane w tym samym standardzie — z myślą o komforcie, prostocie i bliskości natury. Każdy z nich daje przestrzeń do odpoczynku, wspólnych poranków i spokojnych wieczorów nad jeziorem.",
    features: ["3 domki", "Do 7 dorosłych", "Taras", "Blisko jeziora"],
    cta: "Poznaj domki",
  },
  en: {
    kicker: "Houses",
    title: (
      <>
        Three houses. <em>The same</em> quiet standard.
      </>
    ),
    text:
      "Tokama offers three private houses designed to the same standard — created for comfort, simplicity and closeness to nature. Each one offers space for rest, slow mornings and quiet evenings by the lake.",
    features: ["3 houses", "Up to 7 adults", "Terrace", "Close to the lake"],
    cta: "Explore houses",
  },
};

export function TokamaHouses({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id={locale === "pl" ? "domki" : "houses"} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy} data-reveal>
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

          <a href="#" className={styles.cta}>
            {t.cta}
          </a>
        </div>

        <div className={styles.imageWrap} data-reveal="image" data-delay="160">
          <img src="/images/tokama-house-placeholder.jpg" alt={locale === "pl" ? "Domek Tokama nad jeziorem" : "Tokama lake house"} />
        </div>
      </div>
    </section>
  );
}
