-- ─────────────────────────────────────────────────────────────────────────────
-- Tavit — initial schema
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. profiles ───────────────────────────────────────────────────────────────
-- Thin auth record: one row per auth.users row.
-- Company data lives in companies/gstins — NOT here.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  onboarded  boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Remove legacy flat columns if upgrading from old single-table schema
alter table public.profiles drop column if exists company_name;
alter table public.profiles drop column if exists gstin;
alter table public.profiles drop column if exists pan;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row the moment a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. companies ─────────────────────────────────────────────────────────────
-- A company can have multiple GSTINs (multi-state). Multi-entity ready.
-- All monetary values stored as INTEGER (paise) in feature tables — never FLOAT.

create table if not exists public.companies (
  id                   uuid    primary key default gen_random_uuid(),
  name                 text    not null,
  pan                  char(10) not null,
  state_code           char(2)  not null,      -- e.g. '27' Maharashtra, '29' Karnataka
  financial_year_start smallint not null default 4,  -- month number (4 = April)
  tier                 text    not null default 'starter'
                         check (tier in ('starter', 'growth', 'pro')),
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz             -- soft-delete; never hard-delete
);

-- ── 3. company_members ───────────────────────────────────────────────────────
-- Joins auth users to companies with a role.
-- Phase 1: one owner per company. Phase 2+: accountants, CAs, viewers.

create table if not exists public.company_members (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references auth.users (id)    on delete cascade,
  role       text not null default 'owner'
               check (role in ('owner', 'accountant', 'ca', 'viewer')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- Index for the most common lookup: "which companies does this user belong to?"
create index if not exists company_members_user_id_idx
  on public.company_members (user_id);

-- ── 4. gstins ────────────────────────────────────────────────────────────────
-- A company can have one GSTIN per state. Multi-GSTIN ready from day 1.

create table if not exists public.gstins (
  id                uuid    primary key default gen_random_uuid(),
  company_id        uuid    not null references public.companies (id) on delete cascade,
  gstin             char(15) not null,
  trade_name        text,
  state_code        char(2)  not null,       -- first 2 chars of GSTIN
  registration_type text    not null default 'regular'
                      check (registration_type in ('regular', 'composition', 'sez', 'unregistered')),
  status            text    not null default 'active'
                      check (status in ('active', 'cancelled', 'suspended')),
  created_at        timestamptz not null default now(),
  unique (gstin)
);

create index if not exists gstins_company_id_idx
  on public.gstins (company_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- Every table is locked down. Tenant isolation enforced at DB level.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.companies       enable row level security;
alter table public.company_members enable row level security;
alter table public.gstins          enable row level security;

-- Helper function: returns all company_ids the current user is a member of.
-- SECURITY DEFINER so it can read company_members without additional policies.
create or replace function public.my_company_ids()
returns setof uuid
language sql stable
security definer set search_path = public
as $$
  select company_id
  from   public.company_members
  where  user_id = auth.uid()
$$;

-- ── profiles policies ────────────────────────────────────────────────────────
drop policy if exists "profiles: own row only" on public.profiles;
create policy "profiles: own row only"
  on public.profiles for all
  using     (id = auth.uid())
  with check (id = auth.uid());

-- ── companies policies ───────────────────────────────────────────────────────
drop policy if exists "companies: members can read" on public.companies;
create policy "companies: members can read"
  on public.companies for select
  using (
    id in (select public.my_company_ids())
    and deleted_at is null
  );

drop policy if exists "companies: authenticated users can insert" on public.companies;
create policy "companies: authenticated users can insert"
  on public.companies for insert
  with check (auth.uid() is not null);

drop policy if exists "companies: owners can update" on public.companies;
create policy "companies: owners can update"
  on public.companies for update
  using (
    id in (
      select company_id from public.company_members
      where  user_id = auth.uid() and role = 'owner'
    )
  );

-- ── company_members policies ─────────────────────────────────────────────────
drop policy if exists "company_members: read own" on public.company_members;
create policy "company_members: read own"
  on public.company_members for select
  using (user_id = auth.uid());

drop policy if exists "company_members: insert own" on public.company_members;
create policy "company_members: insert own"
  on public.company_members for insert
  with check (
    user_id = auth.uid()              -- can only create membership for yourself
    and auth.uid() is not null
  );

-- ── gstins policies ──────────────────────────────────────────────────────────
drop policy if exists "gstins: members can read" on public.gstins;
create policy "gstins: members can read"
  on public.gstins for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "gstins: owners can insert" on public.gstins;
create policy "gstins: owners can insert"
  on public.gstins for insert
  with check (
    company_id in (
      select company_id from public.company_members
      where  user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "gstins: owners can update" on public.gstins;
create policy "gstins: owners can update"
  on public.gstins for update
  using (
    company_id in (
      select company_id from public.company_members
      where  user_id = auth.uid() and role = 'owner'
    )
  );
