"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./TokamaHero.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    nav: [
      { label: "Pobyt", href: "#pobyt" },
      { label: "Domki", href: "#domki" },
      { label: "Jezioro", href: "#jezioro" },
      { label: "Doświadczenia", href: "#doswiadczenia" },
      { label: "Eventy", href: "#eventy" },
      { label: "Journal", href: "#journal" },
    ],
    eyebrow: "Windyki koło Iławy",
    titleLead: "Zaledwie trzy",
    titleEmphasis: "domki",
    titleEnd: "nad jeziorem.",
    description:
      "TOKAMA to kameralny adres — zaledwie trzy całoroczne domki, każdy dla maksymalnie 7 dorosłych osób. Blisko natury, z przestrzenią na własne tempo.",
    facts: ["3 domki", "Do 7 dorosłych osób każdy", "Całorocznie"],
    primaryCta: "Sprawdź dostępność",
    secondaryCta: "Poznaj domki",
    book: "Rezerwuj",
    menu: "Menu",
    close: "Zamknij",
    checkIn: "Przyjazd",
    checkOut: "Wyjazd",
    adults: "Dorośli",
    children: "Dzieci",
    search: "Sprawdź",
  },
  en: {
    nav: [
      { label: "Stay", href: "#stay" },
      { label: "Houses", href: "#houses" },
      { label: "Lake", href: "#lake" },
      { label: "Experiences", href: "#experiences" },
      { label: "Events", href: "#events" },
      { label: "Journal", href: "#journal" },
    ],
    eyebrow: "Windyki, near Iława",
    titleLead: "Just three",
    titleEmphasis: "cottages",
    titleEnd: "by the lake.",
    description:
      "TOKAMA is an intimate address of just three year-round cottages, each for up to seven adults. Close to nature, with space to set your own pace.",
    facts: ["3 cottages", "Up to 7 adults each", "All year round"],
    primaryCta: "Check availability",
    secondaryCta: "Explore the cottages",
    book: "Book",
    menu: "Menu",
    close: "Close",
    checkIn: "Check-in",
    checkOut: "Check-out",
    adults: "Adults",
    children: "Children",
    search: "Check",
  },
};

export function TokamaHero({ locale = "pl" }: { locale?: Locale }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = content[locale];

  useEffect(() => {
    const onScroll = () => {
      const heroBreakpoint = window.innerHeight - 96;
      setScrolled(window.scrollY > heroBreakpoint);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <section className={styles.hero} aria-label="Tokama">
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""} ${menuOpen ? styles.headerMenuOpen : ""}`}>
        <Link href={locale === "pl" ? "/" : "/en"} className={styles.logo} aria-label="Tokama home">
          TOKAMA
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {t.nav.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.lang} aria-label="Language switcher">
            <Link href="/" className={locale === "pl" ? styles.activeLang : ""}>
              PL
            </Link>
            <span>/</span>
            <Link href="/en" className={locale === "en" ? styles.activeLang : ""}>
              EN
            </Link>
          </div>

          <Link href={locale === "pl" ? "/rezerwacja" : "/en/book"} className={styles.bookButton}>
            {t.book}
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t.close : t.menu}
          >
            {menuOpen ? t.close : t.menu}
          </button>
        </div>
      </header>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        <nav aria-label="Mobile navigation">
          {t.nav.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href={locale === "pl" ? "/rezerwacja" : "/en/book"}
          className={styles.mobileBook}
          onClick={() => setMenuOpen(false)}
        >
          {t.primaryCta}
        </Link>
      </div>

      <div className={styles.media} aria-hidden="true">
        <video
          className={styles.video}
          autoPlay
          muted
          loop
          playsInline
          poster="/images/tokama-hero-poster.jpg"
        >
          <source src="/videos/tokama-hero.mp4" type="video/mp4" />
        </video>
        <div className={styles.fallbackImage} />
        <div className={styles.overlay} />
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>
          {t.titleLead} <em>{t.titleEmphasis}</em>
          <br />
          {t.titleEnd}
        </h1>
        <p className={styles.description}>{t.description}</p>

        <ul
          className={styles.facts}
          aria-label={locale === "pl" ? "Najważniejsze informacje o pobycie" : "Key stay information"}
        >
          {t.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>

        <div className={styles.ctaRow}>
          <Link href={locale === "pl" ? "/rezerwacja" : "/en/book"} className={styles.primaryCta}>
            {t.primaryCta}
          </Link>

          <a href={locale === "pl" ? "#domki" : "#houses"} className={styles.secondaryCta}>
            {t.secondaryCta}
          </a>
        </div>
      </div>

      <div className={styles.scrollHint} aria-hidden="true">
        <span />
        Scroll
      </div>

      <form className={styles.bookingBar} action={locale === "pl" ? "/rezerwacja" : "/en/book"}>
        <div className={styles.bookingField}>
          <label htmlFor={`checkin-${locale}`}>{t.checkIn}</label>
          <input id={`checkin-${locale}`} name="checkin" type="date" />
        </div>

        <div className={styles.bookingField}>
          <label htmlFor={`checkout-${locale}`}>{t.checkOut}</label>
          <input id={`checkout-${locale}`} name="checkout" type="date" />
        </div>

        <div className={styles.bookingField}>
          <label htmlFor={`adults-${locale}`}>{t.adults}</label>
          <input id={`adults-${locale}`} name="adults" type="number" min="1" max="21" defaultValue="2" />
        </div>

        <div className={styles.bookingField}>
          <label htmlFor={`children-${locale}`}>{t.children}</label>
          <input id={`children-${locale}`} name="children" type="number" min="0" defaultValue="0" />
        </div>

        <div className={styles.bookingSubmitWrap}>
          <button type="submit" className={styles.bookingSubmit}>
            {t.search}
          </button>
        </div>
      </form>
    </section>
  );
}
