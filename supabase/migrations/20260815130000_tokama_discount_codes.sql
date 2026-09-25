create extension if not exists pgcrypto;

create table if not exists public.tokama_discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null check (discount_percent between 1 and 100),
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tokama_reservations
  add column if not exists subtotal_before_discount_cents integer not null default 0,
  add column if not exists discount_code text,
  add column if not exists discount_percent integer not null default 0,
  add column if not exists discount_cents integer not null default 0;

create index if not exists tokama_discount_codes_active_code_idx
  on public.tokama_discount_codes (code)
  where is_active = true;

alter table public.tokama_discount_codes enable row level security;
