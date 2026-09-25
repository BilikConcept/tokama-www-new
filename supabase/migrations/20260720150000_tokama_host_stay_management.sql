alter table public.tokama_reservations
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid,
  add column if not exists payment_confirmation_sms_sent_at timestamptz;
