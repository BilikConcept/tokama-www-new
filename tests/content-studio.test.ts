import test from "node:test";
import assert from "node:assert/strict";
import { BLOCK_TYPES, createBlock } from "../lib/content-studio/types.ts";

test("Article Studio exposes every editorial block required by TOKAMA", () => {
  assert.deepEqual(BLOCK_TYPES, [
    "text", "eyebrow", "headline", "full-width-image", "full-bleed-image",
    "portrait-image", "landscape-image", "image-text", "text-image", "two-images",
    "three-images", "editorial-grid", "horizontal-gallery", "carousel", "quote", "video",
    "cottage-card", "package-card", "booking-cta", "experience-card", "kanzan-card",
    "amenities", "related-stay",
  ]);
});

test("images preserve their natural ratio and do not crop by default", () => {
  const image = createBlock("landscape-image");
  assert.equal(image.settings.mediaRatio, "natural");
  assert.equal(image.settings.objectFit, "contain");
  assert.equal(image.settings.hideDesktop, false);
  assert.equal(image.settings.hideMobile, false);
});

test("full bleed is the only image preset that consciously opts into crop", () => {
  const image = createBlock("full-bleed-image");
  assert.equal(image.settings.width, "full");
  assert.equal(image.settings.objectFit, "cover");
});

test("every selected block keeps its own requested type", () => {
  for (const type of BLOCK_TYPES) {
    assert.equal(createBlock(type).type, type);
  }
});

test("editorial cards and CTA receive usable type-specific fields", () => {
  const cottage = createBlock("cottage-card");
  const cta = createBlock("booking-cta");

  assert.equal(cottage.content.title, "Domek TOKAMA");
  assert.equal(cottage.content.href, "/domki");
  assert.deepEqual(cottage.content.mediaIds, []);
  assert.equal(cta.content.ctaLabel, "Sprawdź dostępność");
  assert.equal(cta.content.href, "/rezerwacja");
});
