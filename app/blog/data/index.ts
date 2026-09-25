import type { BlogArticle } from "./types";

// Journal is managed exclusively in TOKAMA Content Studio.
export const blogArticles: BlogArticle[] = [];

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}
