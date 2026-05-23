create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'Free' check (plan in ('Free', 'Pro', 'Business')),
  quota_used integer not null default 0 check (quota_used >= 0),
  quota_limit integer not null default 50000 check (quota_limit >= 0),
  quota_reset_at date not null default (now() + interval '30 days')::date,
  play_billing text not null default 'Not linked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  token_estimate integer not null default 0 check (token_estimate >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google_play',
  event_type text not null,
  plan text not null check (plan in ('Free', 'Pro', 'Business')),
  purchase_token_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.membership_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and role = 'user');

drop policy if exists "profiles_update_own_basic" on public.profiles;
create policy "profiles_update_own_basic"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select role from public.profiles where id = auth.uid())
  and plan = (select plan from public.profiles where id = auth.uid())
  and quota_limit = (select quota_limit from public.profiles where id = auth.uid())
  and quota_used = (select quota_used from public.profiles where id = auth.uid())
);

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own"
on public.usage_events for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "usage_events_insert_own" on public.usage_events;
create policy "usage_events_insert_own"
on public.usage_events for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "membership_events_select_own" on public.membership_events;
create policy "membership_events_select_own"
on public.membership_events for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_my_entitlement()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  plan text,
  quota_used integer,
  quota_limit integer,
  quota_reset_at date,
  play_billing text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.plan,
    case when p.quota_reset_at < current_date then 0 else p.quota_used end as quota_used,
    p.quota_limit,
    p.quota_reset_at,
    p.play_billing
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.record_usage_event(
  p_event_type text,
  p_token_estimate integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  plan text,
  quota_used integer,
  quota_limit integer,
  quota_reset_at date,
  play_billing text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_tokens integer := greatest(0, coalesce(p_token_estimate, 0));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where profiles.id = v_uid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.quota_reset_at < current_date then
    update public.profiles
    set quota_used = 0,
        quota_reset_at = (now() + interval '30 days')::date
    where profiles.id = v_uid
    returning * into v_profile;
  end if;

  if v_profile.quota_used + v_tokens > v_profile.quota_limit then
    raise exception 'Quota exceeded';
  end if;

  insert into public.usage_events (user_id, event_type, token_estimate, metadata)
  values (v_uid, left(coalesce(p_event_type, 'generation'), 80), v_tokens, coalesce(p_metadata, '{}'::jsonb));

  update public.profiles
  set quota_used = quota_used + v_tokens
  where profiles.id = v_uid
  returning * into v_profile;

  return query
  select
    v_profile.id,
    v_profile.email,
    v_profile.full_name,
    v_profile.role,
    v_profile.plan,
    v_profile.quota_used,
    v_profile.quota_limit,
    v_profile.quota_reset_at,
    v_profile.play_billing;
end;
$$;

-- Optional: make your own account admin after you sign up once.
-- update public.profiles set role = 'admin', plan = 'Business', quota_limit = 1000000 where email = 'fajar.mreza@gmail.com';
