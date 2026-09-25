alter table public.tokama_reservations
  add column if not exists payment_confirmation_sms_claimed_at timestamptz;
create or replace function public.claim_tokama_payment_confirmation_sms(
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.tokama_reservations
  set
    payment_confirmation_sms_claimed_at = now(),
    updated_at = now()
  where id = p_reservation_id
    and payment_confirmation_sms_sent_at is null
    and (
      payment_confirmation_sms_claimed_at is null
      or payment_confirmation_sms_claimed_at < now() - interval '10 minutes'
    );

  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;
revoke all on function public.claim_tokama_payment_confirmation_sms(uuid) from public;
grant execute on function public.claim_tokama_payment_confirmation_sms(uuid) to service_role;
