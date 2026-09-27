alter table public.tokama_individual_offers
  add column if not exists hold_expires_at timestamptz,
  add column if not exists held_house_ids uuid[] not null default '{}',
  add column if not exists reservation_id uuid references public.tokama_reservations(id) on delete set null;

create index if not exists tokama_individual_offers_active_hold_idx
  on public.tokama_individual_offers(hold_expires_at, checkin, checkout)
  where status in ('sent', 'accepted');

alter table public.tokama_reservations
  add column if not exists payment_confirmation_email_claimed_at timestamptz,
  add column if not exists payment_confirmation_email_sent_at timestamptz;

create or replace function public.claim_tokama_payment_confirmation_email(reservation_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tokama_reservations
  set payment_confirmation_email_claimed_at = now()
  where id = reservation_uuid
    and payment_confirmation_email_sent_at is null
    and (payment_confirmation_email_claimed_at is null or payment_confirmation_email_claimed_at < now() - interval '10 minutes');
  return found;
end;
$$;

revoke all on function public.claim_tokama_payment_confirmation_email(uuid) from public;
grant execute on function public.claim_tokama_payment_confirmation_email(uuid) to service_role;
