-- Crux schema (no-auth mode).
-- Run this in the Supabase SQL editor when first setting up the project.
--
-- Security note: this schema runs WITHOUT Supabase Auth. The anon key bundled
-- in the app can read/write any row. That's intentional for the current stage —
-- swap in proper RLS + auth later without changing the table shape.

create extension if not exists "uuid-ossp";

-- ─── Users ─────────────────────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists users_name_idx on users (lower(name));

-- ─── Climbs ────────────────────────────────────────────────────────────────
create table if not exists climbs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  grade_low text not null,
  grade_high text not null,
  sent boolean not null default true,
  style text,
  tags text[] default '{}',
  hold_color text,
  count integer default 1,
  route_name text,
  location text,
  notes text,
  attempts integer,
  sessions integer,
  -- Media URIs are device-local for now (phase 1).
  -- Phase 3 will move them to Supabase Storage and use storage paths instead.
  route_media jsonb,
  climb_media jsonb,
  date date not null,
  visibility text not null default 'public',  -- public | private (followers added later)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists climbs_user_id_idx on climbs (user_id);
create index if not exists climbs_date_idx on climbs (date desc);
create index if not exists climbs_visibility_idx on climbs (visibility);

-- Auto-update `updated_at`
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists climbs_set_updated_at on climbs;
create trigger climbs_set_updated_at
  before update on climbs
  for each row execute function set_updated_at();

-- ─── Follows (phase 2) ─────────────────────────────────────────────────────
create table if not exists follows (
  follower_id uuid not null references users(id) on delete cascade,
  followee_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on follows (followee_id);

-- ─── Likes (phase 2) ───────────────────────────────────────────────────────
create table if not exists likes (
  user_id uuid not null references users(id) on delete cascade,
  climb_id uuid not null references climbs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, climb_id)
);

-- ─── Notifications (phase 2) ───────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,           -- e.g. 'follow' | 'like' | 'new_climb'
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, read_at);

-- ─── Permissive RLS (no-auth mode) ─────────────────────────────────────────
-- We enable RLS on every table but add wide-open policies. When real auth lands,
-- we'll replace these with proper user-scoped policies.

alter table users         enable row level security;
alter table climbs        enable row level security;
alter table follows       enable row level security;
alter table likes         enable row level security;
alter table notifications enable row level security;

create policy "anon read users"  on users         for select using (true);
create policy "anon write users" on users         for all    using (true) with check (true);
create policy "anon read climbs" on climbs        for select using (true);
create policy "anon write climbs" on climbs       for all    using (true) with check (true);
create policy "anon rw follows"  on follows       for all    using (true) with check (true);
create policy "anon rw likes"    on likes         for all    using (true) with check (true);
create policy "anon rw notifs"   on notifications for all    using (true) with check (true);
