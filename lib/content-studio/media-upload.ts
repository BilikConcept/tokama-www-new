export const MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024;

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const MEDIA_ACCEPT = ALLOWED_MEDIA_MIME_TYPES.join(",");

const allowedMediaTypes = new Set<string>(ALLOWED_MEDIA_MIME_TYPES);
const managedMediaPath = /^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}-[^/]+$/i;

export function validateMediaFile(fileName: string, mimeType: string, sizeBytes: number) {
  if (!fileName.trim()) return "Plik nie ma prawidłowej nazwy.";
  if (!allowedMediaTypes.has(mimeType)) return "Dozwolone są JPG, PNG, WebP, AVIF, MP4, MOV i WebM.";
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "Plik jest pusty.";
  if (sizeBytes > MAX_MEDIA_FILE_SIZE) return "Plik jest większy niż 100 MB.";
  return null;
}

export function safeMediaFileName(fileName: string) {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safeName || "media";
}

export function isManagedMediaPath(path: string) {
  return managedMediaPath.test(path);
}
