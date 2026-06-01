-- Global model routing for PromptLab (read/write via server service role only).
-- Run in Supabase SQL Editor after phase-3.

create table if not exists public.app_runtime_config (
  id text primary key,
  model_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.app_runtime_config enable row level security;

comment on table public.app_runtime_config is 'Published AI provider/model routing; consumed by Vercel API for all users.';
