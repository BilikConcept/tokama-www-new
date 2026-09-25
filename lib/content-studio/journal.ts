import type { StudioBlock } from "./types";

export type JournalCard = {
  slug: string;
  title: string;
  category: string;
  description: string;
  coverUrl?: string | null;
  coverKind?: "image" | "video" | null;
  coverAlt?: string;
};

export function mergeJournalCards(studio: JournalCard[], legacy: JournalCard[]) {
  const studioSlugs = new Set(studio.map((article) => article.slug));
  return [...studio, ...legacy.filter((article) => !studioSlugs.has(article.slug))];
}

export function selectHomepageArticle<T extends { seo?: Record<string, unknown>; updated_at?: string }>(articles: T[]) {
  const featured = articles
    .filter(article => article.seo?.homepageFeatured === true)
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return featured[0] || articles[0] || null;
}

export function formatJournalPublicationDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

type RelatedArticle = {
  slug: string;
  title: string;
  excerpt?: string | null;
  eyebrow?: string | null;
  published_at?: string | null;
};

const RELATED_STOP_WORDS = new Set([
  "oraz", "które", "ktore", "czy", "jak", "gdzie", "dla", "nad", "pod",
  "przy", "przez", "się", "sie", "jest", "jego", "ich", "tokama", "journal",
  "po", "na", "do", "w", "z", "i", "a", "o",
]);

function topicTokens(value: string) {
  return new Set(value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 4 && !RELATED_STOP_WORDS.has(token)));
}

export function selectRelatedArticles<T extends RelatedArticle>(current: T, articles: T[], limit = 3) {
  const currentTokens = topicTokens(`${current.title} ${current.excerpt || ""}`);
  const currentEyebrow = String(current.eyebrow || "").toLocaleLowerCase("pl-PL");

  return articles
    .filter(article => article.slug !== current.slug)
    .map(article => {
      const candidateTokens = topicTokens(`${article.title} ${article.excerpt || ""}`);
      const sharedTopics = [...candidateTokens].filter(token => currentTokens.has(token)).length;
      const sameSpecificCategory = currentEyebrow.length > 0
        && !["journal", "tokama journal"].includes(currentEyebrow)
        && String(article.eyebrow || "").toLocaleLowerCase("pl-PL") === currentEyebrow;
      return { article, score: sharedTopics * 10 + (sameSpecificCategory ? 3 : 0) };
    })
    .sort((a, b) => b.score - a.score
      || String(b.article.published_at || "").localeCompare(String(a.article.published_at || "")))
    .slice(0, limit)
    .map(({ article }) => article);
}

export type ArticleTableOfContentsEntry = {
  blockId: string;
  id: string;
  label: string;
  level: 2 | 3;
};

function headingAnchor(value: string) {
  return value
    .toLocaleLowerCase("pl-PL")
    .replaceAll("ł", "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getArticleTableOfContents(blocks: StudioBlock[]) {
  const usedIds = new Map<string, number>();

  return blocks.flatMap((block, index): ArticleTableOfContentsEntry[] => {
    if (block.type !== "headline") return [];
    const label = String(block.content.text || "").replace(/\s+/g, " ").trim();
    if (!label) return [];

    const baseId = `sekcja-${headingAnchor(label) || index + 1}`;
    const occurrence = (usedIds.get(baseId) || 0) + 1;
    usedIds.set(baseId, occurrence);

    return [{
      blockId: block.id,
      id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`,
      label,
      level: Number(block.content.level) === 3 ? 3 : 2,
    }];
  });
}

const AUTOMATIC_BOOKING_CTA: StudioBlock = {
  id: "automatic-journal-booking-cta",
  type: "booking-cta",
  content: {
    title: "Zostań trochę dłużej nad jeziorem.",
    text: "Sprawdź dostępne terminy i zaplanuj swój pobyt w TOKAMIE.",
    href: "/rezerwacja",
    ctaLabel: "Sprawdź dostępność",
  },
  settings: {
    width: "full",
    alignment: "center",
    spacing: "large",
    background: "ink",
    mediaRatio: "natural",
    sectionHeight: "auto",
    objectFit: "contain",
    hideDesktop: false,
    hideMobile: false,
  },
};

export function withAutomaticBookingCta(blocks: StudioBlock[]) {
  if (blocks.length < 2 || blocks.some(block => block.type === "booking-cta")) return blocks;

  const midpoint = Math.floor(blocks.length / 2);
  const nextSectionIndex = blocks.findIndex((block, index) =>
    index > midpoint && block.type === "headline"
  );
  const insertAfter = nextSectionIndex > 0
    ? nextSectionIndex - 1
    : Math.min(Math.max(midpoint, 0), blocks.length - 2);

  return [
    ...blocks.slice(0, insertAfter + 1),
    AUTOMATIC_BOOKING_CTA,
    ...blocks.slice(insertAfter + 1),
  ];
}

export type ArticleFaqItem = {
  question: string;
  answer: string;
};

function plainTextFromBlock(block?: StudioBlock) {
  if (!block || block.type !== "text") return "";
  const richText = block.content.richText as { kind?: string; parts?: Array<{ text?: string }>; items?: Array<Array<{ text?: string }>> } | undefined;
  if (richText?.kind === "paragraph") return (richText.parts || []).map(part => part.text || "").join("");
  if (richText?.kind === "unordered-list" || richText?.kind === "ordered-list") {
    return (richText.items || []).map(parts => parts.map(part => part.text || "").join("")).join("; ");
  }
  return String(block.content.text || "");
}

function faqQuestion(label: string) {
  const cleaned = label.replace(/[.!]+$/, "").trim();
  if (cleaned.endsWith("?")) return cleaned;
  if (/^(co|czy|dlaczego|gdzie|jak|kiedy|kto|ile|który|która|które)\b/i.test(cleaned)) return `${cleaned}?`;
  return `Co warto wiedzieć: ${cleaned}?`;
}

export function resolveArticleFaq(blocks: StudioBlock[], configured?: unknown, limit = 4): ArticleFaqItem[] {
  if (Array.isArray(configured)) {
    const valid = configured
      .map(item => ({
        question: String(item?.question || "").replace(/\s+/g, " ").trim(),
        answer: String(item?.answer || "").replace(/\s+/g, " ").trim(),
      }))
      .filter(item => item.question && item.answer);
    if (valid.length) return valid.slice(0, limit);
  }

  return blocks.flatMap((block, index): ArticleFaqItem[] => {
    if (block.type !== "headline") return [];
    const question = faqQuestion(String(block.content.text || ""));
    const answerBlock = blocks.slice(index + 1).find(candidate => candidate.type === "headline" || (candidate.type === "text" && plainTextFromBlock(candidate).trim()));
    if (!question || !answerBlock || answerBlock.type === "headline") return [];
    const answer = plainTextFromBlock(answerBlock).replace(/\s+/g, " ").trim();
    return answer ? [{ question, answer }] : [];
  }).slice(0, limit);
}
