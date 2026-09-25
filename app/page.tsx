import type { Metadata } from "next";
import { TokamaHome } from "@/components/tokama-home/TokamaHome";
import { getActivePackages, getHomepageArticle } from "@/lib/content-studio/public";
import { blogArticles } from "@/app/blog/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: {
    absolute: "Domki całoroczne TOKAMA nad jeziorem - Komfort i relaks",
  },

  description:
    "Komfortowe domki całoroczne TOKAMA nad jeziorem, idealne na wakacje i firmowe wyjazdy. Wyposażone w aneks kuchenny, Wi-Fi, saunę, basen i jacuzzi. Zarezerwuj już dziś i ciesz się relaksem przez cały rok!",

  keywords: [
    "domki całoroczne",
    "domki nad jeziorem",
    "wynajem domków",
    "domki TOKAMA",
    "komfortowe domki",
    "basen",
    "jacuzzi",
    "sauna",
    "wypoczynek nad jeziorem",
    "wyjazdy firmowe",
    "relaks w domkach",
  ],

  alternates: {
    canonical: "/",
    languages: {
      "pl-PL": "/",
      "en-GB": "/en",
    },
  },

  openGraph: {
    title: "Domki całoroczne TOKAMA nad jeziorem - Komfort i relaks",
    description:
      "Komfortowe domki całoroczne TOKAMA nad jeziorem, idealne na wakacje i firmowe wyjazdy. Wyposażone w aneks kuchenny, Wi-Fi, saunę, basen i jacuzzi. Zarezerwuj już dziś i ciesz się relaksem przez cały rok!",
    url: "/",
    locale: "pl_PL",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Domki całoroczne TOKAMA nad jeziorem - Komfort i relaks",
    description:
      "Komfortowe domki całoroczne TOKAMA nad jeziorem, idealne na wakacje i firmowe wyjazdy. Wyposażone w aneks kuchenny, Wi-Fi, saunę, basen i jacuzzi. Zarezerwuj już dziś i ciesz się relaksem przez cały rok!",
  },
};

export default async function HomePage() {
  const [packages, studioArticle] = await Promise.all([getActivePackages(), getHomepageArticle()]);
  const fallbackArticle = blogArticles[0];
  return <TokamaHome locale="pl" packages={packages.slice(0, 4).map(item => ({
    id: item.id, slug: item.slug, name: item.name, eyebrow: item.eyebrow,
    shortDescription: item.short_description, priceCents: item.package_price_cents,
    currency: item.currency, heroUrl: item.hero?.public_url || null,
    heroKind: item.hero?.kind || null, heroAlt: item.hero?.alt_text || item.name,
  }))} latestArticle={studioArticle ? {
    slug: studioArticle.slug, title: studioArticle.title, eyebrow: studioArticle.eyebrow,
    excerpt: studioArticle.excerpt, coverUrl: studioArticle.cover?.public_url || null,
    coverKind: studioArticle.cover?.kind || null, coverAlt: studioArticle.cover?.alt_text || studioArticle.title,
  } : fallbackArticle ? {
    slug: fallbackArticle.slug, title: fallbackArticle.title, eyebrow: fallbackArticle.category,
    excerpt: fallbackArticle.description, coverUrl: null, coverKind: null, coverAlt: fallbackArticle.title,
  } : null} />;
}
