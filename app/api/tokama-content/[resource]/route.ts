import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireContentAdmin } from "@/lib/content-studio/auth";

const resources = {
  packages: "tokama_packages",
  articles: "tokama_articles",
  media: "tokama_media_assets",
  "website-media": "tokama_website_media",
  sections: "tokama_global_sections",
} as const;
type ContentAdminSupabase = Extract<Awaited<ReturnType<typeof requireContentAdmin>>, { ok: true }>['supabase'];

function tableFor(resource: string) { return resources[resource as keyof typeof resources]; }
function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function revalidatePublicResource(resource: string) {
  if (resource === "articles") {
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
  }
  if (resource === "packages") {
    revalidatePath("/");
    revalidatePath("/pakiety");
    revalidatePath("/pakiety/[slug]", "page");
  }
}

async function clearOtherHomepageArticles(supabase: ContentAdminSupabase, selectedId: string) {
  const { data: selectedRows, error } = await supabase
    .from("tokama_articles")
    .select("id,seo")
    .contains("seo", { homepageFeatured: true })
    .neq("id", selectedId);
  if (error) {
    console.error("[journal] Failed to read homepage selection", { message: error.message });
    return;
  }
  await Promise.all((selectedRows || []).map(article => supabase
    .from("tokama_articles")
    .update({ seo: { ...(article.seo || {}), homepageFeatured: false }, updated_at: new Date().toISOString() })
    .eq("id", article.id)));
}

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireContentAdmin(request); if (!auth.ok) return auth.response;
  const { resource } = await context.params; const table = tableFor(resource);
  if (!table) return NextResponse.json({ message: "Nieznany zasób." }, { status: 404 });
  const { data, error } = await auth.supabase.from(table).select("*").order(resource === "packages" ? "sort_order" : "updated_at", { ascending: resource === "packages" });
  return error ? NextResponse.json({ message: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireContentAdmin(request); if (!auth.ok) return auth.response;
  const { resource } = await context.params; const table = tableFor(resource);
  if (!table) return NextResponse.json({ message: "Nieznany zasób." }, { status: 404 });
  const body = await request.json();
  if (resource === "packages") body.slug = slugify(body.slug || body.name || crypto.randomUUID());
  const actor = resource === "media" || resource === "packages" ? { created_by: auth.user.id } : resource === "articles" ? { created_by: auth.user.id, updated_by: auth.user.id } : { updated_by: auth.user.id };
  const { data, error } = await auth.supabase.from(table).insert({ ...body, ...actor }).select().single();
  if (!error && resource === "articles" && data?.seo?.homepageFeatured) await clearOtherHomepageArticles(auth.supabase, data.id);
  if (!error) revalidatePublicResource(resource);
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireContentAdmin(request); if (!auth.ok) return auth.response;
  const { resource } = await context.params; const table = tableFor(resource);
  if (!table) return NextResponse.json({ message: "Nieznany zasób." }, { status: 404 });
  const { id, ...changes } = await request.json(); if (!id) return NextResponse.json({ message: "Brak id." }, { status: 400 });
  if (resource === "packages" && (changes.slug || changes.name)) changes.slug = slugify(changes.slug || changes.name);
  const update = { ...changes, updated_at: new Date().toISOString(), ...(resource === "articles" || resource === "sections" || resource === "website-media" ? { updated_by: auth.user.id } : {}) };

  if (resource === "articles") {
    const { data: current } = await auth.supabase.from(table).select("*").eq("id", id).single();
    if (current) {
      const nextVersion = Number(current.current_version || 0) + 1;
      await auth.supabase.from("tokama_article_versions").upsert({ article_id: id, version: current.current_version, snapshot: current, created_by: auth.user.id });
      Object.assign(update, { current_version: nextVersion });
    }
  }
  const { data, error } = await auth.supabase.from(table).update(update).eq("id", id).select().single();
  if (!error && resource === "articles" && data?.seo?.homepageFeatured) await clearOtherHomepageArticles(auth.supabase, data.id);
  if (!error) revalidatePublicResource(resource);
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ data });
}

export async function DELETE(request: Request, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireContentAdmin(request); if (!auth.ok) return auth.response;
  const { resource } = await context.params; const table = tableFor(resource);
  if (!table) return NextResponse.json({ message: "Nieznany zasób." }, { status: 404 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ message: "Brak id." }, { status: 400 });
  let mediaStoragePath = "";
  if (resource === "media") {
    const { data: mediaAsset, error: mediaLookupError } = await auth.supabase.from("tokama_media_assets").select("storage_path").eq("id", id).maybeSingle();
    if (mediaLookupError) return NextResponse.json({ message: mediaLookupError.message }, { status: 400 });
    mediaStoragePath = mediaAsset?.storage_path || "";
    const [{ data: packages }, { data: articles }, { data: website }] = await Promise.all([
      auth.supabase.from("tokama_packages").select("id,name,hero_media_id,gallery_media_ids"),
      auth.supabase.from("tokama_articles").select("id,title,blocks,seo"),
      auth.supabase.from("tokama_website_media").select("id,label,media_ids"),
    ]);
    const haystack = JSON.stringify([packages, articles, website]);
    if (haystack.includes(id)) return NextResponse.json({ message: "Asset jest używany. Usuń najpierw jego przypisania." }, { status: 409 });
  }
  const { error } = await auth.supabase.from(table).delete().eq("id", id);
  if (!error && resource === "media" && mediaStoragePath) {
    const { error: storageError } = await auth.supabase.storage.from("tokama-content").remove([mediaStoragePath]);
    if (storageError) console.error("[media] Failed to remove storage object", { id, path: mediaStoragePath, message: storageError.message });
  }
  if (!error) revalidatePublicResource(resource);
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
