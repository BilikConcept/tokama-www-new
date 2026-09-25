import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_INDEX = "https://tokama.pl/blog/";
const EXPECTED_ARTICLES = 20;
const BUCKET = "tokama-content";
const execute = process.argv.includes("--execute");
const backupArgument = process.argv.find(argument => argument.startsWith("--backup="));
const backupPath = backupArgument
  ? backupArgument.slice("--backup=".length)
  : path.join(process.cwd(), "work", `tokama-blog-backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
const { loadEnvConfig } = nextEnv;

function settings(overrides = {}) {
  return {
    width: "content",
    alignment: "left",
    spacing: "small",
    background: "white",
    mediaRatio: "natural",
    sectionHeight: "auto",
    objectFit: "contain",
    hideDesktop: false,
    hideMobile: false,
    ...overrides,
  };
}

function block(type, content, overrides = {}) {
  return { id: crypto.randomUUID(), type, content, settings: settings(overrides) };
}

async function fetchOk(url) {
  const response = await fetch(url, { headers: { "user-agent": "TOKAMA Content Studio migration/1.0" } });
  if (!response.ok) throw new Error(`${response.status} podczas pobierania ${url}`);
  return response;
}

function normalizeHref(value, pageUrl) {
  if (!value) return undefined;
  try {
    const url = new URL(value, pageUrl);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    if (url.hostname === "tokama.pl" || url.hostname === "www.tokama.pl") return `${url.pathname}${url.search}${url.hash}`;
    return url.href;
  } catch { return undefined; }
}

function inlineParts($, root, pageUrl) {
  const parts = [];
  function append(text, marks) {
    const normalized = text.replace(/\s+/g, " ");
    if (!normalized) return;
    const previous = parts.at(-1);
    if (previous && previous.bold === marks.bold && previous.italic === marks.italic && previous.href === marks.href) previous.text += normalized;
    else parts.push({ text: normalized, ...marks });
  }
  function visit(node, marks = {}) {
    if (node.type === "text") {
      append(node.data || "", marks);
      return;
    }
    if (node.type !== "tag") return;
    const tag = node.tagName?.toLowerCase();
    if (tag === "br") {
      append("\n", marks);
      return;
    }
    const nextMarks = {
      ...marks,
      ...(["strong", "b"].includes(tag) ? { bold: true } : {}),
      ...(["em", "i"].includes(tag) ? { italic: true } : {}),
      ...(tag === "a" ? { href: normalizeHref($(node).attr("href"), pageUrl) } : {}),
    };
    for (const child of node.children || []) visit(child, nextMarks);
  }
  for (const child of root.children || []) visit(child);
  if (parts.length) {
    parts[0].text = parts[0].text.trimStart();
    parts.at(-1).text = parts.at(-1).text.trimEnd();
  }
  return parts.filter(part => part.text.length > 0);
}

function articleBlocks($, container, pageUrl) {
  const blocks = [];
  container.children().each((_, element) => {
    const tag = element.tagName?.toLowerCase();
    if (["h2", "h3"].includes(tag)) {
      const text = $(element).text().replace(/\s+/g, " ").trim();
      if (text) blocks.push(block("headline", { text, level: tag === "h3" ? 3 : 2 }, { spacing: "medium" }));
      return;
    }
    if (tag === "p") {
      const parts = inlineParts($, element, pageUrl);
      const text = $(element).text().replace(/\s+/g, " ").trim();
      if (text) blocks.push(block("text", { text, richText: { kind: "paragraph", parts } }));
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from($(element).children("li")).map(item => inlineParts($, item, pageUrl));
      const text = $(element).children("li").map((index, item) => `${tag === "ol" ? `${index + 1}.` : "•"} ${$(item).text().replace(/\s+/g, " ").trim()}`).get().join("\n");
      if (items.length) blocks.push(block("text", { text, richText: { kind: tag === "ol" ? "ordered-list" : "unordered-list", items } }));
      return;
    }
    if (tag === "blockquote") {
      const text = $(element).text().replace(/\s+/g, " ").trim();
      if (text) blocks.push(block("quote", { text }, { spacing: "medium" }));
    }
  });
  return blocks;
}

async function collectSource() {
  const indexHtml = await (await fetchOk(SOURCE_INDEX)).text();
  const $index = cheerio.load(indexHtml);
  const links = [];
  $index("a").each((_, anchor) => {
    const href = $index(anchor).attr("href");
    if (!href || !/więcej/i.test($index(anchor).text())) return;
    const url = new URL(href, SOURCE_INDEX).href.replace(/\/$/, "");
    if (!links.includes(url)) links.push(url);
  });
  if (links.length !== EXPECTED_ARTICLES) throw new Error(`Znaleziono ${links.length} artykułów zamiast ${EXPECTED_ARTICLES}. Migracja zatrzymana.`);

  const articles = [];
  for (const [index, pageUrl] of links.entries()) {
    const html = await (await fetchOk(pageUrl)).text();
    const $ = cheerio.load(html);
    const article = $("article").first();
    const content = article.find(".article-text").first();
    const title = article.find("h1").first().text().replace(/\s+/g, " ").trim();
    const description = $("meta[name=description]").attr("content")?.replace(/\s+/g, " ").trim() || content.find("p").first().text().replace(/\s+/g, " ").trim();
    const hero = article.children("img").first();
    const heroSrc = hero.attr("src");
    if (!title || !content.length || !heroSrc) throw new Error(`Niepełny artykuł źródłowy: ${pageUrl}`);
    const slug = new URL(pageUrl).pathname.split("/").filter(Boolean).at(-1);
    const blocks = articleBlocks($, content, pageUrl);
    if (!slug || blocks.length !== content.children().length) throw new Error(`Nie udało się odwzorować wszystkich sekcji: ${pageUrl}`);
    articles.push({
      sourceUrl: pageUrl,
      slug,
      title,
      description,
      heroUrl: new URL(heroSrc, pageUrl).href,
      heroAlt: hero.attr("alt")?.trim() || title,
      blocks,
      sourceOrder: index,
    });
  }
  if (new Set(articles.map(article => article.slug)).size !== EXPECTED_ARTICLES) throw new Error("Powtarzające się adresy artykułów. Migracja zatrzymana.");

  const images = new Map();
  for (const article of articles) {
    if (images.has(article.heroUrl)) continue;
    const response = await fetchOk(article.heroUrl);
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/webp";
    if (!mimeType.startsWith("image/")) throw new Error(`Nieprawidłowy format obrazu: ${article.heroUrl}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error(`Pusty obraz: ${article.heroUrl}`);
    images.set(article.heroUrl, { bytes, mimeType, altText: article.heroAlt, slug: article.slug });
  }
  return { articles, images };
}

function imageExtension(mimeType) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif", "image/webp": "webp" })[mimeType] || "img";
}

async function imageDimensions(bytes) {
  try {
    const { default: sharp } = await import("sharp");
    const metadata = await sharp(bytes).metadata();
    return { width: metadata.width || null, height: metadata.height || null };
  } catch { return { width: null, height: null }; }
}

async function cleanupImportedMedia(supabase, uploaded) {
  if (!uploaded.length) return;
  await supabase.from("tokama_media_assets").delete().in("id", uploaded.map(item => item.id));
  await supabase.storage.from(BUCKET).remove(uploaded.map(item => item.storage_path));
}

async function restoreBackup(supabase, backup) {
  await supabase.from("tokama_articles").delete().not("id", "is", null);
  if (backup.articles.length) {
    const restored = await supabase.from("tokama_articles").insert(backup.articles);
    if (restored.error) throw new Error(`Nie udało się odtworzyć artykułów: ${restored.error.message}`);
  }
  if (backup.versions.length) {
    const restoredVersions = await supabase.from("tokama_article_versions").insert(backup.versions);
    if (restoredVersions.error) throw new Error(`Nie udało się odtworzyć wersji: ${restoredVersions.error.message}`);
  }
}

const source = await collectSource();
const totalBytes = [...source.images.values()].reduce((sum, image) => sum + image.bytes.length, 0);
console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", articles: source.articles.length, uniqueImages: source.images.size, imageBytes: totalBytes, slugs: source.articles.map(article => article.slug) }, null, 2));
if (!execute) process.exit(0);

loadEnvConfig(process.cwd());
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Brak konfiguracji Supabase.");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [{ data: existingArticles, error: articlesError }, { data: existingVersions, error: versionsError }] = await Promise.all([
  supabase.from("tokama_articles").select("*"),
  supabase.from("tokama_article_versions").select("*"),
]);
if (articlesError) throw articlesError;
if (versionsError) throw versionsError;
const backup = { createdAt: new Date().toISOString(), source: SOURCE_INDEX, articles: existingArticles || [], versions: existingVersions || [] };
await mkdir(path.dirname(backupPath), { recursive: true });
await writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

const uploaded = [];
let deletedExisting = false;
try {
  const mediaBySourceUrl = new Map();
  for (const [sourceUrl, image] of source.images) {
    const dimensions = await imageDimensions(image.bytes);
    const fileName = `tokama-blog-${image.slug}.${imageExtension(image.mimeType)}`;
    const storagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${fileName}`;
    const upload = await supabase.storage.from(BUCKET).upload(storagePath, image.bytes, { contentType: image.mimeType, cacheControl: "31536000", upsert: false });
    if (upload.error) throw new Error(`Upload ${fileName}: ${upload.error.message}`);
    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const inserted = await supabase.from("tokama_media_assets").insert({
      storage_path: storagePath,
      public_url: publicUrl.publicUrl,
      file_name: fileName,
      mime_type: image.mimeType,
      kind: "image",
      size_bytes: image.bytes.length,
      width: dimensions.width,
      height: dimensions.height,
      alt_text: image.altText,
      tags: ["BLOG_IMPORT", "COVER", "SOURCE_TOKAMA_PL"],
    }).select("*").single();
    if (inserted.error) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`Metadane ${fileName}: ${inserted.error.message}`);
    }
    uploaded.push(inserted.data);
    mediaBySourceUrl.set(sourceUrl, inserted.data);
  }

  const deletion = await supabase.from("tokama_articles").delete().not("id", "is", null);
  if (deletion.error) throw new Error(`Usuwanie obecnych artykułów: ${deletion.error.message}`);
  deletedExisting = true;

  const publishedBase = Date.now();
  const rows = source.articles.map((article, index) => {
    const cover = mediaBySourceUrl.get(article.heroUrl);
    const publishedAt = new Date(publishedBase - index * 60_000).toISOString();
    return {
      title: article.title,
      eyebrow: "TOKAMA JOURNAL",
      excerpt: article.description,
      slug: article.slug,
      status: "published",
      scheduled_at: null,
      published_at: publishedAt,
      blocks: article.blocks,
      seo: {
        title: article.title,
        description: article.description,
        author: "TOKAMA",
        coverMediaId: cover.id,
        coverAlt: article.heroAlt,
        homepageFeatured: index === 0,
        ogImageId: cover.id,
        canonical: `/blog/${article.slug}`,
        noindex: false,
        jsonLd: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, image: cover.public_url, author: { "@type": "Organization", name: "TOKAMA" }, mainEntityOfPage: `/blog/${article.slug}` }),
        sourceUrl: article.sourceUrl,
      },
      current_version: 1,
    };
  });
  const inserted = await supabase.from("tokama_articles").insert(rows).select("id,slug,status,seo");
  if (inserted.error) throw new Error(`Import artykułów: ${inserted.error.message}`);
  if (inserted.data?.length !== EXPECTED_ARTICLES) throw new Error(`Zapisano ${inserted.data?.length || 0} artykułów zamiast ${EXPECTED_ARTICLES}.`);

  const { data: verified, error: verifyError } = await supabase.from("tokama_articles").select("id,slug,title,status,blocks,seo").order("published_at", { ascending: false });
  if (verifyError) throw verifyError;
  const invalid = (verified || []).filter(article => article.status !== "published" || !article.blocks?.length || !article.seo?.coverMediaId);
  if (verified?.length !== EXPECTED_ARTICLES || invalid.length) throw new Error("Kontrola importu nie przeszła.");
  console.log(JSON.stringify({ ok: true, backupPath, removedArticles: backup.articles.length, importedArticles: verified.length, importedMedia: uploaded.length, featuredSlug: verified.find(article => article.seo?.homepageFeatured)?.slug }, null, 2));
} catch (error) {
  if (deletedExisting) await restoreBackup(supabase, backup);
  await cleanupImportedMedia(supabase, uploaded);
  throw error;
}
