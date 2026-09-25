"use client";

import { useEffect, useState } from "react";
import styles from "./TokamaRelaxPage.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    title: <>Strefa relaksu bliżej <em>natury.</em></>,
    intro: "Czas na wodę, ciepło i odpoczynek bez planu. Wspólna strefa relaksu jest dostępna dla gości wszystkich trzech domków.",
    slides: [
      {
        label: "Basen",
        video: "basen.mp4",
        title: <>Ciepła woda,<br />spokojny rytm dnia.</>,
        text: "Basen z podgrzewaną wodą jest dostępny w sezonie i pozwala zatrzymać się na chwilę między porankiem a wieczorem.",
      },
      {
        label: "Sauna",
        video: "sauna.mp4",
        title: <>Ciepło, które<br /><em>zostaje na dłużej.</em></>,
        text: "W chłodniejsze miesiące sauna daje przestrzeń na regenerację, wyciszenie i powolny oddech.",
      },
      {
        label: "Jacuzzi",
        video: "jacuzzi.mp4",
        title: <>Wieczór pod<br />otwartym niebem.</>,
        text: "Jacuzzi na świeżym powietrzu to miejsce na długie rozmowy i odpoczynek blisko natury.",
      },
    ],
  },
  en: {
    title: <>A relaxation area closer to <em>nature.</em></>,
    intro: "Time for water, warmth and rest without a plan. The shared relaxation area is available to guests of all three cottages.",
    slides: [
      {
        label: "Pool",
        video: "basen.mp4",
        title: <>Warm water,<br />a slower rhythm.</>,
        text: "The heated pool is available in season and makes space for a quiet pause between morning and evening.",
      },
      {
        label: "Sauna",
        video: "sauna.mp4",
        title: <>Warmth that<br /><em>stays with you.</em></>,
        text: "In cooler months, the sauna offers space for recovery, stillness and a slower breath.",
      },
      {
        label: "Hot tub",
        video: "jacuzzi.mp4",
        title: <>Evenings beneath<br />an open sky.</>,
        text: "The outdoor hot tub is a place for long conversations and rest close to nature.",
      },
    ],
  },
} as const;

export function TokamaRelaxPage({ locale }: { locale: Locale }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const page = content[locale];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % page.slides.length);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [activeSlide, page.slides.length]);

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
      </section>

      <section className={styles.showcase} data-tokama-dark-header>
        {page.slides.map((slide, index) => (
          <video
            key={slide.video}
            className={
              index === activeSlide
                ? `${styles.video} ${styles.videoActive}`
                : styles.video
            }
            autoPlay
            muted
            loop
            playsInline
            preload={index === activeSlide ? "auto" : "metadata"}
          >
            <source src={`/desktop/${slide.video}`} type="video/mp4" />
          </video>
        ))}

        <div className={styles.shade} />

        <div className={styles.tabs} aria-label={locale === "pl" ? "Strefa relaksu" : "Relaxation area"}>
          {page.slides.map((slide, index) => (
            <button
              key={slide.video}
              type="button"
              className={index === activeSlide ? styles.tabActive : undefined}
              onClick={() => setActiveSlide(index)}
            >
              {slide.label}
            </button>
          ))}
        </div>

        <div className={styles.copy}>
          <h2>{page.slides[activeSlide].title}</h2>
          <p>{page.slides[activeSlide].text}</p>
        </div>
      </section>

            <section className={styles.relaxDetails}>
        <div className={styles.relaxDetailsHeader}>
          <h2>
            {locale === "pl" ? (
              <>Trzy sposoby na spokojniejszy <em>dzień.</em></>
            ) : (
              <>Three ways to slow down your <em>day.</em></>
            )}
          </h2>

          <p>
            {locale === "pl"
              ? "Strefa relaksu jest wspólna dla gości wszystkich trzech domków. Możesz korzystać z niej we własnym rytmie — po śniadaniu, po dniu nad jeziorem lub wtedy, gdy po prostu chcesz się zatrzymać."
              : "The relaxation area is shared by guests of all three cottages. Enjoy it at your own pace — after breakfast, after a day by the lake or whenever you simply want to slow down."}
          </p>
        </div>

        <div className={styles.relaxDetailsList}>
          <article className={styles.relaxDetail}>
            <h3>{locale === "pl" ? "Basen" : "Pool"}</h3>
            <p>
              {locale === "pl"
                ? "Basen z podgrzewaną wodą jest dostępny w sezonie. To miejsce na spokojne poranki, zabawę z dziećmi i odpoczynek między kolejnymi planami."
                : "The heated pool is available in season. It is made for unhurried mornings, time with children and a pause between plans."}
            </p>
          </article>

          <article className={styles.relaxDetail}>
            <h3>{locale === "pl" ? "Jacuzzi" : "Hot tub"}</h3>
            <p>
              {locale === "pl"
                ? "Jacuzzi na świeżym powietrzu pozwala odpocząć blisko natury — szczególnie wtedy, gdy dzień powoli przechodzi w wieczór."
                : "The outdoor hot tub offers rest close to nature, especially when the day slowly turns into evening."}
            </p>
          </article>

          <article className={styles.relaxDetail}>
            <h3>{locale === "pl" ? "Sauna" : "Sauna"}</h3>
            <p>
              {locale === "pl"
                ? "W chłodniejsze miesiące sauna daje chwilę ciepła i regeneracji po spacerze, rowerze lub dniu spędzonym nad jeziorem."
                : "In cooler months, the sauna brings warmth and recovery after a walk, a bike ride or a day spent by the lake."}
            </p>
          </article>
        </div>

        <div className={styles.relaxDetailsNote}>
          <p>
            {locale === "pl"
              ? "Dostępność poszczególnych elementów strefy zależy od sezonu i warunków pogodowych."
              : "Availability of individual facilities depends on the season and weather conditions."}
          </p>
        </div>
      </section>




    </main>
  );
}
