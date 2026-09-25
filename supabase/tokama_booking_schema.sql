create extension if not exists pgcrypto;

create table if not exists tokama_booking_settings (
  id boolean primary key default true,
  currency text not null default 'PLN',
  base_price_per_house_per_night_cents integer not null default 120000,
  min_nights integer not null default 2,
  max_adults_per_house integer not null default 7,
  houses_total integer not null default 3,
  is_booking_open boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint tokama_booking_settings_singleton check (id = true),
  constraint tokama_booking_settings_min_nights_check check (min_nights >= 1),
  constraint tokama_booking_settings_capacity_check check (max_adults_per_house >= 1),
  constraint tokama_booking_settings_houses_total_check check (houses_total >= 1)
);

insert into tokama_booking_settings (
  id,
  currency,
  base_price_per_house_per_night_cents,
  min_nights,
  max_adults_per_house,
  houses_total,
  is_booking_open
)
values (
  true,
  'PLN',
  120000,
  2,
  7,
  3,
  true
)
on conflict (id) do nothing;

create table if not exists tokama_booking_addons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_pl text not null,
  name_en text not null,
  description_pl text,
  description_en text,
  price_cents integer not null default 0,
  pricing_unit text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tokama_booking_addons_price_check check (price_cents >= 0),
  constraint tokama_booking_addons_pricing_unit_check check (
    pricing_unit in (
      'per_stay',
      'per_night',
      'per_house_per_stay',
      'per_person_per_night'
    )
  )
);

insert into tokama_booking_addons (
  slug,
  name_pl,
  name_en,
  description_pl,
  description_en,
  price_cents,
  pricing_unit,
  sort_order
)
values
  (
    'breakfast',
    'Śniadanie',
    'Breakfast',
    'Poranne śniadanie podczas pobytu.',
    'Morning breakfast during your stay.',
    6500,
    'per_person_per_night',
    10
  ),
  (
    'picnic_basket',
    'Kosz piknikowy',
    'Picnic basket',
    'Kosz przygotowany na spokojny dzień przy jeziorze.',
    'A basket prepared for a slow day by the lake.',
    18000,
    'per_stay',
    20
  ),
  (
    'white_bedding',
    'Biała pościel',
    'White bedding',
    'Biała pościel przygotowana do pobytu.',
    'White bedding prepared for your stay.',
    9000,
    'per_house_per_stay',
    30
  ),
  (
    'baby_cot',
    'Łóżeczko dla malucha',
    'Baby cot',
    'Łóżeczko dla najmłodszych gości.',
    'A baby cot for the youngest guests.',
    5000,
    'per_stay',
    40
  )
on conflict (slug) do nothing;

create table if not exists tokama_reservations (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  status text not null default 'requested',
  locale text not null default 'pl',

  checkin date not null,
  checkout date not null,
  nights integer not null,

  adults integer not null,
  children integer not null default 0,
  houses_count integer not null,

  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_message text,

  currency text not null default 'PLN',
  stay_price_cents integer not null default 0,
  addons_price_cents integer not null default 0,
  total_estimated_cents integer not null default 0,
  host_final_amount_cents integer,

  min_nights_at_booking integer not null,
  base_price_per_house_per_night_cents_at_booking integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tokama_reservations_status_check check (
    status in (
      'requested',
      'approved',
      'payment_sent',
      'paid',
      'confirmed',
      'cancelled',
      'rejected'
    )
  ),
  constraint tokama_reservations_locale_check check (locale in ('pl', 'en')),
  constraint tokama_reservations_dates_check check (checkout > checkin),
  constraint tokama_reservations_nights_check check (nights >= 1),
  constraint tokama_reservations_adults_check check (adults >= 1),
  constraint tokama_reservations_children_check check (children >= 0),
  constraint tokama_reservations_houses_check check (houses_count >= 1)
);

create table if not exists tokama_reservation_addons (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references tokama_reservations(id) on delete cascade,
  addon_slug text not null,
  name_pl text not null,
  name_en text not null,
  pricing_unit text not null,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  total_price_cents integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tokama_reservation_addons_quantity_check check (quantity >= 1)
);

create table if not exists tokama_payment_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references tokama_reservations(id) on delete cascade,
  provider text not null default 'stripe',
  provider_checkout_session_id text,
  payment_url text,
  amount_cents integer not null,
  currency text not null default 'PLN',
  status text not null default 'created',
  sent_sms_at timestamptz,
  sent_email_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tokama_payment_requests_amount_check check (amount_cents > 0),
  constraint tokama_payment_requests_status_check check (
    status in ('created', 'sent', 'paid', 'expired', 'cancelled')
  )
);

alter table tokama_booking_settings enable row level security;
alter table tokama_booking_addons enable row level security;
alter table tokama_reservations enable row level security;
alter table tokama_reservation_addons enable row level security;
alter table tokama_payment_requests enable row level security;
