import Image from "next/image";
import Link from "next/link";
import type { PublicArticleSummary } from "@/lib/content-studio/public";
import styles from "./RelatedArticles.module.css";

export function RelatedArticles({ articles }: { articles: PublicArticleSummary[] }) {
  if (!articles.length) return null;

  return <section className={styles.section} aria-labelledby="related-articles-heading">
    <header className={styles.header}>
      <p>ODKRYWAJ DALEJ</p>
      <h2 id="related-articles-heading">Podobne artykuły</h2>
    </header>
    <div className={styles.grid}>
      {articles.map(article => <Link key={article.id} href={`/blog/${article.slug}`} className={styles.card}>
        <div className={styles.media}>
          {article.cover ? article.cover.kind === "video" ? (
            <video src={article.cover.public_url} muted loop playsInline preload="metadata" />
          ) : (
            <Image src={article.cover.public_url} alt={article.cover.alt_text || article.title} fill sizes="(max-width: 760px) 100vw, 33vw" />
          ) : <span>TOKAMA JOURNAL</span>}
        </div>
        <div className={styles.copy}>
          <p>{article.eyebrow || "TOKAMA JOURNAL"}</p>
          <h3>{article.title}</h3>
          <span>Czytaj artykuł →</span>
        </div>
      </Link>)}
    </div>
  </section>;
}
