create table if not exists public.tokama_onsite_service_requests (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  reservation_id uuid not null
    references public.tokama_reservations(id) on delete cascade,
  house_id uuid not null
    references public.tokama_houses(id) on delete restrict,
  guest_session_id uuid
    references public.tokama_onsite_guest_sessions(id) on delete set null,
  kind text not null
    check (kind in ('housekeeping', 'guest_extras')),
  status text not null default 'new'
    check (status in ('new', 'seen', 'confirmed', 'completed', 'cancelled')),
  note text,
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'PLN',
  requested_for_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tokama_onsite_service_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null
    references public.tokama_onsite_service_requests(id) on delete cascade,
  addon_id uuid
    references public.tokama_addons(id) on delete set null,
  addon_slug text,
  item_name text not null,
  variant_id text,
  variant_name text,
  pricing_unit text not null default 'per_stay',
  quantity integer not null default 1 check (quantity >= 1),
  selected_dates date[] not null default '{}',
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  total_price_cents integer not null default 0 check (total_price_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists tokama_onsite_service_requests_reservation_idx
  on public.tokama_onsite_service_requests (reservation_id, created_at desc);
create index if not exists tokama_onsite_service_requests_status_idx
  on public.tokama_onsite_service_requests (status, created_at desc);
create index if not exists tokama_onsite_service_request_items_request_idx
  on public.tokama_onsite_service_request_items (request_id);
alter table public.tokama_onsite_service_requests enable row level security;
alter table public.tokama_onsite_service_request_items enable row level security;
