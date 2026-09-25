alter table public.tokama_reservations
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists legal_acceptance_ip inet,
  add column if not exists legal_acceptance_user_agent text;

comment on column public.tokama_reservations.terms_version is
  'Version of the booking terms accepted by the guest.';
comment on column public.tokama_reservations.terms_accepted_at is
  'Server timestamp proving acceptance of the booking terms.';
comment on column public.tokama_reservations.privacy_notice_version is
  'Version of the privacy notice shown to the guest.';
comment on column public.tokama_reservations.privacy_acknowledged_at is
  'Server timestamp proving the guest was shown the privacy notice.';

alter table public.tokama_payment_requests
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_acceptance_ip inet,
  add column if not exists terms_acceptance_user_agent text;

comment on column public.tokama_payment_requests.terms_accepted_at is
  'Server timestamp proving confirmation of the booking terms immediately before payment.';
