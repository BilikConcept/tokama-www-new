import assert from "node:assert/strict";
import test from "node:test";
import { formatJournalPublicationDate, getArticleTableOfContents, mergeJournalCards, resolveArticleFaq, selectHomepageArticle, selectRelatedArticles, withAutomaticBookingCta } from "../lib/content-studio/journal.ts";
import { createBlock } from "../lib/content-studio/types.ts";
import { getArticleSlugRedirect, LEGACY_ARTICLE_SLUGS } from "../lib/content-studio/article-slugs.ts";

test("numeric Journal URLs permanently map to descriptive article slugs", () => {
  assert.equal(
    getArticleSlugRedirect("21"),
    "sporty-wodne-na-pojezierzu-ilawskim"
  );
  assert.equal(getArticleSlugRedirect("unknown"), null);
  assert.equal(Object.keys(LEGACY_ARTICLE_SLUGS).length, 12);
  assert.ok(Object.values(LEGACY_ARTICLE_SLUGS).every((slug) => !/^\d+$/.test(slug)));
});

test("publication date is formatted in Polish for the article header", () => {
  assert.equal(formatJournalPublicationDate("2026-08-21T12:00:00Z"), "21 sierpnia 2026");
  assert.equal(formatJournalPublicationDate("not-a-date"), null);
  assert.equal(formatJournalPublicationDate(null), null);
});

test("related articles favor shared topics, exclude the current article and respect the limit", () => {
  const current = { slug: "sporty-wodne", title: "Sporty wodne na Jezioraku", excerpt: "SUP i żeglowanie", eyebrow: "JOURNAL", published_at: "2026-08-22" };
  const articles = [
    current,
    { slug: "zeglowanie", title: "Żeglowanie po Jezioraku", excerpt: "Sporty wodne", eyebrow: "JOURNAL", published_at: "2026-08-20" },
    { slug: "kajaki", title: "Kajakiem po Jezioraku", excerpt: "Trasy wodne", eyebrow: "JOURNAL", published_at: "2026-08-18" },
    { slug: "grzyby", title: "Grzybobranie w lasach", excerpt: "Jesienny przewodnik", eyebrow: "JOURNAL", published_at: "2026-08-21" },
    { slug: "rowery", title: "Trasy rowerowe", excerpt: "Aktywny wypoczynek", eyebrow: "JOURNAL", published_at: "2026-08-19" },
  ];

  assert.deepEqual(
    selectRelatedArticles(current, articles, 3).map(article => article.slug),
    ["zeglowanie", "kajaki", "grzyby"]
  );
});

test("table of contents is generated from headings with stable unique anchors", () => {
  const first = createBlock("headline");
  first.content.text = "Gdzie pływać na Jezioraku?";
  const paragraph = createBlock("text");
  paragraph.content.text = "Treść";
  const second = createBlock("headline");
  second.content.text = "Gdzie pływać na Jezioraku?";
  second.content.level = 3;

  assert.deepEqual(getArticleTableOfContents([first, paragraph, second]), [
    { blockId: first.id, id: "sekcja-gdzie-plywac-na-jezioraku", label: "Gdzie pływać na Jezioraku?", level: 2 },
    { blockId: second.id, id: "sekcja-gdzie-plywac-na-jezioraku-2", label: "Gdzie pływać na Jezioraku?", level: 3 },
  ]);
});

test("booking CTA is inserted near the middle and never duplicated", () => {
  const blocks = [createBlock("headline"), createBlock("text"), createBlock("headline"), createBlock("text"), createBlock("text"), createBlock("headline"), createBlock("text")];
  const withCta = withAutomaticBookingCta(blocks);
  const ctaIndex = withCta.findIndex(block => block.type === "booking-cta");

  assert.equal(withCta.length, blocks.length + 1);
  assert.ok(ctaIndex > 0 && ctaIndex < withCta.length - 1);
  assert.equal(withCta[ctaIndex].content.href, "/rezerwacja");
  assert.equal(withCta[ctaIndex + 1].type, "headline");

  const manualCta = createBlock("booking-cta");
  const withManualCta = [...blocks, manualCta];
  assert.strictEqual(withAutomaticBookingCta(withManualCta), withManualCta);
});

test("FAQ uses configured answers and otherwise derives them from article sections", () => {
  const heading = createBlock("headline");
  heading.content.text = "Gdzie pływać na SUP-ie";
  const answer = createBlock("text");
  answer.content.text = "Najlepiej wybrać spokojną zatokę Jezioraka.";

  assert.deepEqual(resolveArticleFaq([heading, answer]), [{
    question: "Gdzie pływać na SUP-ie?",
    answer: "Najlepiej wybrać spokojną zatokę Jezioraka.",
  }]);
  assert.deepEqual(resolveArticleFaq([heading, answer], [{ question: "Własne pytanie?", answer: "Własna odpowiedź." }]), [{
    question: "Własne pytanie?",
    answer: "Własna odpowiedź.",
  }]);
});

test("published Studio articles appear before legacy Journal entries", () => {
  const studio = [{ slug: "nowy", title: "Nowy", category: "JOURNAL", description: "Studio" }];
  const legacy = [{ slug: "stary", title: "Stary", category: "JEZIORAK", description: "Kod" }];

  assert.deepEqual(mergeJournalCards(studio, legacy).map((article) => article.slug), ["nowy", "stary"]);
});

test("Studio article replaces a legacy entry with the same slug", () => {
  const studio = [{ slug: "wspolny", title: "Studio", category: "JOURNAL", description: "Nowy" }];
  const legacy = [{ slug: "wspolny", title: "Legacy", category: "JEZIORAK", description: "Stary" }];

  assert.deepEqual(mergeJournalCards(studio, legacy), studio);
});

test("homepage uses the explicitly featured article instead of the newest one", () => {
  const articles = [
    { slug: "newest", updated_at: "2026-08-22T12:00:00Z", seo: {} },
    { slug: "featured", updated_at: "2026-08-20T12:00:00Z", seo: { homepageFeatured: true } },
  ];

  assert.equal(selectHomepageArticle(articles)?.slug, "featured");
});

test("the most recently selected homepage article wins if old data contains multiple selections", () => {
  const articles = [
    { slug: "old", updated_at: "2026-08-20T12:00:00Z", seo: { homepageFeatured: true } },
    { slug: "chosen", updated_at: "2026-08-22T12:00:00Z", seo: { homepageFeatured: true } },
  ];

  assert.equal(selectHomepageArticle(articles)?.slug, "chosen");
});
