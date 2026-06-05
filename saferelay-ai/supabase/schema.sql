-- SafeRelay AI Supabase schema
-- Run this file inside Supabase SQL Editor before deploying Edge Functions.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name text,
  public_slug text unique not null check (public_slug ~ '^[a-zA-Z0-9_-]{3,40}$'),
  plan text not null default 'free' check (plan in ('free','pro','business')),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_fingerprint text,
  message_type text not null default 'note',
  body text not null check (char_length(body) between 3 and 3000),
  status text not null default 'pending' check (status in ('pending','approved','needs_review','rejected','archived')),
  moderation_reason text,
  reveal_requested boolean not null default false,
  reveal_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

create policy "public can view profile public fields" on public.profiles
for select using (true);

create policy "users can update own profile" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "users can insert own profile" on public.profiles
for insert with check (auth.uid() = id);

create policy "recipients can view their messages" on public.messages
for select using (auth.uid() = recipient_profile_id);

create policy "public can submit messages" on public.messages
for insert with check (true);

create policy "recipients can update their messages" on public.messages
for update using (auth.uid() = recipient_profile_id) with check (auth.uid() = recipient_profile_id);

create policy "public can report messages" on public.reports
for insert with check (true);

create index if not exists idx_profiles_slug on public.profiles(public_slug);
create index if not exists idx_messages_recipient_created on public.messages(recipient_profile_id, created_at desc);
create index if not exists idx_messages_status on public.messages(status);
