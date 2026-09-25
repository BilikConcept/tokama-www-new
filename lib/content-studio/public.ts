import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { selectHomepageArticle } from "./journal";

export type PublicMedia = {
  id: string;
  public_url: string;
  alt_text: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
};

export type PublicPackage = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  short_description: string;
  description: string;
  regular_price_cents: number | null;
  package_price_cents: number | null;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  weekdays: number[];
  min_nights: number;
  max_guests: number | null;
  inclusions: string[];
  cta_label: string;
  featured: boolean;
  hero_media_id: string | null;
  gallery_media_ids: string[];
  booking_note: string;
  hero: PublicMedia | null;
  gallery: PublicMedia[];
};

export type PublicArticleSummary = {
  id: string;
  title: string;
  eyebrow: string;
  excerpt: string;
  slug: string;
  published_at: string;
  updated_at: string;
  seo: Record<string, unknown>;
  cover: Pick<PublicMedia, "public_url" | "alt_text" | "kind"> | null;
};

function hydratePackages(rows: Array<Record<string, unknown>>, media: PublicMedia[]) {
  const byId = new Map(media.map(asset => [asset.id, asset]));
  return rows.map(row => ({
    ...row,
    slug: String(row.slug || ""),
    gallery_media_ids: (row.gallery_media_ids as string[]) || [],
    inclusions: (row.inclusions as string[]) || [],
    weekdays: (row.weekdays as number[]) || [],
    hero: byId.get(String(row.hero_media_id || "")) || null,
    gallery: ((row.gallery_media_ids as string[]) || []).map(id => byId.get(id)).filter(Boolean),
  })) as PublicPackage[];
}

export async function getActivePackages() {
  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("tokama_packages")
    .select("*")
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });
  const ids = [...new Set((rows || []).flatMap(row => [row.hero_media_id, ...(row.gallery_media_ids || [])]).filter(Boolean))];
  const { data: media } = ids.length
    ? await supabase.from("tokama_media_assets").select("id,public_url,alt_text,kind,width,height").in("id", ids)
    : { data: [] };
  return hydratePackages((rows || []) as Array<Record<string, unknown>>, (media || []) as PublicMedia[]);
}

export async function getPackageBySlug(slug: string) {
  const packages = await getActivePackages();
  return packages.find(item => item.slug === slug) || null;
}

export async function getPublishedArticles(limit?: number) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tokama_articles")
    .select("id,title,eyebrow,excerpt,slug,published_at,updated_at,seo")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data: rows, error } = await query;
  if (error) {
    console.error("[journal] Failed to load published articles", { message: error.message });
    return [];
  }

  const coverIds = [...new Set((rows || []).map((article) => {
    const seo = article.seo as Record<string, unknown> | null;
    return seo?.coverMediaId || seo?.cover_media_id || seo?.ogImageId || seo?.og_image_id;
  }).filter((id): id is string => typeof id === "string" && id.length > 0))];
  const { data: covers, error: coversError } = coverIds.length
    ? await supabase.from("tokama_media_assets").select("id,public_url,alt_text,kind").in("id", coverIds)
    : { data: [], error: null };

  if (coversError) {
    console.error("[journal] Failed to load article covers", { message: coversError.message });
  }

  const coversById = new Map((covers || []).map((cover) => [cover.id, cover]));
  return (rows || []).map((article) => {
    const seo = (article.seo || {}) as Record<string, unknown>;
    const coverId = seo.coverMediaId || seo.cover_media_id || seo.ogImageId || seo.og_image_id;
    const cover = typeof coverId === "string" ? coversById.get(coverId) || null : null;
    return {
      ...article,
      seo,
      cover: cover ? { ...cover, alt_text: typeof seo.coverAlt === "string" ? seo.coverAlt : cover.alt_text } : null,
    };
  }) as PublicArticleSummary[];
}

export async function getLatestPublishedArticle() {
  const articles = await getPublishedArticles(1);
  return articles[0] || null;
}

export async function getHomepageArticle() {
  const articles = await getPublishedArticles();
  return selectHomepageArticle(articles);
}
