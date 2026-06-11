-- Supabase schema for Baiti MVP
-- 1) Open Supabase SQL Editor
-- 2) Paste and run this file
-- 3) Copy your Project URL and anon/publishable key into assets/baiti-config.js

create table if not exists public.baiti_app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.baiti_app_state enable row level security;

-- Demo policy: allows public read/write to the shared prototype state.
-- Suitable only for a public demo. For production, replace with authenticated user policies.
drop policy if exists "baiti_demo_select" on public.baiti_app_state;
create policy "baiti_demo_select"
on public.baiti_app_state
for select
to anon
using (id = 'public-demo');

drop policy if exists "baiti_demo_insert" on public.baiti_app_state;
create policy "baiti_demo_insert"
on public.baiti_app_state
for insert
to anon
with check (id = 'public-demo');

drop policy if exists "baiti_demo_update" on public.baiti_app_state;
create policy "baiti_demo_update"
on public.baiti_app_state
for update
to anon
using (id = 'public-demo')
with check (id = 'public-demo');

insert into public.baiti_app_state (id, data)
values ('public-demo', '{}'::jsonb)
on conflict (id) do nothing;
