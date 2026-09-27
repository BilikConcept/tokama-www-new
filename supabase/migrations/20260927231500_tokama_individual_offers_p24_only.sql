update public.tokama_reservations
set payment_method = 'p24', updated_at = now()
where individual_offer_id is not null
  and coalesce(payment_status, '') <> 'paid';

update public.tokama_payment_requests payment
set provider = 'p24', updated_at = now()
from public.tokama_reservations reservation
where payment.reservation_id = reservation.id
  and reservation.individual_offer_id is not null
  and payment.status <> 'paid';
