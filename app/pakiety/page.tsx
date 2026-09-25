import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActivePackages } from "@/lib/content-studio/public";
import styles from "./Packages.module.css";

export const metadata: Metadata = { title: "Pakiety pobytowe", description: "Aktualne pakiety pobytowe TOKAMA." };

export default async function PackagesPage() {
  const packages = await getActivePackages();
  return <main className={styles.listPage}>
    <header className={styles.listHero}><p className={styles.eyebrow}>PAKIETY TOKAMA</p><h1>Pobyty ułożone<br />w <em>spokojny plan</em>.</h1></header>
    <section className={styles.packageGrid}>{packages.map(item => <Link href={`/pakiety/${item.slug}`} key={item.id} className={styles.packageCard}>
      <div className={styles.cardMedia}>{item.hero?.kind === "image" ? <Image src={item.hero.public_url} alt={item.hero.alt_text || item.name} fill sizes="(max-width: 760px) 100vw, 50vw" /> : item.hero?.kind === "video" ? <video src={item.hero.public_url} muted loop autoPlay playsInline /> : <Image src="/images/tokama-media-01.jpg" alt="TOKAMA" fill sizes="(max-width: 760px) 100vw, 50vw" />}</div>
      <div className={styles.cardCopy}><p className={styles.eyebrow}>{item.eyebrow || "PAKIET"}</p><h2>{item.name}</h2><span>{item.short_description}</span><strong>Odkryj pakiet →</strong></div>
    </Link>)}</section>
  </main>;
}
