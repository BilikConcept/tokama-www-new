-- Public package pages and reservation linkage.
alter table public.tokama_packages
  add column if not exists slug text,
  add column if not exists booking_note text not null default '';

update public.tokama_packages
set slug = trim(both '-' from regexp_replace(
  lower(translate(name, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ')),
  '[^a-z0-9]+', '-', 'g'
))
where slug is null or slug = '';

create unique index if not exists tokama_packages_slug_unique
  on public.tokama_packages(slug)
  where slug is not null;

alter table public.tokama_reservations
  add column if not exists package_id uuid references public.tokama_packages(id) on delete set null,
  add column if not exists package_slug_at_booking text,
  add column if not exists package_name_at_booking text,
  add column if not exists package_price_cents_at_booking integer;

create index if not exists tokama_reservations_package_id_idx
  on public.tokama_reservations(package_id);
