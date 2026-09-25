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
    max(substring(r.public_code from '^TOK-([0-9]+)$')::bigint),
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
create or replace function public.create_tokama_manual_stay(
  p_house_code text,
  p_guest_name text,
  p_guest_phone text,
  p_checkin date,
  p_checkout date,
  p_nights integer
)
returns table (
  reservation_id uuid,
  reservation_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_house_id uuid;
  max_number bigint;
  next_number bigint;
  next_code text;
  new_reservation_id uuid;
begin
  if upper(trim(p_house_code)) not in ('TO', 'KA', 'MA') then
    raise exception 'invalid_house_code';
  end if;

  if nullif(trim(p_guest_name), '') is null then
    raise exception 'missing_guest_name';
  end if;

  if nullif(trim(p_guest_phone), '') is null then
    raise exception 'missing_guest_phone';
  end if;

  if p_nights < 1 or p_nights > 365 or p_checkout <= p_checkin then
    raise exception 'invalid_stay_dates';
  end if;

  perform pg_advisory_xact_lock(hashtext('tokama_reservation_public_code'));

  select h.id
  into selected_house_id
  from public.tokama_houses h
  where h.code = upper(trim(p_house_code));

  if selected_house_id is null then
    raise exception 'house_not_found';
  end if;

  if exists (
    select 1
    from public.tokama_reservations r
    join public.tokama_reservation_houses rh
      on rh.reservation_id = r.id
    where rh.house_id = selected_house_id
      and r.checkin < p_checkout
      and r.checkout > p_checkin
      and r.status in (
        'requested',
        'approved',
        'payment_sent',
        'paid',
        'confirmed'
      )
  ) then
    raise exception 'house_already_occupied';
  end if;

  select coalesce(
    max(substring(r.public_code from '^TOK-([0-9]+)$')::bigint),
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

  insert into public.tokama_reservations (
    source,
    status,
    locale,
    public_code,
    checkin,
    checkout,
    nights,
    adults,
    children,
    guest_name,
    guest_phone,
    guest_email,
    guest_message,
    currency,
    stay_price_cents,
    addons_price_cents,
    total_estimated_cents,
    host_final_amount_cents,
    payment_method,
    payment_status,
    payment_confirmed_at
  )
  values (
    'host',
    'confirmed',
    'pl',
    next_code,
    p_checkin,
    p_checkout,
    p_nights,
    1,
    0,
    trim(p_guest_name),
    trim(p_guest_phone),
    null,
    'Pobyt dodany ręcznie w HOSTapp.',
    'PLN',
    0,
    0,
    0,
    0,
    'manual',
    'paid',
    now()
  )
  returning id into new_reservation_id;

  insert into public.tokama_reservation_houses (
    reservation_id,
    house_id
  )
  values (
    new_reservation_id,
    selected_house_id
  );

  return query select new_reservation_id, next_code;
end;
$$;
