create or replace function public.reserve_promptlab_quota(p_estimate bigint)
returns table(ok boolean, remaining bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_estimate is null or p_estimate <= 0 then
    raise exception 'invalid quota estimate';
  end if;

  update public.profiles
  set quota_used = (
        case when quota_reset_at < current_date then 0 else quota_used end
        + p_estimate
      )::integer,
      quota_reset_at = case
        when quota_reset_at < current_date then (now() + interval '30 days')::date
        else quota_reset_at
      end,
      updated_at = now()
  where id = auth.uid()
    and case when quota_reset_at < current_date then 0 else quota_used end
        + p_estimate <= quota_limit;

  return query
  select found,
         coalesce((
           select quota_limit - quota_used
           from public.profiles
           where id = auth.uid()
         ), 0)::bigint;
end;
$$;

revoke all on function public.reserve_promptlab_quota(bigint) from public, anon;
grant execute on function public.reserve_promptlab_quota(bigint) to authenticated;

alter table public.usage_events
  add column if not exists idempotency_key text,
  add column if not exists quota_remaining bigint;

create unique index if not exists usage_events_user_id_idempotency_key_idx
on public.usage_events (user_id, idempotency_key)
where idempotency_key is not null;

create or replace function public.record_promptlab_usage(
  p_estimate bigint,
  p_event_type text,
  p_metadata jsonb,
  p_idempotency_key text
)
returns table(ok boolean, remaining bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_existing_remaining bigint;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if p_estimate is null or p_estimate <= 0 then
    raise exception 'invalid quota estimate';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200 then
    raise exception 'invalid idempotency key';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'profile not found';
  end if;

  select quota_remaining into v_existing_remaining
  from public.usage_events
  where user_id = v_uid
    and idempotency_key = p_idempotency_key;

  if found then
    return query select true, greatest(0, coalesce(v_existing_remaining, 0))::bigint;
    return;
  end if;

  if v_profile.quota_reset_at < current_date then
    update public.profiles
    set quota_used = 0,
        quota_reset_at = (now() + interval '30 days')::date,
        updated_at = now()
    where id = v_uid
    returning * into v_profile;
  end if;

  if v_profile.quota_used + p_estimate > v_profile.quota_limit then
    return query
    select false, greatest(0, v_profile.quota_limit - v_profile.quota_used)::bigint;
    return;
  end if;

  update public.profiles
  set quota_used = quota_used + p_estimate,
      updated_at = now()
  where id = v_uid
  returning * into v_profile;

  v_existing_remaining := greatest(0, v_profile.quota_limit - v_profile.quota_used)::bigint;

  insert into public.usage_events (
    user_id,
    event_type,
    token_estimate,
    metadata,
    idempotency_key,
    quota_remaining
  ) values (
    v_uid,
    left(coalesce(p_event_type, 'generation'), 80),
    p_estimate,
    coalesce(p_metadata, '{}'::jsonb),
    p_idempotency_key,
    v_existing_remaining
  );

  return query select true, v_existing_remaining;
end;
$$;

revoke all on function public.record_promptlab_usage(bigint, text, jsonb, text) from public, anon;
grant execute on function public.record_promptlab_usage(bigint, text, jsonb, text) to authenticated;
