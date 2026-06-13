-- Reset account to normal Free user (billing test).
-- Run in Supabase SQL Editor (Production).

update public.profiles
set
  role = 'user',
  plan = 'Free',
  quota_limit = 50000,
  quota_used = 0,
  play_billing = 'Not linked',
  quota_reset_at = (now() + interval '30 days')::date,
  updated_at = now()
where lower(email) = lower('fajar.mreza@gmail.com');

-- Verify:
-- select email, role, plan, quota_used, quota_limit, play_billing from public.profiles where lower(email) = lower('fajar.mreza@gmail.com');
