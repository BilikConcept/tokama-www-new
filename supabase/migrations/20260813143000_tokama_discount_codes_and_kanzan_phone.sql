alter table public.tokama_booking_settings
  add column if not exists kanzan_phone text;
create table if not exists public.tokama_discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null,
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tokama_discount_codes_code_check
    check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  constraint tokama_discount_codes_percent_check
    check (discount_percent between 1 and 100),
  constraint tokama_discount_codes_dates_check
    check (expires_at is null or expires_at > valid_from)
);
create index if not exists tokama_discount_codes_active_code_idx
  on public.tokama_discount_codes (code, is_active);
alter table public.tokama_reservations
  add column if not exists discount_code text,
  add column if not exists discount_percent integer not null default 0,
  add column if not exists discount_cents integer not null default 0,
  add column if not exists subtotal_before_discount_cents integer not null default 0;
alter table public.tokama_reservations
  drop constraint if exists tokama_reservations_discount_percent_check,
  add constraint tokama_reservations_discount_percent_check
    check (discount_percent between 0 and 100),
  drop constraint if exists tokama_reservations_discount_cents_check,
  add constraint tokama_reservations_discount_cents_check
    check (discount_cents >= 0),
  drop constraint if exists tokama_reservations_subtotal_before_discount_check,
  add constraint tokama_reservations_subtotal_before_discount_check
    check (subtotal_before_discount_cents >= 0);
update public.tokama_reservations
set subtotal_before_discount_cents = greatest(
  coalesce(stay_price_cents, 0) + coalesce(addons_price_cents, 0),
  coalesce(total_estimated_cents, 0)
)
where subtotal_before_discount_cents = 0;
alter table public.tokama_discount_codes enable row level security;
comment on table public.tokama_discount_codes is
  'Kody rabatowe tworzone w HOSTapp. Odczyt publiczny odbywa się wyłącznie przez walidujące API.';
comment on column public.tokama_booking_settings.kanzan_phone is
  'Numer telefonu restauracji KANZAN używany do wysyłki zamówień SMS.';
