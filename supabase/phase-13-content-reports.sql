-- Phase 13 — in-app reporting for AI-generated output.
--
-- Google Play's Generative AI policy requires apps that produce AI content to
-- let users flag offensive output from inside the app, and to act on what is
-- reported. This table is the durable record a human reviews.
--
-- Run this in the Supabase SQL Editor once.

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Null when an anonymous trial user reports.
  user_id uuid references auth.users (id) on delete set null,
  reason text not null,
  detail text,
  -- The offending output, so a reviewer does not need the user to reproduce it.
  content text,
  status text not null default 'open',
  reviewed_at timestamptz,
  reviewer_note text
);

create index if not exists content_reports_created_at_idx
  on public.content_reports (created_at desc);

create index if not exists content_reports_status_idx
  on public.content_reports (status)
  where status = 'open';

-- Reports are written by the server with the service role and read only by
-- admins, so no client-facing policy is granted.
alter table public.content_reports enable row level security;
