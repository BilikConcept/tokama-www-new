import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import styles from "../Blog.module.css";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ArticlePresentation } from "@/components/content-studio/ArticlePresentation";
import type { ArticleRendererMedia } from "@/components/content-studio/ArticleRenderer";
import { getArticleSlugRedirect } from "@/lib/content-studio/article-slugs";
import { getPublishedArticles } from "@/lib/content-studio/public";
import { resolveArticleFaq, selectRelatedArticles } from "@/lib/content-studio/journal";
import { RelatedArticles } from "@/components/content-studio/RelatedArticles";
import { ArticleFaq } from "@/components/content-studio/ArticleFaq";

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ preview?: string }>;
};

export const dynamic = "force-dynamic";

const getStudioArticle = cache(async (slug: string, preview?: string) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("tokama_articles").select("*").eq("slug", slug);
    query = preview ? query.eq("preview_token", preview) : query.eq("status", "published").lte("published_at", new Date().toISOString());
    const { data } = await query.maybeSingle();
    return data;
  } catch { return null; }
});

export async function generateMetadata({
  params,
  searchParams,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const studio = await getStudioArticle(slug, preview);
  if (studio) {
    const seo = studio.seo || {};
    const coverId = seo.coverMediaId || seo.cover_media_id || seo.ogImageId || seo.og_image_id;
    const supabase = getSupabaseAdmin();
    const { data: cover } = coverId ? await supabase.from("tokama_media_assets").select("public_url,alt_text").eq("id", coverId).maybeSingle() : { data: null };
    return { title: seo.title || studio.title, description: seo.description || studio.excerpt,
      alternates: { canonical: seo.canonical || `/blog/${studio.slug}` }, robots: seo.noindex || preview ? { index: false, follow: false } : undefined,
      authors: seo.author ? [{ name: seo.author }] : undefined,
      openGraph: { title: seo.title || studio.title, description: seo.description || studio.excerpt, type: "article", publishedTime: studio.published_at || undefined, modifiedTime: studio.updated_at || undefined, images: cover ? [{ url: cover.public_url, alt: seo.coverAlt || cover.alt_text || studio.title }] : undefined } };
  }
  return {};
}

export default async function BlogArticlePage({
  params,
  searchParams,
}: BlogArticlePageProps) {
  const { slug } = await params;
  const redirectSlug = getArticleSlugRedirect(slug);
  if (redirectSlug) permanentRedirect(`/blog/${redirectSlug}`);
  const { preview } = await searchParams;
  const studio = await getStudioArticle(slug, preview);
  if (studio) {
    const coverMediaId = studio.seo?.coverMediaId || studio.seo?.cover_media_id || studio.seo?.ogImageId || studio.seo?.og_image_id || null;
    const ids = [...new Set([...(JSON.stringify(studio.blocks || []).match(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi) || []), coverMediaId].filter(Boolean))];
    const supabase = getSupabaseAdmin();
    const { data: media } = ids.length ? await supabase.from("tokama_media_assets").select("id,public_url,alt_text,kind,width,height").in("id", ids) : { data: [] };
    const related = selectRelatedArticles(studio, await getPublishedArticles(), 3);
    const faq = resolveArticleFaq(studio.blocks || [], studio.seo?.faq);
    const faqJsonLd = faq.length ? JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(item => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }).replaceAll("<", "\\u003c") : null;
    return <main className={styles.page}><ArticlePresentation title={studio.title} eyebrow={studio.eyebrow} excerpt={studio.excerpt} author={studio.seo?.author} publishedAt={studio.published_at || studio.created_at} coverMediaId={coverMediaId} coverAlt={studio.seo?.coverAlt} blocks={studio.blocks || []} media={(media || []) as ArticleRendererMedia[]} /><ArticleFaq items={faq} /><RelatedArticles articles={related} />{faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} /> : null}{studio.seo?.jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: studio.seo.jsonLd }} /> : null}</main>;
  }
  notFound();
}
