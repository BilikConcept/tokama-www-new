"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./Gallery.module.css";

type GalleryImage = {
  src: string;
  alt: string;
  category: string;
  ratio: "portrait" | "landscape" | "wide";
};

type GalleryClientProps = {
  images: GalleryImage[];
};

export default function GalleryClient({
  images,
}: GalleryClientProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function closeLightbox() {
    setActiveIndex(null);
  }

  function showPrevious() {
    setActiveIndex((current) => {
      if (current === null) return null;
      return current === 0 ? images.length - 1 : current - 1;
    });
  }

  function showNext() {
    setActiveIndex((current) => {
      if (current === null) return null;
      return current === images.length - 1 ? 0 : current + 1;
    });
  }

  useEffect(() => {
    if (activeIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex]);

  return (
    <>
      <section className={styles.gallery} aria-label="Galeria TOKAMA">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className={`${styles.galleryItem} ${styles[image.ratio]}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Otwórz zdjęcie: ${image.alt}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
              className={styles.galleryImage}
            />

            <span className={styles.imageOverlay}>
              <span>{image.category}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </span>
          </button>
        ))}
      </section>

      {activeIndex !== null && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd zdjęcia"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeLightbox}
            aria-label="Zamknij galerię"
          >
            Zamknij
          </button>

          <button
            type="button"
            className={`${styles.navigationButton} ${styles.previousButton}`}
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            aria-label="Poprzednie zdjęcie"
          >
            ←
          </button>

          <div
            className={styles.lightboxImage}
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              fill
              priority
              sizes="100vw"
              className={styles.lightboxPhoto}
            />
          </div>

          <div className={styles.lightboxCaption}>
            <span>{images[activeIndex].category}</span>
            <span>
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(images.length).padStart(2, "0")}
            </span>
          </div>

          <button
            type="button"
            className={`${styles.navigationButton} ${styles.nextButton}`}
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Następne zdjęcie"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
