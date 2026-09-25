import type { Metadata } from "next";
import { TokamaHome } from "@/components/tokama-home/TokamaHome";
import { getActivePackages, getLatestPublishedArticle } from "@/lib/content-studio/public";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: {
    canonical: "/en",
  },

  title: "TOKAMA — lakeside cottages near Iława",
  description: "Three year-round lakeside cottages in Windyki near Iława.",
};

export default async function EnglishHomePage() {
  const [packages, article] = await Promise.all([getActivePackages(), getLatestPublishedArticle()]);
  return <TokamaHome locale="en" packages={packages.slice(0, 4).map(item => ({
    id: item.id, slug: item.slug, name: item.name, eyebrow: item.eyebrow,
    shortDescription: item.short_description, priceCents: item.package_price_cents,
    currency: item.currency, heroUrl: item.hero?.public_url || null,
    heroKind: item.hero?.kind || null, heroAlt: item.hero?.alt_text || item.name,
  }))} latestArticle={article ? {
    slug: article.slug, title: article.title, eyebrow: article.eyebrow, excerpt: article.excerpt,
    coverUrl: article.cover?.public_url || null, coverKind: article.cover?.kind || null,
    coverAlt: article.cover?.alt_text || article.title,
  } : null} />;
}
