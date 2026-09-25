import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const MENU_URL = "https://kanzan-food.pl/menu";
const OUTPUT_PATH = path.join(process.cwd(), "tmp", "kanzan-menu-preview.json");

function clean(value = "") {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalized(value = "") {
  return clean(value).toLocaleLowerCase("pl-PL");
}

function priceMatches(value = "") {
  return [...value.matchAll(/(\d+(?:[.,]\d{2})?)\s*zł\b/gi)];
}

function uniqueBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, item);
  }

  return [...map.values()];
}

async function load(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "TOKAMA Kanzan menu preview/1.0",
      "accept-language": "pl-PL,pl;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Nie udało się pobrać ${url} (HTTP ${response.status}).`);
  }

  return response.text();
}

function textWithBreaks($, node) {
  const copy = $(node).clone();

  copy.find("script, style, noscript, svg").remove();
  copy.find("br").replaceWith("\n");
  copy.find("p, h1, h2, h3, h4, h5, h6, li").each((_, element) => {
    $(element).append("\n");
  });

  return clean(copy.text());
}

function getCategoryLinks(html) {
  const $ = cheerio.load(html);
  const links = [];

  $("a[href]").each((_, anchor) => {
    const href = $(anchor).attr("href") || "";
    const label = clean($(anchor).text());

    if (!href || !label) return;

    let url;
    try {
      url = new URL(href, MENU_URL);
    } catch {
      return;
    }

    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    const isCategory =
      pathname.startsWith("/menu/") &&
      pathname !== "/menu" &&
      !pathname.includes("/page/");

    if (!isCategory) return;

    links.push({
      url: url.toString(),
      slug: pathname.split("/").filter(Boolean).at(-1),
      label: label.replace(/\s+od\s+\d+(?:[.,]\d{2})?\s*zł.*$/i, "").trim(),
    });
  });

  return uniqueBy(links, (item) => item.url);
}

function extractProductCandidates(html) {
  const $ = cheerio.load(html);
  const candidates = [];

  $("article, li, div, section").each((_, node) => {
    const text = textWithBreaks($, node);
    const prices = priceMatches(text);

    if (
      prices.length !== 1 ||
      text.length < 18 ||
      text.length > 1100 ||
      !/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(text)
    ) {
      return;
    }

    const childHasCandidate = $(node)
      .children("article, li, div, section")
      .toArray()
      .some((child) => {
        const childText = textWithBreaks($, child);
        return (
          priceMatches(childText).length === 1 &&
          childText.length >= 18 &&
          childText.length < text.length
        );
      });

    if (childHasCandidate) return;

    const price = Number(prices[0][1].replace(",", "."));
    const priceCents = Math.round(price * 100);
    const beforePrice = clean(text.slice(0, prices[0].index));
    const lines = beforePrice
      .split("\n")
      .map((line) => clean(line))
      .filter(Boolean);

    const name = lines[0] || "";
    const description = clean(lines.slice(1).join(" "));

    if (
      !name ||
      normalized(name).includes("godziny otwarcia") ||
      normalized(name).includes("przyjdź") ||
      normalized(name).includes("kontakt")
    ) {
      return;
    }

    candidates.push({
      name,
      description,
      base_price_cents: priceCents,
      raw_text: text,
    });
  });

  return uniqueBy(
    candidates,
    (item) =>
      `${normalized(item.name)}|${item.base_price_cents}|${normalized(item.description)}`
  );
}

async function main() {
  const menuHtml = await load(MENU_URL);
  const categories = getCategoryLinks(menuHtml);

  if (!categories.length) {
    throw new Error("Nie znaleziono kategorii menu Kanzan.");
  }

  const result = {
    generated_at: new Date().toISOString(),
    source_url: MENU_URL,
    categories: [],
  };

  for (const [index, category] of categories.entries()) {
    process.stdout.write(`Pobieram ${index + 1}/${categories.length}: ${category.label}\n`);

    const html = await load(category.url);
    const $ = cheerio.load(html);
    const title = clean($("h1").first().text()) || category.label;
    const products = extractProductCandidates(html);

    result.categories.push({
      ...category,
      name_pl: title,
      products,
    });
  }

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n", "utf8");

  const productCount = result.categories.reduce(
    (sum, category) => sum + category.products.length,
    0
  );

  console.log("\n--- PODGLĄD GOTOWY ---");
  console.log(`Kategorie: ${result.categories.length}`);
  console.log(`Odczytane pozycje: ${productCount}`);
  console.log(`Plik: ${OUTPUT_PATH}`);

  for (const category of result.categories) {
    console.log(`\n${category.name_pl}: ${category.products.length}`);
    for (const product of category.products.slice(0, 3)) {
      console.log(`- ${product.name} · ${(product.base_price_cents / 100).toFixed(2)} zł`);
    }
  }
}

main().catch((error) => {
  console.error("\nBłąd podglądu:", error.message);
  process.exit(1);
});
