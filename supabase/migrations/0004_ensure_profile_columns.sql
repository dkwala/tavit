-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0004 — ensure all profile + company columns exist
-- Run this if you see "Could not find column in schema cache" errors.
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS).
-- After running, reload the PostgREST schema cache:
--   Supabase dashboard → Settings → API → "Reload schema"
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists full_name  text,
  add column if not exists username   text,
  add column if not exists onboarded  boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Partial unique index on username (NULLs excluded)
create unique index if not exists profiles_username_unique
  on public.profiles (username)
  where username is not null;

-- ── companies ─────────────────────────────────────────────────────────────────
alter table public.companies
  add column if not exists address_line1 text,
  add column if not exists city          text,
  add column if not exists pincode       char(6);

-- ── notify PostgREST to reload its schema cache ───────────────────────────────
notify pgrst, 'reload schema';
