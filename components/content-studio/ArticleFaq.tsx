import type { ArticleFaqItem } from "@/lib/content-studio/journal";
import styles from "./ArticleFaq.module.css";

export function ArticleFaq({ items }: { items: ArticleFaqItem[] }) {
  if (!items.length) return null;

  return <section className={styles.section} aria-labelledby="article-faq-heading">
    <header>
      <p>WARTO WIEDZIEĆ</p>
      <h2 id="article-faq-heading">Najczęstsze pytania</h2>
    </header>
    <div className={styles.items}>
      {items.map((item, index) => <details key={`${item.question}-${index}`}>
        <summary><span>{item.question}</span><b aria-hidden="true">+</b></summary>
        <div><p>{item.answer}</p></div>
      </details>)}
    </div>
  </section>;
}
