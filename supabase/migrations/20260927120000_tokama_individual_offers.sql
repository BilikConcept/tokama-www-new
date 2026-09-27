create table if not exists public.tokama_individual_offers (
  id uuid primary key default gen_random_uuid(),
  offer_number text not null unique,
  status text not null default 'draft' check (status in ('draft','sent','accepted','expired','cancelled')),
  client_name text not null default '',
  client_email text not null default '',
  title text not null default '',
  introduction text not null default '',
  checkin date,
  checkout date,
  guests integer check (guests is null or guests >= 1),
  line_items jsonb not null default '[]',
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'PLN',
  notes text not null default '',
  valid_until date,
  sent_at timestamptz,
  last_sent_to text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tokama_individual_offers_status_updated_idx
  on public.tokama_individual_offers(status, updated_at desc);

alter table public.tokama_individual_offers enable row level security;
