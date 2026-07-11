alter table public.membership_events
  add column if not exists provider_event_key text,
  add column if not exists provider_event_at timestamptz;

create unique index if not exists membership_events_provider_event_key_idx
on public.membership_events (provider, provider_event_key)
where provider_event_key is not null;

create table if not exists public.billing_purchase_claims (
  purchase_token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint billing_purchase_claims_hash_format check (purchase_token_hash ~ '^[a-f0-9]{64}$')
);

alter table public.billing_purchase_claims enable row level security;

create or replace function public.apply_promptlab_membership_event(
  p_user_id uuid,
  p_provider text,
  p_provider_event_key text,
  p_provider_event_at timestamptz,
  p_event_type text,
  p_plan text,
  p_quota_limit integer,
  p_play_billing text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(ok boolean, applied boolean, conflict boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_user uuid;
  v_inserted_id uuid;
begin
  if p_user_id is null
     or nullif(trim(p_provider), '') is null
     or nullif(trim(p_provider_event_key), '') is null
     or p_provider_event_at is null
     or p_plan not in ('Free', 'Pro', 'Business')
     or p_quota_limit < 0 then
    return query select false, false, false;
    return;
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return query select false, false, false;
    return;
  end if;

  select me.user_id into v_existing_user
  from public.membership_events me
  where me.provider = p_provider
    and me.provider_event_key = p_provider_event_key;
  if found then
    return query select v_existing_user = p_user_id, false, v_existing_user <> p_user_id;
    return;
  end if;

  insert into public.membership_events (
    user_id, provider, provider_event_key, provider_event_at,
    event_type, plan, metadata
  ) values (
    p_user_id, p_provider, p_provider_event_key, p_provider_event_at,
    left(coalesce(p_event_type, 'membership_updated'), 120), p_plan, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider, provider_event_key) where provider_event_key is not null do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    select me.user_id into v_existing_user
    from public.membership_events me
    where me.provider = p_provider
      and me.provider_event_key = p_provider_event_key;
    return query select v_existing_user = p_user_id, false, v_existing_user <> p_user_id;
    return;
  end if;

  -- Record late history, but never let an older or same-time delivery overwrite entitlement.
  if exists (
    select 1 from public.membership_events me
    where me.user_id = p_user_id
      and me.provider = p_provider
      and me.id <> v_inserted_id
      and me.provider_event_at >= p_provider_event_at
  ) then
    return query select true, false, false;
    return;
  end if;

  update public.profiles
  set plan = p_plan,
      quota_limit = p_quota_limit,
      play_billing = p_play_billing,
      updated_at = now()
  where id = p_user_id;

  return query select true, true, false;
end;
$$;

create or replace function public.claim_google_play_membership(
  p_user_id uuid,
  p_purchase_token_hash text,
  p_event_type text,
  p_plan text,
  p_quota_limit integer,
  p_play_billing text,
  p_reset_usage boolean default false,
  p_quota_reset_at date default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(ok boolean, applied boolean, conflict boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_user_id is null
     or p_purchase_token_hash !~ '^[a-f0-9]{64}$'
     or p_plan not in ('Free', 'Pro', 'Business')
     or p_quota_limit < 0 then
    return query select false, false, false;
    return;
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return query select false, false, false;
    return;
  end if;

  insert into public.billing_purchase_claims (purchase_token_hash, user_id)
  values (p_purchase_token_hash, p_user_id)
  on conflict (purchase_token_hash) do nothing;

  select c.user_id into v_owner
  from public.billing_purchase_claims c
  where c.purchase_token_hash = p_purchase_token_hash;

  if v_owner is distinct from p_user_id then
    return query select false, false, true;
    return;
  end if;

  insert into public.membership_events (
    user_id, provider, provider_event_key, provider_event_at,
    event_type, plan, purchase_token_hash, metadata
  ) values (
    p_user_id, 'google_play', 'purchase:' || p_purchase_token_hash, now(),
    left(coalesce(p_event_type, 'subscription_verified'), 120), p_plan,
    p_purchase_token_hash, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider, provider_event_key) where provider_event_key is not null do nothing;

  update public.profiles
  set plan = p_plan,
      quota_limit = p_quota_limit,
      play_billing = p_play_billing,
      quota_used = case when p_reset_usage then 0 else quota_used end,
      quota_reset_at = case
        when p_reset_usage and p_quota_reset_at is not null then p_quota_reset_at
        else quota_reset_at
      end,
      updated_at = now()
  where id = p_user_id;

  return query select true, true, false;
end;
$$;

revoke all on function public.apply_promptlab_membership_event(uuid, text, text, timestamptz, text, text, integer, text, jsonb) from public;
revoke all on function public.claim_google_play_membership(uuid, text, text, text, integer, text, boolean, date, jsonb) from public;
grant execute on function public.apply_promptlab_membership_event(uuid, text, text, timestamptz, text, text, integer, text, jsonb) to service_role;
grant execute on function public.claim_google_play_membership(uuid, text, text, text, integer, text, boolean, date, jsonb) to service_role;
