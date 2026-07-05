-- Run once in Supabase SQL Editor after enabling Google OAuth.
-- Ensures Google display names map into profiles.full_name.

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
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill empty names for existing Google users
update public.profiles p
set full_name = coalesce(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  u.raw_user_meta_data->>'display_name',
  p.full_name
)
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.full_name = '');
