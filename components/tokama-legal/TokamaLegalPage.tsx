import type { ReactNode } from "react";
import styles from "./TokamaLegalPage.module.css";

export type LegalSection = {
  title: string;
  paragraphs?: ReactNode[];
  items?: ReactNode[];
};

type Props = {
  title: string;
  updatedAt?: string;
  intro: ReactNode[];
  sections: LegalSection[];
  closing?: ReactNode;
};

export function TokamaLegalPage({ title, updatedAt, intro, sections, closing }: Props) {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <div className={styles.heading}>
          {updatedAt && <p className={styles.updated}>Ostatnia aktualizacja: {updatedAt}</p>}
          <h1>{title}</h1>
        </div>

        <div className={styles.intro}>
          {intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>

        <div className={styles.sections}>
          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>

              {section.paragraphs?.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              {section.items && (
                <ol type="a">
                  {section.items.map((item, index) => <li key={index}>{item}</li>)}
                </ol>
              )}
            </section>
          ))}
        </div>

        {closing && <p className={styles.closing}>{closing}</p>}
      </article>

    </main>
  );
}
