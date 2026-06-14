-- Optional indexes for admin analytics queries (run once in Supabase SQL Editor).

create index if not exists usage_events_created_at_idx on public.usage_events (created_at desc);
create index if not exists usage_events_user_id_created_at_idx on public.usage_events (user_id, created_at desc);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists membership_events_created_at_idx on public.membership_events (created_at desc);
