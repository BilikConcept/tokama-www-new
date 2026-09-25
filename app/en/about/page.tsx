import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../../o-nas/About.module.css";

export const metadata: Metadata = {
  title: "About TOKAMA — three lakeside cottages near Iława",
  description:
    "Discover TOKAMA — three private lakeside cottages in Windyki near Iława, created for quiet stays, privacy and time spent closer to nature.",
  alternates: {
    canonical: "/en/about",
    languages: {
      "pl-PL": "/o-nas",
      "en-GB": "/en/about",
      "x-default": "/o-nas",
    },
  },
  openGraph: {
    title: "About TOKAMA — three lakeside cottages near Iława",
    description:
      "A place created from the need to slow down. Three cottages, nature and quiet stays in Windyki near Iława.",
    url: "/en/about",
    type: "website",
    locale: "en_GB",
    alternateLocale: ["pl_PL"],
  },
};

const timeline = [
  {
    year: "The beginning",
    title: "An idea for a place",
    text: "Born from the need to create a space where it is possible to truly rest.",
  },
  {
    year: "Our first guests",
    title: "TOKAMA came to life",
    text: "The cottages filled with slow mornings, shared moments and lasting memories.",
  },
  {
    year: "Today",
    title: "Only three cottages",
    text: "One simple idea — a private stay close to nature and away from the everyday rush.",
  },
];

export default function AboutPageEn() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "TOKAMA",
    description:
      "Three private lakeside cottages in Windyki near Iława, Poland.",
    url: "https://tokama.pl/en/about",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Windyki",
      addressRegion: "Warmian-Masurian Voivodeship",
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
          <p className={styles.eyebrow}>ABOUT TOKAMA</p>

          <h1>
            Created from the need
            <br />
            <em>to slow down.</em>
          </h1>

          <p className={styles.lead}>
            TOKAMA is a collection of three cottages in Windyki,
            near Iława. We created a place for those looking for
            quiet, privacy and time spent closer to nature.
          </p>
        </div>

        <div className={styles.heroImage}>
          <Image
            src="/images/tokama-wnetrza/0_POZIOM.jpg"
            alt="Interior of a TOKAMA cottage in Windyki near Iława"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
          />
        </div>
      </section>

      <section className={styles.manifest}>
        <p className={styles.eyebrow}>OUR IDEA</p>

        <div className={styles.manifestGrid}>
          <h2>
            We do not believe luxury
            <br />
            <em>means excess.</em>
          </h2>

          <div className={styles.manifestText}>
            <p>
              We believe true luxury means space. Morning light
              entering through the windows. Evenings spent by the
              lake. The sound of nature instead of notifications.
            </p>

            <p>
              It is time that does not need to be planned and a place
              where you can be together, or simply spend time with
              yourself.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.threeHouses}>
        <div className={styles.sectionImage}>
          <Image
            src="/images/tokama-wnetrza/3_POZIOM.jpg"
            alt="Bright and peaceful interior of a TOKAMA cottage"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>

        <div className={styles.sectionCopy}>
          <p className={styles.eyebrow}>WHY ONLY THREE?</p>

          <h2>
            Privacy is part of
            <br />
            <em>the entire experience.</em>
          </h2>

          <p>
            Instead of creating a large resort, we built only three
            cottages. This allows every stay at TOKAMA to remain
            peaceful, private and far from the crowds.
          </p>

          <p>
            Our lakeside cottages are located in Windyki, only a few
            kilometres from Iława, surrounded by the natural landscape
            of the Iława Lake District.
          </p>
        </div>
      </section>

      <section className={styles.location}>
        <div className={styles.locationHeading}>
          <p className={styles.eyebrow}>THE PLACE</p>

          <h2>
            Windyki.
            <br />
            <em>Near Iława.</em>
          </h2>
        </div>

        <div className={styles.locationDetails}>
          <p>
            Close to the town, yet far enough away for mornings to
            begin more quietly and evenings to last a little longer.
          </p>

          <div className={styles.locationFacts}>
            <div>
              <span>01</span>
              <p>Only three cottages</p>
            </div>

            <div>
              <span>02</span>
              <p>Windyki near Iława</p>
            </div>

            <div>
              <span>03</span>
              <p>Surrounded by nature</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.timeline}>
        <div className={styles.timelineIntro}>
          <p className={styles.eyebrow}>OUR STORY</p>

          <h2>
            From an idea
            <br />
            <em>to shared moments.</em>
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
          The most beautiful memories
          <br />
          are created when
          <br />
          <em>nothing is required.</em>
        </blockquote>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>YOUR STAY</p>

        <h2>
          The rest is best
          <br />
          <em>experienced in person.</em>
        </h2>

        <div className={styles.ctaActions}>
          <Link href="/en/cottages" className={styles.secondaryButton}>
            Discover the cottages
          </Link>

          <Link href="/en/book" className={styles.primaryButton}>
            Check availability
          </Link>
        </div>
      </section>
    </main>
  );
}
