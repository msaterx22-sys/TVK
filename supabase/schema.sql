create table if not exists public.wards (
  ward_no integer primary key,
  name text not null,
  key_streets jsonb not null default '[]'::jsonb,
  incharge_name text not null,
  incharge_phone text not null,
  total_issues integer not null default 0,
  resolved_issues integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.wards enable row level security;

create policy "Public can read wards"
  on public.wards for select
  using (true);
