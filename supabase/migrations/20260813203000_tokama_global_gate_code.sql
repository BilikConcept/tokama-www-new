update public.tokama_reservations
set
  gate_code = '1515',
  updated_at = now()
where gate_code is distinct from '1515';
alter table public.tokama_reservations
  drop constraint if exists tokama_reservations_gate_code_global_check;
alter table public.tokama_reservations
  add constraint tokama_reservations_gate_code_global_check
  check (gate_code is null or gate_code = '1515');
