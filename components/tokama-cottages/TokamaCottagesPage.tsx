"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./TokamaCottagesPage.module.css";

type Locale = "pl" | "en";

const images = [
  "/images/tokama-wnetrza/0_POZIOM.jpg",
  "/images/tokama-wnetrza/1_POZIOM.jpg",
  "/images/tokama-wnetrza/2_POZIOM.jpg",
  "/images/tokama-wnetrza/3_POZIOM.jpg",
  "/images/tokama-wnetrza/4_POZIOM.jpg",
  "/images/tokama-wnetrza/5_POZIOM.jpg",
  "/images/tokama-wnetrza/6_POZIOM.jpg",
  "/images/tokama-wnetrza/7_POZIOM.jpg",
  "/images/tokama-wnetrza/8_POZIOM.jpg",
] as const;

const copy = {
  pl: {
    title: <>Domki całoroczne nad jeziorem, blisko <em>Iławy.</em></>,
    intro: "TO, KA i MA to trzy jednakowo wyposażone domki w Windykach, niedaleko jeziora Łabędź. Każdy daje prywatną przestrzeń na pobyt o własnym rytmie — z dala od pośpiechu, blisko natury.",
    detailsTitle: <>Trzy domki. Jeden spokojny <em>standard.</em></>,
    detailsIntro: "Niezależnie od tego, który domek wybierzesz, czeka na Ciebie ten sam komfort i swoboda. To miejsce stworzone na rodzinny wyjazd, pobyt z przyjaciółmi albo kilka dni tylko dla siebie.",
    items: [
      {
        title: "Wnętrza gotowe na cały rok",
        text: "Klimatyzacja, ogrzewanie podłogowe, Wi‑Fi oraz wygodna część dzienna pozwalają odpoczywać niezależnie od pory roku.",
      },
      {
        title: "Prywatna codzienność",
        text: "Każdy domek ma własny taras, miejsce parkingowe, łazienkę i wyposażony aneks kuchenny — wszystko, czego potrzebujesz na miejscu.",
      },
      {
        title: "Miejsce dla wspólnego czasu",
        text: "Domki mieszczą do siedmiu osób. Są wygodną bazą na rodzinne wakacje, weekend nad jeziorem i wyjazd z bliskimi.",
      },
    ],
  },
  en: {
    title: <>Year-round lakeside cottages, near <em>Iława.</em></>,
    intro: "TO, KA and MA are three equally equipped cottages in Windyki, close to Lake Łabędź. Each offers a private stay at your own pace — away from rush, close to nature.",
    detailsTitle: <>Three cottages. One quiet <em>standard.</em></>,
    detailsIntro: "Whichever cottage you choose, the same comfort and freedom await. It is a place made for family time, stays with friends or a few days just for yourself.",
    items: [
      {
        title: "Interiors for every season",
        text: "Air conditioning, underfloor heating, Wi‑Fi and a comfortable living area make it easy to relax throughout the year.",
      },
      {
        title: "A private everyday rhythm",
        text: "Every cottage has its own terrace, parking space, bathroom and equipped kitchen area — everything you need on site.",
      },
      {
        title: "Space for time together",
        text: "Each cottage accommodates up to seven guests. It is a comfortable base for family holidays, lakeside weekends and time with loved ones.",
      },
    ],
  },
} as const;

export function TokamaCottagesPage({ locale }: { locale: Locale }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const t = copy[locale];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % images.length);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [activeSlide]);

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </section>

      <section className={styles.gallery} aria-label={locale === "pl" ? "Wnętrza domków TOKAMA" : "TOKAMA cottage interiors"}>
        {images.map((image, index) => (
          <div
            key={image}
            className={
              index === activeSlide
                ? `${styles.slide} ${styles.slideActive}`
                : styles.slide
            }
          >
            <Image
              src={image}
              alt={
                locale === "pl"
                  ? `Wnętrze domku TOKAMA — zdjęcie ${index + 1}`
                  : `TOKAMA cottage interior — image ${index + 1}`
              }
              fill
              sizes="100vw"
            />
          </div>
        ))}

        <div className={styles.progress} aria-hidden="true">
          {images.map((image, index) => (
            <span
              key={image}
              className={
                index === activeSlide
                  ? `${styles.progressItem} ${styles.progressItemActive}`
                  : styles.progressItem
              }
            />
          ))}
        </div>
      </section>

      <section className={styles.details}>
        <div className={styles.detailsHeader}>
          <h2>{t.detailsTitle}</h2>
          <p>{t.detailsIntro}</p>
        </div>

        <div className={styles.detailsList}>
          {t.items.map((item) => (
            <article key={item.title} className={styles.detail}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
