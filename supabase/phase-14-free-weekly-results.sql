-- Free accounts: five finished-result reservations per ISO week (Monday UTC).
-- Existing token quota remains intact for cost control and paid plans.

create or replace function public.reserve_promptlab_weekly_result(
  p_idempotency_key text
)
returns table(ok boolean, remaining integer, reset_at timestamptz, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_key text := 'weekly-result:' || btrim(coalesce(p_idempotency_key, ''));
  v_start timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  v_reset timestamptz := (date_trunc('week', now() at time zone 'UTC') + interval '7 days') at time zone 'UTC';
  v_used integer;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null or length(p_idempotency_key) > 180 then
    raise exception 'invalid idempotency key';
  end if;

  select plan into v_plan
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'profile not found';
  end if;

  if coalesce(v_plan, 'Free') <> 'Free' then
    return query select true, 5, v_reset, 'paid_plan'::text;
    return;
  end if;

  if exists (
    select 1 from public.usage_events
    where user_id = v_uid and idempotency_key = v_key
  ) then
    select count(*)::integer into v_used
    from public.usage_events
    where user_id = v_uid
      and event_type = 'finished_result'
      and created_at >= v_start;
    return query select true, greatest(0, 5 - v_used), v_reset, 'idempotent'::text;
    return;
  end if;

  select count(*)::integer into v_used
  from public.usage_events
  where user_id = v_uid
    and event_type = 'finished_result'
    and created_at >= v_start;

  if v_used >= 5 then
    return query select false, 0, v_reset, 'weekly_limit'::text;
    return;
  end if;

  insert into public.usage_events (
    user_id, event_type, token_estimate, metadata, idempotency_key, quota_remaining
  ) values (
    v_uid,
    'finished_result',
    0,
    jsonb_build_object('week_start', v_start, 'reserved', true),
    v_key,
    greatest(0, 4 - v_used)
  );

  return query select true, greatest(0, 4 - v_used), v_reset, 'reserved'::text;
end;
$$;

create or replace function public.release_promptlab_weekly_result(
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  delete from public.usage_events
  where user_id = v_uid
    and event_type = 'finished_result'
    and idempotency_key = 'weekly-result:' || btrim(coalesce(p_idempotency_key, ''))
    and coalesce((metadata ->> 'reserved')::boolean, false) = true;
  return found;
end;
$$;

revoke all on function public.reserve_promptlab_weekly_result(text) from public, anon;
revoke all on function public.release_promptlab_weekly_result(text) from public, anon;
grant execute on function public.reserve_promptlab_weekly_result(text) to authenticated;
grant execute on function public.release_promptlab_weekly_result(text) to authenticated;
