import styles from "./TokamaIntro.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    kicker: "Pobyt",
    title: (
      <>
        Nie tylko pobyt. <em>Cały rytm</em> odpoczynku.
      </>
    ),
    text:
      "Tokama łączy prywatne domki nad jeziorem ze spokojną strefą relaksu. Poranne śniadania, basen, jacuzzi, sauna i natura tworzą miejsce, w którym dzień można przeżyć wolniej — bez planu, bez pośpiechu, blisko wody.",
    features: ["Domki", "Śniadania", "Basen", "Jacuzzi", "Sauna"],
  },
  en: {
    kicker: "Stay",
    title: (
      <>
        More than a stay. <em>A slower rhythm</em> of rest.
      </>
    ),
    text:
      "Tokama brings together private lake houses and a quiet relaxation area. Morning breakfasts, a pool, jacuzzi, sauna and surrounding nature create a place where the day can unfold slowly — without rush, close to the water.",
    features: ["Houses", "Breakfast", "Pool", "Jacuzzi", "Sauna"],
  },
};

export function TokamaIntro({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <section id={locale === "pl" ? "pobyt" : "stay"} className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.kicker} data-reveal>{t.kicker}</p>

        <div className={styles.grid}>
          <h2 data-reveal data-delay="90">{t.title}</h2>

          <div className={styles.copy} data-reveal data-delay="180">
            <p>{t.text}</p>

            <div className={styles.features} aria-label={locale === "pl" ? "Elementy pobytu" : "Stay features"}>
              {t.features.map((feature, index) => (
                <span key={feature}>
                  {feature}
                  {index < t.features.length - 1 && <i>/</i>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
