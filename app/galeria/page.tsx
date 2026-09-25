import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import GalleryClient from "./GalleryClient";
import styles from "./Gallery.module.css";

export const metadata: Metadata = {
  title: "Galeria TOKAMA — domki nad jeziorem koło Iławy",
  description:
    "Zobacz TOKAMA: wnętrza domków, przestrzeń do relaksu i wyjątkowe chwile w Windykach koło Iławy.",
  alternates: {
    canonical: "/galeria",
  },
  openGraph: {
    title: "Galeria TOKAMA — domki nad jeziorem koło Iławy",
    description:
      "Wnętrza, natura i spokojny rytm pobytu w TOKAMA.",
    url: "/galeria",
    type: "website",
    locale: "pl_PL",
  },
};

const supportedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);

function naturalSort(a: string, b: string) {
  return a.localeCompare(b, "pl", {
    numeric: true,
    sensitivity: "base",
  });
}

function getGalleryImages() {
  const galleryDirectory = path.join(
    process.cwd(),
    "public",
    "images",
    "tokama-wnetrza",
  );

  if (!fs.existsSync(galleryDirectory)) {
    return [];
  }

  return fs
    .readdirSync(galleryDirectory, {
      withFileTypes: true,
    })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) =>
      supportedExtensions.has(path.extname(fileName).toLowerCase()),
    )
    .sort(naturalSort)
    .map((fileName, index) => ({
      src: `/images/tokama-wnetrza/${encodeURIComponent(fileName)}`,
      alt: `TOKAMA — wnętrza domków nad jeziorem, zdjęcie ${index + 1}`,
      category: "Wnętrza",
      ratio: (
        index % 5 === 2
          ? "wide"
          : index % 3 === 0
            ? "portrait"
            : "landscape"
      ) as "wide" | "portrait" | "landscape",
    }));
}

export default function GalleryPage() {
  const galleryImages = getGalleryImages();

  const imageGalleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Galeria TOKAMA",
    description:
      "Galeria domków TOKAMA i ich wnętrz w Windykach koło Iławy.",
    url: "https://tokama.pl/galeria",
    image: galleryImages.map((image) => ({
      "@type": "ImageObject",
      contentUrl: `https://tokama.pl${image.src}`,
      caption: image.alt,
    })),
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(imageGalleryJsonLd),
        }}
      />

      <header className={styles.hero}>
        <p className={styles.eyebrow}>TOKAMA GALLERY</p>

        <h1>
          Zobacz miejsce,
          <br />
          <em>do którego się wraca.</em>
        </h1>

        <p className={styles.lead}>
          Trzy domki, natura i kadry z pobytów, spokojnych poranków oraz
          wieczorów, które trwają trochę dłużej.
        </p>
      </header>

      {galleryImages.length > 0 ? (
        <GalleryClient images={galleryImages} />
      ) : (
        <section className={styles.empty}>
          <p>Galeria jest w przygotowaniu.</p>
        </section>
      )}

      <section className={styles.closing}>
        <p className={styles.eyebrow}>TWÓJ POBYT</p>

        <h2>
          Resztę zobaczysz
          <br />
          <em>na miejscu.</em>
        </h2>

        <a href="/rezerwacja">Sprawdź dostępność</a>
      </section>
    </main>
  );
}
