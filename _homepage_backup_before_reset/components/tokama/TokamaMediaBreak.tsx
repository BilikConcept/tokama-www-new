import styles from "./TokamaMediaBreak.module.css";

type Locale = "pl" | "en";

type TokamaMediaBreakProps = {
  locale?: Locale;
  image: string;
  labelPl: string;
  labelEn: string;
  titlePl: React.ReactNode;
  titleEn: React.ReactNode;
};

export function TokamaMediaBreak({
  locale = "pl",
  image,
  labelPl,
  labelEn,
  titlePl,
  titleEn,
}: TokamaMediaBreakProps) {
  return (
    <section className={styles.section} data-reveal="image">
      <img src={image} alt="" aria-hidden="true" />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <p>{locale === "pl" ? labelPl : labelEn}</p>
        <h2>{locale === "pl" ? titlePl : titleEn}</h2>
      </div>
    </section>
  );
}
