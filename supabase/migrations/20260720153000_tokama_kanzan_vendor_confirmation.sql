alter table public.tokama_onsite_orders
  add column if not exists vendor_confirmation_token_hash text,
  add column if not exists vendor_confirmation_expires_at timestamptz,
  add column if not exists vendor_sms_sent_at timestamptz,
  add column if not exists vendor_confirmed_at timestamptz,
  add column if not exists guest_preparing_sms_sent_at timestamptz,
  add column if not exists host_preparing_push_sent_at timestamptz;
create unique index if not exists tokama_onsite_orders_vendor_confirmation_token_key
  on public.tokama_onsite_orders (vendor_confirmation_token_hash)
  where vendor_confirmation_token_hash is not null;
create index if not exists tokama_onsite_orders_vendor_confirmation_expires_at_idx
  on public.tokama_onsite_orders (vendor_confirmation_expires_at);
