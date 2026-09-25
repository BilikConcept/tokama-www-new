import Link from "next/link";
import styles from "./TokamaAreaPage.module.css";

type AreaSection = {
  number: string;
  title: string;
  paragraphs: string[];
  href?: string;
  linkLabel?: string;
};

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  sections: AreaSection[];
};

export function TokamaAreaPage({ eyebrow, title, lead, sections }: Props) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>
      </section>

      <section className={styles.content}>
        <p className={styles.sectionLabel}>W pobliżu TOKAMY</p>

        <div className={styles.sections}>
          {sections.map((section) => (
            <article className={styles.section} key={section.number}>
              <p className={styles.number}>{section.number}</p>

              <div className={styles.sectionContent}>
                <h2>{section.title}</h2>

                <div className={styles.copy}>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>

                {section.href && section.linkLabel ? (
                  <Link className={styles.textLink} href={section.href}>
                    {section.linkLabel}
                    <span aria-hidden="true">↗</span>
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
