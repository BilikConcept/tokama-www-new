import { NextResponse } from "next/server";
import { requireContentAdmin } from "@/lib/content-studio/auth";
import { isManagedMediaPath, safeMediaFileName, validateMediaFile } from "@/lib/content-studio/media-upload";

const BUCKET = "tokama-content";

type UploadRequest = {
  action?: "prepare" | "complete" | "cleanup";
  path?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  alt_text?: string;
  tags?: string[];
};

export async function POST(request: Request) {
  const auth = await requireContentAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as UploadRequest | null;
  if (!body?.action) return NextResponse.json({ message: "Nieprawidłowe żądanie uploadu." }, { status: 400 });

  if (body.action === "prepare") {
    const fileName = String(body.file_name || "");
    const mimeType = String(body.mime_type || "");
    const sizeBytes = Number(body.size_bytes || 0);
    const validationError = validateMediaFile(fileName, mimeType, sizeBytes);
    if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeMediaFileName(fileName)}`;
    const { data, error } = await auth.supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error || !data) return NextResponse.json({ message: error?.message || "Nie udało się rozpocząć uploadu." }, { status: 400 });
    return NextResponse.json({ data: { path, signed_url: data.signedUrl } });
  }

  const path = String(body.path || "");
  if (!isManagedMediaPath(path)) return NextResponse.json({ message: "Nieprawidłowa ścieżka pliku." }, { status: 400 });

  if (body.action === "cleanup") {
    const { error } = await auth.supabase.storage.from(BUCKET).remove([path]);
    return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }

  if (body.action !== "complete") return NextResponse.json({ message: "Nieznana operacja uploadu." }, { status: 400 });

  const fileName = String(body.file_name || "");
  const mimeType = String(body.mime_type || "");
  const sizeBytes = Number(body.size_bytes || 0);
  const validationError = validateMediaFile(fileName, mimeType, sizeBytes);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  const { data: existing } = await auth.supabase.from("tokama_media_assets").select("*").eq("storage_path", path).maybeSingle();
  if (existing) return NextResponse.json({ data: existing });

  const { data: exists, error: existsError } = await auth.supabase.storage.from(BUCKET).exists(path);
  if (existsError || !exists) return NextResponse.json({ message: "Plik nie dotarł do biblioteki. Spróbuj ponownie." }, { status: 400 });

  const { data: publicUrl } = auth.supabase.storage.from(BUCKET).getPublicUrl(path);
  const tags = Array.isArray(body.tags) ? body.tags.map(value => String(value).trim().toUpperCase()).filter(Boolean) : [];
  const { data, error } = await auth.supabase.from("tokama_media_assets").insert({
    storage_path: path,
    public_url: publicUrl.publicUrl,
    file_name: fileName,
    mime_type: mimeType,
    kind: mimeType.startsWith("video/") ? "video" : "image",
    size_bytes: sizeBytes,
    alt_text: String(body.alt_text || ""),
    tags,
    created_by: auth.user.id,
  }).select().single();

  if (error) {
    await auth.supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
