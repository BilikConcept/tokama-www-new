alter table public.tokama_booking_settings
  add column if not exists houses_total integer not null default 3;

update public.tokama_booking_settings
set houses_total = greatest(1, (select count(*)::integer from public.tokama_houses));

alter table public.tokama_booking_settings
  drop constraint if exists tokama_booking_settings_houses_total_check;

alter table public.tokama_booking_settings
  add constraint tokama_booking_settings_houses_total_check check (houses_total >= 1);
