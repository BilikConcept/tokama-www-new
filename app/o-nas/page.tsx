import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./About.module.css";

export const metadata: Metadata = {
  title: "O TOKAMIE — trzy domki nad jeziorem koło Iławy",
  description:
    "Poznaj TOKAMĘ — trzy kameralne domki nad jeziorem w Windykach koło Iławy, stworzone z myślą o ciszy, naturze i spokojnym wypoczynku.",
  alternates: {
    canonical: "/o-nas",
    languages: {
      "pl-PL": "/o-nas",
      "en-GB": "/en/about",
      "x-default": "/o-nas",
    },
  },
  openGraph: {
    title: "O TOKAMIE — trzy domki nad jeziorem koło Iławy",
    description:
      "Miejsce stworzone z potrzeby zwolnienia tempa. Trzy domki, natura i spokojny wypoczynek w Windykach koło Iławy.",
    url: "/o-nas",
    type: "website",
    locale: "pl_PL",
    alternateLocale: ["en_GB"],
  },
};

const timeline = [
  {
    year: "Początek",
    title: "Pomysł na miejsce",
    text: "Z potrzeby stworzenia przestrzeni, w której można naprawdę odpocząć.",
  },
  {
    year: "Pierwsi goście",
    title: "TOKAMA zaczęła żyć",
    text: "Domki wypełniły się spokojnymi porankami, spotkaniami i wspomnieniami.",
  },
  {
    year: "Dzisiaj",
    title: "Tylko trzy domki",
    text: "Jedna idea — kameralny pobyt blisko natury, z dala od codziennego pośpiechu.",
  },
];

export default function AboutPage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "TOKAMA",
    description:
      "Trzy kameralne domki nad jeziorem w Windykach koło Iławy.",
    url: "https://tokama.pl/o-nas",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Windyki",
      addressRegion: "warmińsko-mazurskie",
      addressCountry: "PL",
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>O TOKAMIE</p>

          <h1>
            Powstała z potrzeby
            <br />
            <em>zwolnienia tempa.</em>
          </h1>

          <p className={styles.lead}>
            TOKAMA to trzy domki położone w Windykach koło Iławy.
            Stworzyliśmy miejsce dla tych, którzy szukają ciszy,
            prywatności i czasu spędzanego bliżej natury.
          </p>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/images/tokama-wnetrza/0_POZIOM.jpg"
            alt="Wnętrze jednego z domków TOKAMA w Windykach koło Iławy"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
          />
        </div>
      </section>

      <section className={styles.manifest}>
        <p className={styles.eyebrow}>NASZA IDEA</p>

        <div className={styles.manifestGrid}>
          <h2>
            Nie wierzymy, że luksus
            <br />
            <em>oznacza przepych.</em>
          </h2>

          <div className={styles.manifestText}>
            <p>
              Wierzymy, że prawdziwy luksus oznacza przestrzeń.
              Światło wpadające rano przez okna. Wieczory spędzane
              nad jeziorem. Dźwięk natury zamiast powiadomień.
            </p>

            <p>
              To czas, którego nie trzeba dokładnie planować,
              oraz miejsce, w którym można pobyć razem albo po prostu
              pobyć ze sobą.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.threeHouses}>
        <div className={styles.sectionImage}>
          <Image
            src="/images/tokama-wnetrza/3_POZIOM.jpg"
            alt="Jasne i spokojne wnętrze domku TOKAMA"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>

        <div className={styles.sectionCopy}>
          <p className={styles.eyebrow}>DLACZEGO TYLKO TRZY?</p>

          <h2>
            Kameralność jest częścią
            <br />
            <em>całego doświadczenia.</em>
          </h2>

          <p>
            Zamiast dużego resortu stworzyliśmy tylko trzy domki.
            Dzięki temu pobyt w TOKAMIE pozostaje spokojny, prywatny
            i daleki od tłumów.
          </p>

          <p>
            To domki nad jeziorem w Windykach, zaledwie kilka kilometrów
            od Iławy, położone w otoczeniu natury Pojezierza Iławskiego.
          </p>
        </div>
      </section>

      <section className={styles.location}>
        <div className={styles.locationHeading}>
          <p className={styles.eyebrow}>MIEJSCE</p>

          <h2>
            Windyki.
            <br />
            <em>Koło Iławy.</em>
          </h2>
        </div>

        <div className={styles.locationDetails}>
          <p>
            Blisko miasta, ale wystarczająco daleko, żeby poranki
            zaczynały się ciszej, a wieczory trwały trochę dłużej.
          </p>

          <div className={styles.locationFacts}>
            <div>
              <span>01</span>
              <p>Tylko trzy domki</p>
            </div>

            <div>
              <span>02</span>
              <p>Windyki koło Iławy</p>
            </div>

            <div>
              <span>03</span>
              <p>W otoczeniu natury</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.timeline}>
        <div className={styles.timelineIntro}>
          <p className={styles.eyebrow}>HISTORIA MIEJSCA</p>

          <h2>
            Od pomysłu
            <br />
            <em>do wspólnych chwil.</em>
          </h2>
        </div>

        <div className={styles.timelineItems}>
          {timeline.map((item, index) => (
            <article className={styles.timelineItem} key={item.year}>
              <span>{String(index + 1).padStart(2, "0")}</span>

              <div>
                <p className={styles.timelineYear}>{item.year}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.quote}>
        <blockquote>
          Najpiękniejsze wspomnienia
          <br />
          powstają wtedy,
          <br />
          <em>kiedy nic nie trzeba.</em>
        </blockquote>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>TWÓJ POBYT</p>

        <h2>
          Resztę najlepiej
          <br />
          <em>zobaczyć na miejscu.</em>
        </h2>

        <div className={styles.ctaActions}>
          <Link href="/domki" className={styles.secondaryButton}>
            Zobacz domki
          </Link>

          <Link href="/rezerwacja" className={styles.primaryButton}>
            Sprawdź dostępność
          </Link>
        </div>
      </section>
    </main>
  );
}
