-- Separate external calendar data from the core TOKAMA reservation records.
create table if not exists public.tokama_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('booking','alohacamp')),
  house_id uuid not null references public.tokama_houses(id) on delete cascade,
  import_url text not null,
  is_active boolean not null default true,
  last_status text not null default 'configured' check (last_status in ('configured','syncing','synced','error')),
  last_error text,
  last_synced_at timestamptz,
  event_count integer not null default 0 check (event_count >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, house_id)
);

create table if not exists public.tokama_external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.tokama_calendar_connections(id) on delete cascade,
  provider text not null check (provider in ('booking','alohacamp')),
  house_id uuid not null references public.tokama_houses(id) on delete cascade,
  external_uid text not null,
  start_date date not null,
  end_date date not null,
  summary text not null default '',
  updated_at timestamptz not null default now(),
  check (end_date > start_date),
  unique(connection_id, external_uid)
);

create table if not exists public.tokama_calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references public.tokama_houses(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

insert into public.tokama_calendar_feeds(house_id)
select id from public.tokama_houses
on conflict (house_id) do nothing;

create index if not exists tokama_external_calendar_dates_idx
  on public.tokama_external_calendar_events(house_id, start_date, end_date);
create index if not exists tokama_calendar_connections_active_idx
  on public.tokama_calendar_connections(is_active, last_synced_at);

alter table public.tokama_calendar_connections enable row level security;
alter table public.tokama_external_calendar_events enable row level security;
alter table public.tokama_calendar_feeds enable row level security;

-- No public policies: calendar URLs and imported events are service-role only.
