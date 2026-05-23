-- Jalankan SETELAH phase-3-production-fix.sql jika quota masih gagal.
-- Menonaktifkan RLS di dalam fungsi record_usage_event agar update quota_used tidak terblokir.

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
set row_security = off
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
    insert into public.profiles (id, email, full_name)
    select
      u.id,
      coalesce(u.email, ''),
      coalesce(u.raw_user_meta_data->>'full_name', '')
    from auth.users u
    where u.id = v_uid
    on conflict (id) do nothing;

    select * into v_profile
    from public.profiles
    where profiles.id = v_uid
    for update;

    if not found then
      raise exception 'Profile not found';
    end if;
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

grant execute on function public.record_usage_event(text, integer, jsonb) to authenticated;
