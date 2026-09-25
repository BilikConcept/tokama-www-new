alter table public.tokama_reservations
  add column if not exists guest_card_sms_sent_at timestamptz;
create or replace function public.assign_tokama_reservation_code(
  p_reservation_id uuid
)
returns table (
  code text,
  newly_assigned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_code text;
  max_number bigint;
  next_number bigint;
  next_code text;
begin
  perform pg_advisory_xact_lock(hashtext('tokama_reservation_public_code'));

  select nullif(trim(r.public_code), '')
  into existing_code
  from public.tokama_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if existing_code is not null then
    return query select existing_code, false;
    return;
  end if;

  select coalesce(
    max((regexp_match(r.public_code, '^TOK-([0-9]+)$'))[1]::bigint),
    0
  )
  into max_number
  from public.tokama_reservations r
  where r.public_code ~ '^TOK-[0-9]+$';

  next_number := max_number + 1;

  next_code := 'TOK-' ||
    case
      when next_number < 10000 then lpad(next_number::text, 4, '0')
      else next_number::text
    end;

  update public.tokama_reservations
  set public_code = next_code, updated_at = now()
  where id = p_reservation_id;

  return query select next_code, true;
end;
$$;
revoke all on function public.assign_tokama_reservation_code(uuid)
  from public, anon, authenticated;
grant execute on function public.assign_tokama_reservation_code(uuid)
  to service_role;
