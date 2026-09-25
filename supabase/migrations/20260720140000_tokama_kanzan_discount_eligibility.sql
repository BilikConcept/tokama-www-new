alter table public.tokama_onsite_menu_categories
  add column if not exists is_discount_eligible boolean not null default true;
alter table public.tokama_onsite_menu_products
  add column if not exists is_discount_eligible boolean not null default true;
alter table public.tokama_onsite_menu_options
  add column if not exists is_discount_eligible boolean not null default true;
alter table public.tokama_onsite_orders
  add column if not exists food_subtotal_cents integer not null default 0,
  add column if not exists non_discounted_subtotal_cents integer not null default 0;
comment on column public.tokama_onsite_menu_products.is_discount_eligible is
'Czy pozycja otrzymuje rabat TOKAMA. Napoje mają wartość false.';
comment on column public.tokama_onsite_menu_options.is_discount_eligible is
'Czy wybrany dodatek otrzymuje rabat TOKAMA. Napoje w zestawach mają wartość false.';
