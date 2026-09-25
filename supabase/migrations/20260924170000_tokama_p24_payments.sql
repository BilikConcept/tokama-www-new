alter table public.tokama_payment_requests
  add column if not exists p24_order_id bigint,
  add column if not exists p24_method_id integer,
  add column if not exists p24_statement text,
  add column if not exists p24_registered_at timestamptz,
  add column if not exists p24_verified_at timestamptz,
  add column if not exists p24_notification_sign text;

create unique index if not exists tokama_payment_requests_p24_session_unique
  on public.tokama_payment_requests (provider_checkout_session_id)
  where provider = 'p24' and provider_checkout_session_id is not null;

create unique index if not exists tokama_payment_requests_p24_order_unique
  on public.tokama_payment_requests (p24_order_id)
  where provider = 'p24' and p24_order_id is not null;

