-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0003 — profile username + company address fields
-- Supports the two-step onboarding:
--   Step 1 /onboarding          → sets full_name, username, password
--   Step 2 /onboarding/company  → sets company name, GSTIN, PAN, address
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles: add username ────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists username text;

-- Partial unique index: enforces uniqueness only among rows that actually have
-- a username set (NULLs are excluded so unfinished sign-ups don't conflict).
create unique index if not exists profiles_username_unique
  on public.profiles (username)
  where username is not null;

-- ── companies: add address fields ─────────────────────────────────────────────
alter table public.companies
  add column if not exists address_line1 text,
  add column if not exists city          text,
  add column if not exists pincode       char(6);
