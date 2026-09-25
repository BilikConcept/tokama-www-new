import type { ArticleTableOfContentsEntry } from "@/lib/content-studio/journal";
import styles from "./ArticleTableOfContents.module.css";

function ContentsLinks({ entries }: { entries: ArticleTableOfContentsEntry[] }) {
  return <ol>
    {entries.map((entry, index) => <li key={entry.blockId} className={entry.level === 3 ? styles.nested : undefined}>
      <a href={`#${entry.id}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        {entry.label}
      </a>
    </li>)}
  </ol>;
}

export function ArticleTableOfContents({ entries }: { entries: ArticleTableOfContentsEntry[] }) {
  if (entries.length < 2) return null;

  return <section className={styles.section} aria-label="Spis treści">
    <nav className={styles.desktop} aria-labelledby="article-toc-heading">
      <p>W TYM ARTYKULE</p>
      <h2 id="article-toc-heading">Spis treści</h2>
      <ContentsLinks entries={entries} />
    </nav>
    <details className={styles.mobile}>
      <summary>Spis treści <span aria-hidden="true">+</span></summary>
      <ContentsLinks entries={entries} />
    </details>
  </section>;
}
