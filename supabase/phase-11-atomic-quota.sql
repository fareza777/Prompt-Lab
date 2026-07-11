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

revoke all on function public.reserve_promptlab_quota(bigint) from public;
grant execute on function public.reserve_promptlab_quota(bigint) to authenticated;
