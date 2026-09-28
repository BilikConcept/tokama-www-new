alter table public.tokama_individual_offers
  add column if not exists client_phone text not null default '';
