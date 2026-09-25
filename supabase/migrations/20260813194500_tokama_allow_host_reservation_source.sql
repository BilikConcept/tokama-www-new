alter table public.tokama_reservations
  drop constraint if exists tokama_reservations_source_check;
alter table public.tokama_reservations
  add constraint tokama_reservations_source_check
  check (source in ('website', 'host'));
do $$
begin
  begin
    perform *
    from public.create_tokama_manual_stay(
      'TO',
      'HOSTapp migration verification',
      '000000000',
      date '2099-01-01',
      date '2099-01-02',
      1
    );

    raise sqlstate 'ZX001' using message = 'tokama_manual_stay_test_rollback';
  exception
    when sqlstate 'ZX001' then null;
  end;
end;
$$;
