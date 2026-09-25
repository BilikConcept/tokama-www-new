create table if not exists public.tokama_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  valid_from date,
  valid_to date,
  weekdays integer[] not null default array[1,2,3,4,5,6,7],
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tokama_pricing_rules_dates_check check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint tokama_pricing_rules_weekdays_check check (weekdays <@ array[1,2,3,4,5,6,7])
);

alter table public.tokama_pricing_rules enable row level security;

alter table public.tokama_reservations
  add column if not exists pricing_breakdown jsonb not null default '[]'::jsonb;

create index if not exists tokama_pricing_rules_active_priority_idx
  on public.tokama_pricing_rules (is_active, priority desc);
