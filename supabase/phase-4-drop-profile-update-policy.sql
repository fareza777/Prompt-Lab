-- Opsional: hapus policy update profile dari client agar tidak bentrok dengan pencatatan quota.
-- Service role / fungsi security definer tetap bisa update profiles.

drop policy if exists "profiles_update_own_basic" on public.profiles;
