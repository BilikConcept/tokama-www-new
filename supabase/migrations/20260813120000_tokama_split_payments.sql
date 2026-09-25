alter table public.tokama_reservations
  add column if not exists online_due_cents integer,
  add column if not exists arrival_due_cents integer,
  add column if not exists paid_online_cents integer not null default 0;
alter table public.tokama_reservations
  drop constraint if exists tokama_reservations_online_due_nonnegative,
  add constraint tokama_reservations_online_due_nonnegative
    check (online_due_cents is null or online_due_cents >= 0),
  drop constraint if exists tokama_reservations_arrival_due_nonnegative,
  add constraint tokama_reservations_arrival_due_nonnegative
    check (arrival_due_cents is null or arrival_due_cents >= 0),
  drop constraint if exists tokama_reservations_paid_online_nonnegative,
  add constraint tokama_reservations_paid_online_nonnegative
    check (paid_online_cents >= 0);
drop policy if exists "hostapp can receive reservation changes" on public.tokama_reservations;
create policy "hostapp can receive reservation changes"
  on public.tokama_reservations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.hostapp_profiles profile
      where profile.id = auth.uid()
        and profile.is_active = true
    )
  );
do $$
begin
  alter publication supabase_realtime add table public.tokama_reservations;
exception
  when duplicate_object then null;
end $$;
