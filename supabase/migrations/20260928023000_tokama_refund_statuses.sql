alter table public.tokama_payment_requests
  drop constraint if exists tokama_payment_requests_status_check,
  add constraint tokama_payment_requests_status_check
    check (status in ('created','sent','paid','expired','cancelled','refund_pending','refunded'));
