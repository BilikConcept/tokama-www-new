alter table public.tokama_booking_settings
  add column if not exists refund_pin_hash text;

alter table public.tokama_payment_requests
  add column if not exists refund_request_id text,
  add column if not exists refund_uuid text,
  add column if not exists refund_amount_cents integer,
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_response jsonb;

create unique index if not exists tokama_payment_requests_refund_uuid_unique
  on public.tokama_payment_requests (refund_uuid)
  where refund_uuid is not null;
