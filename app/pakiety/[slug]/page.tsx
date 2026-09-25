import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPackageBySlug } from "@/lib/content-studio/public";
import styles from "../Packages.module.css";

type Props = { params: Promise<{ slug: string }> };

function money(cents: number | null, currency: string) {
  if (!cents) return null;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

const weekdayNames = ["poniedziałki", "wtorki", "środy", "czwartki", "piątki", "soboty", "niedziele"];

function packagePeriod(from: string | null, to: string | null) {
  const format = (value: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(`${value}T12:00:00Z`));
  if (from && to) return `${format(from)} — ${format(to)}`;
  if (from) return `od ${format(from)}`;
  if (to) return `do ${format(to)}`;
  return "przez cały rok";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPackageBySlug(slug);
  if (!item) return {};
  return {
    title: item.headline || item.name,
    description: item.short_description,
    alternates: { canonical: `/pakiety/${item.slug}` },
    openGraph: item.hero?.kind === "image" ? { images: [item.hero.public_url] } : undefined,
  };
}

export default async function PackagePage({ params }: Props) {
  const { slug } = await params;
  const item = await getPackageBySlug(slug);
  if (!item) notFound();
  const packagePrice = money(item.package_price_cents, item.currency);
  const regularPrice = money(item.regular_price_cents, item.currency);
  const generatedAdvantages = [
    item.headline,
    `${item.min_nights}-nocny pobyt stworzony z myślą o spokojnym wypoczynku w TOKAMA.`,
    item.max_guests ? `Pakiet obejmuje pobyt dla maksymalnie ${item.max_guests} ${item.max_guests === 1 ? "osoby" : "osób"}.` : null,
    packagePrice && regularPrice ? `Specjalna cena pakietowa ${packagePrice} zamiast ${regularPrice}.` : packagePrice ? `Rezerwacja w specjalnej cenie pakietowej ${packagePrice}.` : null,
  ];
  const advantages = [...item.inclusions, ...generatedAdvantages]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 6);
  const availableDays = item.weekdays.length === 7 ? "każdego dnia tygodnia" : item.weekdays.map(day => weekdayNames[day - 1]).filter(Boolean).join(", ");

  return <main className={styles.detailPage}>
    <section className={styles.detailHero}>
      {item.hero?.kind === "video" ? <video src={item.hero.public_url} autoPlay muted loop playsInline /> : null}
      {item.hero?.kind === "image" ? <Image src={item.hero.public_url} alt={item.hero.alt_text || item.name} fill priority sizes="100vw" /> : null}
      {!item.hero ? <Image src="/images/tokama-media-01.jpg" alt="TOKAMA" fill priority sizes="100vw" /> : null}
      <div className={styles.heroShade} />
      <div className={styles.heroCopy}>
        <p>{item.eyebrow || "PAKIET TOKAMA"}</p>
        <h1>{item.headline || item.name}</h1>
        <span>{item.short_description}</span>
      </div>
    </section>

    <section className={styles.detailIntro}>
      <div>
        <p className={styles.eyebrow}>SZCZEGÓŁY PAKIETU</p>
        <h2>{item.name}</h2>
      </div>
      <div className={styles.detailText}>
        {(item.description || item.short_description).split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <Link className={styles.bookingButton} href={`/rezerwacja?package=${encodeURIComponent(item.slug)}`}>{item.cta_label || "Zarezerwuj pakiet"}</Link>
      </div>
    </section>

    {advantages.length ? <section className={styles.inclusions}><div className={styles.sectionHeading}><p className={styles.eyebrow}>W PAKIECIE</p><h2>Co zyskujesz?</h2></div><div>{advantages.map((entry, index) => <article key={`${entry}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{entry}</p></article>)}</div></section> : null}

    <section className={styles.conditions}>
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>ZASADY PAKIETU</p><h2>Ważne informacje.</h2></div>
      <div className={styles.conditionList}>
        {packagePrice ? <article><small>Cena pakietowa</small><strong>{packagePrice}</strong>{regularPrice ? <p>Regularnie {regularPrice}</p> : null}</article> : null}
        <article><small>Termin obowiązywania</small><strong>{packagePeriod(item.valid_from, item.valid_to)}</strong></article>
        <article><small>Dni dostępności</small><strong>{availableDays}</strong></article>
        <article><small>Długość pobytu</small><strong>minimum {item.min_nights} {item.min_nights === 1 ? "noc" : "noce"}</strong></article>
        {item.max_guests ? <article><small>Liczba gości</small><strong>maksymalnie {item.max_guests} {item.max_guests === 1 ? "osoba" : "osób"}</strong></article> : null}
        {item.booking_note ? <article className={styles.conditionNote}><small>Warunki rezerwacji</small><strong>{item.booking_note}</strong></article> : null}
      </div>
    </section>

    {item.gallery.length ? <section className={styles.gallery} aria-label="Galeria pakietu">{item.gallery.map(asset => <figure key={asset.id}>{asset.kind === "video" ? <video controls playsInline src={asset.public_url} /> : <Image src={asset.public_url} alt={asset.alt_text || item.name} width={asset.width || 1800} height={asset.height || 1200} sizes="(max-width: 760px) 100vw, 50vw" />}</figure>)}</section> : null}

    <section className={styles.bottomCta}><p className={styles.eyebrow}>TOKAMA</p><h2>Zatrzymaj się<br />bliżej <em>natury</em>.</h2><Link href={`/rezerwacja?package=${encodeURIComponent(item.slug)}`}>Sprawdź termin →</Link></section>
  </main>;
}
