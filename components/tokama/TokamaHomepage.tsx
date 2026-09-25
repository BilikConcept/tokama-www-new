"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./TokamaHomepage.module.css";

export type TokamaLocale = "pl" | "en";

type Props = { locale: TokamaLocale };

const copy = {
  pl: {
    nav: [
      ["Domki", "#domki"],
      ["Relaks", "#relaks"],
      ["Eventy", "#eventy"],
    ],
    location: "Windyki koło Iławy",
    title: <>Domki nad <em>jeziorem,</em><br />bliżej <em>spokoju.</em></>,
    intro: "Prywatne pobyty w otoczeniu natury — stworzone do długich poranków, spokojnych wieczorów i czasu, który płynie wolniej.",
    book: "Rezerwuj",
    explore: "Zobacz domki",
    aboutLabel: "TOKAMA",
    aboutTitle: <>Trzy domki.<br />Jeden spokojny adres.</>,
    aboutText: "Kameralne miejsce nad jeziorem, sześć kilometrów od Iławy. Każdy domek daje prywatność, własny taras i przestrzeń dla maksymalnie siedmiu dorosłych osób.",
    homesLabel: "Domki",
    homesTitle: <>TO, KA i MA.<br />Gotowe na wspólny czas.</>,
    homesText: "Dwie sypialnie, wygodna część dzienna, wyposażona kuchnia, klimatyzacja, Wi‑Fi i prywatny taras. Zwierzęta są akceptowane.",
    homesLink: "Wybierz termin pobytu",
    relaxLabel: "Strefa relaksu",
    relaxTitle: <>Woda, ciepło<br />i czas bez planu.</>,
    relaxText: "Wspólna dla gości wszystkich trzech domków i wliczona w cenę pobytu. Basen i jacuzzi działają w sezonie, sauna w chłodniejszych miesiącach.",
    eventsLabel: "Eventy",
    eventsTitle: <>Kameralne wydarzenia<br />z własną oprawą.</>,
    eventsText: "Sala eventowa dla maksymalnie 40 osób, wyposażona kuchnia, nagłośnienie i noclegi w trzech domkach. Catering dobieramy do charakteru wydarzenia.",
    eventsLink: "Sprawdź dostępność",
    footerLine: "TOKAMA — pobyt bliżej spokoju.",
    footerAddress: "Windyki 116, 14-200 Iława",
  },
  en: {
    nav: [
      ["Cottages", "#domki"],
      ["Relax", "#relaks"],
      ["Events", "#eventy"],
    ],
    location: "Windyki, near Iława",
    title: <>Lakeside <em>cottages,</em><br />closer to <em>stillness.</em></>,
    intro: "Private stays surrounded by nature — made for long mornings, quiet evenings and time that moves more slowly.",
    book: "Book",
    explore: "See the cottages",
    aboutLabel: "TOKAMA",
    aboutTitle: <>Three cottages.<br />One quiet address.</>,
    aboutText: "An intimate place by the lake, six kilometres from Iława. Every cottage offers privacy, a private terrace and room for up to seven adults.",
    homesLabel: "The cottages",
    homesTitle: <>TO, KA and MA.<br />Made for time together.</>,
    homesText: "Two bedrooms, a comfortable living space, equipped kitchen, air conditioning, Wi‑Fi and a private terrace. Pets are welcome.",
    homesLink: "Choose your stay dates",
    relaxLabel: "Relaxation area",
    relaxTitle: <>Water, warmth<br />and time without a plan.</>,
    relaxText: "Shared by guests of all three cottages and included in every stay. The pool and hot tub are available in season; the sauna in colder months.",
    eventsLabel: "Events",
    eventsTitle: <>Intimate events<br />with their own setting.</>,
    eventsText: "Event space for up to 40 guests, an equipped kitchen, sound system and accommodation in all three cottages. Catering is tailored to your event.",
    eventsLink: "Check availability",
    footerLine: "TOKAMA — a stay closer to stillness.",
    footerAddress: "Windyki 116, 14-200 Iława, Poland",
  },
} as const;

export function TokamaHomepage({ locale }: Props) {
  const t = copy[locale];
  const bookingHref = locale === "pl" ? "/rezerwacja" : "/en/book";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.headerPlace}>{t.location}</p>

          <Link href={locale === "pl" ? "/" : "/en"} className={styles.logo} aria-label="TOKAMA">
            TOKAMA
          </Link>

          <div className={styles.actions}>
            <Link href={locale === "pl" ? "/en" : "/"} className={styles.language}>
              {locale === "pl" ? "EN" : "PL"}
            </Link>
            <Link href={bookingHref} className={styles.headerBooking}>{t.book}</Link>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {t.nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
      </header>

      <section className={styles.hero} aria-label="TOKAMA">
        <video className={styles.heroVideo} autoPlay muted loop playsInline preload="auto">
          <source src="/desktop/main-hero.mp4" type="video/mp4" />
        </video>
        <div className={styles.heroShade} />

        <div className={styles.heroContent}>
          <p className={styles.kicker}>{t.location}</p>

          <div className={styles.heroGrid}>
            <h1>{t.title}</h1>

            <div className={styles.heroSupporting}>
              <p className={styles.heroText}>{t.intro}</p>
              <a href="#domki" className={styles.heroExplore}>
                <span>{locale === "pl" ? "Odkryj TOKAMĘ" : "Discover TOKAMA"}</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.intro}>
        <div className={styles.container}>
          <p className={styles.label}>{t.aboutLabel}</p>
          <div className={styles.introGrid}>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText}</p>
          </div>
        </div>
      </section>

      <section id="domki" className={styles.splitSection}>
        <div className={styles.media}>
          <Image src="/images/tokama-media-01.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
        </div>
        <div className={styles.splitCopy}>
          <p className={styles.label}>{t.homesLabel}</p>
          <h2>{t.homesTitle}</h2>
          <p>{t.homesText}</p>
          <Link href={bookingHref} className={styles.textLink}>{t.homesLink} <span>↗</span></Link>
        </div>
      </section>

      <section id="relaks" className={styles.relax}>
        <div className={styles.container}>
          <div className={styles.relaxTop}>
            <p className={styles.label}>{t.relaxLabel}</p>
            <h2>{t.relaxTitle}</h2>
            <p>{t.relaxText}</p>
          </div>
        </div>
        <div className={styles.relaxMedia}>
          <Image src="/images/tokama-media-02.jpg" alt="" fill sizes="100vw" />
        </div>
      </section>

      <section id="eventy" className={styles.events}>
        <div className={styles.eventsMedia}>
          <Image src="/images/tokama-media-05.jpg" alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
        </div>
        <div className={styles.eventsCopy}>
          <p className={styles.label}>{t.eventsLabel}</p>
          <h2>{t.eventsTitle}</h2>
          <p>{t.eventsText}</p>
          <Link href={bookingHref} className={styles.darkButton}>{t.eventsLink}</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{t.footerLine}</p>
        <div>
          <a
              href="https://maps.app.goo.gl/nkLn5xqxD4Q2GnaR8"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                locale === "pl"
                  ? "Otwórz lokalizację TOKAMA w Google Maps"
                  : "Open TOKAMA location in Google Maps"
              }
            >
              {t.footerAddress}
            </a>
          <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>
          <a href="tel:+48604811474">+48 604 811 474</a>
        </div>
      </footer>
    </main>
  );
}
