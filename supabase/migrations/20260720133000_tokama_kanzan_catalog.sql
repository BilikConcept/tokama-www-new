create extension if not exists pgcrypto;
create table if not exists public.tokama_onsite_vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  discount_percent integer not null default 0
    check (discount_percent between 0 and 100),
  delivery_cents integer not null default 0
    check (delivery_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tokama_onsite_menu_categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null
    references public.tokama_onsite_vendors(id) on delete cascade,
  slug text not null,
  name_pl text not null,
  description_pl text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, slug)
);
create table if not exists public.tokama_onsite_menu_products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null
    references public.tokama_onsite_vendors(id) on delete cascade,
  category_id uuid not null
    references public.tokama_onsite_menu_categories(id) on delete cascade,
  source_key text,
  name_pl text not null,
  description_pl text,
  image_url text,
  base_price_cents integer not null check (base_price_cents >= 0),
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  source_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, source_key)
);
create table if not exists public.tokama_onsite_menu_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.tokama_onsite_menu_products(id) on delete cascade,
  name_pl text not null,
  helper_text_pl text,
  selection_type text not null default 'multiple'
    check (selection_type in ('single', 'multiple')),
  min_selected integer not null default 0 check (min_selected >= 0),
  max_selected integer not null default 0 check (max_selected >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tokama_onsite_menu_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null
    references public.tokama_onsite_menu_option_groups(id) on delete cascade,
  name_pl text not null,
  price_delta_cents integer not null default 0,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tokama_onsite_orders
  add column if not exists vendor_id uuid
    references public.tokama_onsite_vendors(id) on delete set null,
  add column if not exists subtotal_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists delivery_cents integer not null default 0,
  add column if not exists guest_total_cents integer,
  add column if not exists dispatch_status text not null default 'new'
    check (dispatch_status in (
      'new', 'saved_for_kanzan', 'sent_to_kanzan',
      'accepted_by_kanzan', 'ready', 'delivered', 'cancelled'
    )),
  add column if not exists saved_for_kanzan_at timestamptz,
  add column if not exists sent_to_kanzan_at timestamptz,
  add column if not exists saved_by_name text,
  add column if not exists vendor_reference text;
alter table public.tokama_onsite_order_items
  add column if not exists menu_product_id uuid
    references public.tokama_onsite_menu_products(id) on delete set null,
  add column if not exists product_name_snapshot text,
  add column if not exists base_unit_price_cents integer,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists discounted_unit_price_cents integer,
  add column if not exists selected_options jsonb not null default '[]'::jsonb,
  add column if not exists special_instructions text,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb;
create index if not exists tokama_onsite_menu_categories_active_idx
  on public.tokama_onsite_menu_categories (vendor_id, sort_order)
  where is_active = true;
create index if not exists tokama_onsite_menu_products_active_idx
  on public.tokama_onsite_menu_products (category_id, sort_order)
  where is_active = true;
create index if not exists tokama_onsite_menu_option_groups_product_idx
  on public.tokama_onsite_menu_option_groups (product_id, sort_order)
  where is_active = true;
create index if not exists tokama_onsite_menu_options_group_idx
  on public.tokama_onsite_menu_options (group_id, sort_order)
  where is_active = true;
create index if not exists tokama_onsite_orders_dispatch_idx
  on public.tokama_onsite_orders (dispatch_status, created_at desc);
alter table public.tokama_onsite_vendors enable row level security;
alter table public.tokama_onsite_menu_categories enable row level security;
alter table public.tokama_onsite_menu_products enable row level security;
alter table public.tokama_onsite_menu_option_groups enable row level security;
alter table public.tokama_onsite_menu_options enable row level security;
insert into public.tokama_onsite_vendors (
  slug, name, description, discount_percent, delivery_cents, is_active, sort_order
)
values (
  'kanzan',
  'KANZAN Food & Cocktails',
  'Menu dostępne dla gości TOKAMA z rabatem 10% i darmową dostawą do domku.',
  10,
  0,
  true,
  1
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  discount_percent = excluded.discount_percent,
  delivery_cents = excluded.delivery_cents,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
