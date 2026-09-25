import Image from "next/image";
import Link from "next/link";
import styles from "./TokamaSiteFooter.module.css";

type Locale = "pl" | "en";

const copy = {
  pl: {
    eyebrow: "TOKAMA · WINDYKI",
    title: <>Zaplanuj pobyt bliżej <em>natury.</em></>,
    description: "Trzy kameralne domki nad jeziorem. Sprawdź dostępność i wybierz swój termin.",
    booking: "Sprawdź dostępność",
    explore: "Odkrywaj",
    information: "Informacje",
    contact: "Kontakt",
    payments: "Bezpieczne płatności",
    area: "Okolica",
  },
  en: {
    eyebrow: "TOKAMA · WINDYKI",
    title: <>Plan a stay closer to <em>nature.</em></>,
    description: "Three intimate lakeside cottages. Check availability and choose your dates.",
    booking: "Check availability",
    explore: "Explore",
    information: "Information",
    contact: "Contact",
    payments: "Secure payments",
    area: "Nearby",
  },
} as const;

const PAYMENT_MARKS = [
  { src: "https://www.przelewy24.pl/themes/przelewy24/assets/img/base/przelewy24_logo_2022.svg", alt: "Przelewy24", width: 95, height: 27 },
  { src: "/tokama/payments/blik.svg", alt: "BLIK", width: 49, height: 27 },
  { src: "/tokama/payments/visa.svg", alt: "Visa", width: 53, height: 27 },
  { src: "/tokama/payments/mastercard.svg", alt: "Mastercard", width: 45, height: 27 },
  { src: "/tokama/payments/apple-pay.svg", alt: "Apple Pay", width: 50, height: 27 },
  { src: "/tokama/payments/google-pay.svg", alt: "Google Pay", width: 54, height: 27 },
] as const;

export function TokamaSiteFooter({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const homeHref = locale === "pl" ? "/" : "/en";
  const bookingHref = locale === "pl" ? "/rezerwacja" : "/en/book";

  return (
    <footer className={styles.footer}>
      <section className={styles.booking}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2>{t.title}</h2>
        <p className={styles.description}>{t.description}</p>
        <Link className={styles.bookingLink} href={bookingHref}>
          <span>{t.booking}</span>
          <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <div className={styles.rule} />

      <div className={styles.content}>
        <Link href={homeHref} className={styles.brand} aria-label="TOKAMA — strona główna">
          <Image src="/tokama-logo.svg" alt="TOKAMA" width={224} height={61} />
        </Link>

        <nav className={styles.column} aria-label={t.explore}>
          <p>{t.explore}</p>
          <Link href={locale === "pl" ? "/domki" : "/en/cottages"}>{locale === "pl" ? "Domki" : "Cottages"}</Link>
          <Link href={locale === "pl" ? "/relaks" : "/en/relax"}>{locale === "pl" ? "Relaks" : "Relax"}</Link>
          <Link href={locale === "pl" ? "/eventy" : "/en/events"}>{locale === "pl" ? "Eventy" : "Events"}</Link>
          <Link href="/blog">Journal</Link>
          <Link href="/galeria">{locale === "pl" ? "Galeria" : "Gallery"}</Link>
        </nav>

        <div className={styles.column}>
          <p>{t.contact}</p>
          <a href="mailto:kontakt@tokama.pl">kontakt@tokama.pl</a>
          <a href="tel:+48604811474">+48 604 811 474</a>
          <a href="https://maps.app.goo.gl/nkLn5xqxD4Q2GnaR8" target="_blank" rel="noopener noreferrer">
            Windyki 116<br />14-200 Iława
          </a>
        </div>

        <nav className={styles.column} aria-label={t.information}>
          <p>{t.information}</p>
          <Link href="/regulamin-rezerwacji">{locale === "pl" ? "Regulamin rezerwacji" : "Booking terms"}</Link>
          <Link href="/polityka-prywatnosci">{locale === "pl" ? "Polityka prywatności" : "Privacy policy"}</Link>
          <Link href="/polityka-cookie">{locale === "pl" ? "Polityka cookie" : "Cookie policy"}</Link>
          <span>NIP 7441830510</span>
        </nav>
      </div>

      <div className={styles.paymentRow}>
        <p>{t.payments}</p>
        <div className={styles.paymentMarks}>
          {PAYMENT_MARKS.map((mark) => (
            <span className={styles.paymentMark} key={mark.alt}>
              <Image src={mark.src} alt={mark.alt} width={mark.width} height={mark.height} unoptimized />
            </span>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} TOKAMA</span>
        <span>{locale === "pl" ? "Nad jeziorem. Blisko natury." : "By the lake. Close to nature."}</span>
      </div>

      {locale === "pl" ? (
        <nav className={styles.area} aria-label={t.area}>
          <p>{t.area}</p>
          <div>
            <Link href="/atrakcje">Atrakcje w okolicy</Link>
            <Link href="/jezioro-labedz">Jezioro Łabędź</Link>
            <Link href="/jezioro-jeziorak">Jezioro Jeziorak</Link>
          </div>
        </nav>
      ) : null}
    </footer>
  );
}
