import styles from "./TokamaFooter.module.css";

type Locale = "pl" | "en";

const content = {
  pl: {
    stay: "Pobyt bliżej spokoju.",
    nav: ["Pobyt", "Domki", "Jezioro", "Doświadczenia", "Eventy", "Journal"],
    legal: ["Regulamin", "Polityka prywatności"],
    contact: "Kontakt",
    book: "Rezerwuj",
  },
  en: {
    stay: "A stay closer to stillness.",
    nav: ["Stay", "Houses", "Lake", "Experiences", "Events", "Journal"],
    legal: ["Terms", "Privacy policy"],
    contact: "Contact",
    book: "Book",
  },
};

export function TokamaFooter({ locale = "pl" }: { locale?: Locale }) {
  const t = content[locale];

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <a href={locale === "pl" ? "/" : "/en"} className={styles.logo}>TOKAMA</a>
        <p>{t.stay}</p>
      </div>

      <div className={styles.grid}>
        <div>
          <span>Menu</span>
          {t.nav.map((item) => (
            <a href="#" key={item}>{item}</a>
          ))}
        </div>

        <div>
          <span>{t.contact}</span>
          <a href="mailto:hello@tokama.pl">hello@tokama.pl</a>
          <a href="https://www.instagram.com/" target="_blank">Instagram</a>
        </div>

        <div>
          <span>Booking</span>
          <a href={locale === "pl" ? "/rezerwacja" : "/en/book"}>{t.book}</a>
          {t.legal.map((item) => (
            <a href="#" key={item}>{item}</a>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <small>© 2026 Tokama</small>
        <small>PL / EN</small>
      </div>
    </footer>
  );
}
