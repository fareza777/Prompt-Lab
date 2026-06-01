-- Grant super / admin access (unlimited quota) for a specific account.
-- Run once in Supabase SQL Editor (Production).

update public.profiles
set
  role = 'admin',
  plan = 'Business',
  quota_limit = 2147483647,
  quota_used = 0,
  quota_reset_at = (now() + interval '365 days')::date,
  updated_at = now()
where lower(email) = lower('fajar.mreza@gmail.com');

-- Verify (should return 1 row with role admin):
-- select email, role, plan, quota_used, quota_limit, quota_reset_at from public.profiles where lower(email) = lower('fajar.mreza@gmail.com');
