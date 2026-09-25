-- TOKAMA Content Studio is deliberately isolated from booking tables.
create extension if not exists pgcrypto;

create table if not exists public.tokama_media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text not null,
  kind text not null check (kind in ('image', 'video')),
  width integer,
  height integer,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  alt_text text not null default '',
  tags text[] not null default '{}',
  focal_point jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tokama_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  eyebrow text not null default '',
  headline text not null default '',
  short_description text not null default '',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','active','hidden','expired')),
  regular_price_cents integer check (regular_price_cents is null or regular_price_cents >= 0),
  package_price_cents integer check (package_price_cents is null or package_price_cents >= 0),
  currency text not null default 'PLN',
  valid_from date,
  valid_to date,
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}',
  min_nights integer not null default 1 check (min_nights >= 1),
  max_guests integer check (max_guests is null or max_guests >= 1),
  inclusions jsonb not null default '[]',
  cta_label text not null default 'Zarezerwuj pobyt',
  cta_href text not null default '/rezerwacja',
  featured boolean not null default false,
  sort_order integer not null default 0,
  hero_media_id uuid references public.tokama_media_assets(id) on delete set null,
  gallery_media_ids uuid[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tokama_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  eyebrow text not null default '',
  excerpt text not null default '',
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','review','scheduled','published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  blocks jsonb not null default '[]',
  seo jsonb not null default '{}',
  template_id uuid,
  preview_token uuid not null default gen_random_uuid(),
  current_version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tokama_article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.tokama_articles(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(article_id, version)
);

create table if not exists public.tokama_global_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null unique,
  kind text not null default 'section' check (kind in ('section','template')),
  blocks jsonb not null default '[]',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tokama_articles
  add constraint tokama_articles_template_fk foreign key (template_id)
  references public.tokama_global_sections(id) on delete set null;

create table if not exists public.tokama_website_media (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  label text not null,
  media_ids uuid[] not null default '{}',
  settings jsonb not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists tokama_packages_status_sort_idx on public.tokama_packages(status, sort_order);
create index if not exists tokama_articles_status_date_idx on public.tokama_articles(status, published_at desc);
create index if not exists tokama_media_tags_idx on public.tokama_media_assets using gin(tags);

alter table public.tokama_media_assets enable row level security;
alter table public.tokama_packages enable row level security;
alter table public.tokama_articles enable row level security;
alter table public.tokama_article_versions enable row level security;
alter table public.tokama_global_sections enable row level security;
alter table public.tokama_website_media enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tokama-content', 'tokama-content', true, 104857600,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into public.tokama_website_media(section_key, label) values
  ('homepage.hero','Homepage · Hero'),
  ('homepage.editorial','Homepage · Sekcje editorial'),
  ('cottages.to','Domki · TO'), ('cottages.ka','Domki · KA'), ('cottages.ma','Domki · MA'),
  ('relax.pool','Relaks · Basen'), ('relax.sauna','Relaks · Sauna'),
  ('experiences.hero','Atrakcje · Hero'), ('events.hero','Eventy · Hero')
on conflict (section_key) do nothing;

-- Public site only reads explicitly public content; all writes go through protected server API.
create policy "public active packages" on public.tokama_packages for select using (status = 'active');
create policy "public published articles" on public.tokama_articles for select
  using (status = 'published' and coalesce(published_at, now()) <= now());
create policy "public media metadata" on public.tokama_media_assets for select using (true);
create policy "public website media" on public.tokama_website_media for select using (true);
create policy "public global sections" on public.tokama_global_sections for select using (kind = 'section');
