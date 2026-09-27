create unique index if not exists tokama_reservations_individual_offer_unique
  on public.tokama_reservations(individual_offer_id)
  where individual_offer_id is not null;
