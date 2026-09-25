import assert from "node:assert/strict";
import test from "node:test";
import { isManagedMediaPath, MAX_MEDIA_FILE_SIZE, safeMediaFileName, validateMediaFile } from "../lib/content-studio/media-upload.ts";

test("media validation accepts supported files and rejects unsafe uploads", () => {
  assert.equal(validateMediaFile("dom.jpg", "image/jpeg", 1024), null);
  assert.equal(validateMediaFile("film.mov", "video/quicktime", MAX_MEDIA_FILE_SIZE), null);
  assert.match(validateMediaFile("plik.svg", "image/svg+xml", 512) || "", /Dozwolone/);
  assert.match(validateMediaFile("film.mp4", "video/mp4", MAX_MEDIA_FILE_SIZE + 1) || "", /100 MB/);
});

test("media path helpers keep names safe and restrict cleanup targets", () => {
  assert.equal(safeMediaFileName("Łódź — lato 2026.jpg"), "odz-lato-2026.jpg");
  assert.equal(isManagedMediaPath("2026-08-22/8d6f14fc-5a29-437c-a7aa-e460969431c5-lato.jpg"), true);
  assert.equal(isManagedMediaPath("../inne/zdjecie.jpg"), false);
});
