import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { blogArticles } from "./data";
import { getPublishedArticles } from "@/lib/content-studio/public";
import { mergeJournalCards } from "@/lib/content-studio/journal";
import styles from "./Blog.module.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Pojezierze Iławskie, Jeziorak i okolice Iławy",
  description:
    "Przewodniki TOKAMA po Jezioraku, Iławie i Pojezierzu Iławskim. Pomysły na wycieczki, rodzinny pobyt i odpoczynek blisko natury.",
  alternates: {
    canonical: "/blog",
  },
};

export default async function BlogPage() {
  const studioArticles = await getPublishedArticles();
  const articles = mergeJournalCards(
    studioArticles.map((article) => ({
      slug: article.slug,
      title: article.title,
      category: article.eyebrow || "JOURNAL",
      description: article.excerpt || "Opowieść TOKAMA.",
      coverUrl: article.cover?.public_url || null,
      coverKind: article.cover?.kind || null,
      coverAlt: article.cover?.alt_text || article.title,
    })),
    blogArticles.map((article) => ({
      slug: article.slug,
      title: article.title,
      category: article.category,
      description: article.description,
    }))
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>TOKAMA JOURNAL</p>
        <h1>Blisko jeziora. Jeszcze bliżej natury.</h1>
        <p className={styles.lead}>
          Przewodniki po Jezioraku, Iławie i Pojezierzu Iławskim — miejsca,
          trasy i pomysły na spokojny pobyt.
        </p>
      </header>

      <section className={styles.grid} aria-label="Artykuły TOKAMA">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className={styles.card}
          >
            {article.coverUrl ? <div className={styles.cardMedia}>
              {article.coverKind === "video" ? <video src={article.coverUrl} muted loop playsInline preload="metadata" /> : <Image src={article.coverUrl} alt={article.coverAlt || article.title} fill sizes="(max-width: 760px) 100vw, 50vw" />}
            </div> : null}
            <article className={styles.cardContent}>
              <span className={styles.eyebrow}>{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
            </article>
          </Link>
        ))}
      </section>

      <section className={styles.cta}>
        <h2>Zatrzymaj się nad jeziorem.</h2>
        <Link href="/rezerwacja">Sprawdź dostępność</Link>
      </section>
    </main>
  );
}
