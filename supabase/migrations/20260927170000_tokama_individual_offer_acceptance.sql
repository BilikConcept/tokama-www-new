alter table public.tokama_individual_offers
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists variants jsonb not null default '[]',
  add column if not exists accepted_variant_id text,
  add column if not exists accepted_at timestamptz;

create unique index if not exists tokama_individual_offers_public_token_idx
  on public.tokama_individual_offers(public_token);

alter table public.tokama_reservations
  add column if not exists individual_offer_id uuid references public.tokama_individual_offers(id) on delete set null,
  add column if not exists individual_offer_variant_id text;
