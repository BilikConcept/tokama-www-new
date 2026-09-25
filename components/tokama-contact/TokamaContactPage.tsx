import Link from "next/link";
import styles from "./TokamaContactPage.module.css";

type Locale = "pl" | "en";

type Props = {
  locale: Locale;
};

const content = {
  pl: {
    title: <>Zostańmy<br />w <em>kontakcie.</em></>,
    intro:
      "Masz pytanie o pobyt, organizację wydarzenia lub dostępne terminy? Napisz albo zadzwoń — chętnie pomożemy.",
    detailsTitle: <>TOKAMA<br />w <em>Windykach.</em></>,
    details: [
      ["E-mail", "kontakt@tokama.pl", "mailto:kontakt@tokama.pl"],
      ["Telefon", "+48 604 811 474", "tel:+48604811474"],
      ["Adres obiektu", "Windyki 116, 14-200 Iława, Polska", "https://maps.app.goo.gl/nkLn5xqxD4Q2GnaR8"],
    ],
    companyTitle: <>Dane<br /><em>firmy.</em></>,
    companyDetails: [
      ["Nazwa prawna", "TKM GROUP SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ", "#company-data"],
      ["Adres siedziby", "Mieszka I 20, 14-200 Iława, Polska", "#company-data"],
      ["NIP", "7441830510", "#company-data"],
      ["KRS", "0000979657", "#company-data"],
      ["REGON", "522436791", "#company-data"],
    ],
    locationTitle: <>Nad jeziorem,<br />blisko <em>Iławy.</em></>,
    locationText:
      "TOKAMA znajduje się w Windykach — około sześciu kilometrów od Iławy. To spokojny punkt na mapie, do którego łatwo dojechać i z którego trudno się spieszyć.",
    map: "Otwórz w mapach",
    home: "Wróć na stronę główną",
  },
  en: {
    title: <>Let&apos;s stay<br />in <em>touch.</em></>,
    intro:
      "Have a question about a stay, event or available dates? Write or call us — we are happy to help.",
    detailsTitle: <>TOKAMA<br />in <em>Windyki.</em></>,
    details: [
      ["Email", "kontakt@tokama.pl", "mailto:kontakt@tokama.pl"],
      ["Phone", "+48 604 811 474", "tel:+48604811474"],
      ["Property address", "Windyki 116, 14-200 Iława, Poland", "https://maps.app.goo.gl/nkLn5xqxD4Q2GnaR8"],
    ],
    companyTitle: <>Company<br /><em>details.</em></>,
    companyDetails: [
      ["Legal name", "TKM GROUP SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ", "#company-data"],
      ["Registered office", "Mieszka I 20, 14-200 Iława, Poland", "#company-data"],
      ["Tax ID (NIP)", "7441830510", "#company-data"],
      ["KRS", "0000979657", "#company-data"],
      ["REGON", "522436791", "#company-data"],
    ],
    locationTitle: <>By the lake,<br />near <em>Iława.</em></>,
    locationText:
      "TOKAMA is located in Windyki, around six kilometres from Iława — a quiet place that is easy to reach and hard to leave in a hurry.",
    map: "Open in maps",
    home: "Back to homepage",
  },
} as const;

export function TokamaContactPage({ locale }: Props) {
  const t = content[locale];
  const homeHref = locale === "pl" ? "/" : "/en";

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introContent}>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </section>

      <section className={styles.details} id="company-data">
        <div className={styles.detailsInner}>
          <h2>{t.detailsTitle}</h2>

          <div className={styles.detailList}>
            {t.details.map(([label, value, href], index) => (
              <a
                key={label}
                href={href}
                className={styles.detail}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
              >
                <span>0{index + 1}</span>
                <span>{label}</span>
                <strong>{value} <i>↗</i></strong>
              </a>
            ))}
          </div>

          <h2 className={styles.companyTitle}>{t.companyTitle}</h2>
          <div className={styles.detailList}>
            {t.companyDetails.map(([label, value, href], index) => (
              <a key={label} href={href} className={styles.detail}>
                <span>0{index + 1}</span>
                <span>{label}</span>
                <strong>{value}</strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.location}>
        <div className={styles.locationContent}>
          <h2>{t.locationTitle}</h2>
          <p>{t.locationText}</p>
          <a
            href="https://maps.app.goo.gl/nkLn5xqxD4Q2GnaR8"
            target="_blank"
            rel="noreferrer"
            className={styles.mapLink}
          >
            {t.map} <span>↗</span>
          </a>
          <Link href={homeHref} className={styles.homeLink}>
            {t.home}
          </Link>
        </div>
      </section>

    </main>
  );
}
