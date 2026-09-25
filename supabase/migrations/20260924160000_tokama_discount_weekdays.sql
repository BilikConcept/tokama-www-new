alter table public.tokama_discount_codes
  add column if not exists weekdays integer[] not null default array[1,2,3,4,5,6,7];

alter table public.tokama_discount_codes
  drop constraint if exists tokama_discount_codes_weekdays_check,
  add constraint tokama_discount_codes_weekdays_check
    check (cardinality(weekdays) > 0 and weekdays <@ array[1,2,3,4,5,6,7]);
