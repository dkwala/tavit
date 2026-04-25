-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0005 — GST compliance tracking
-- Tables: compliance_deadlines, alert_preferences, alert_logs
-- ─────────────────────────────────────────────────────────────────────────────

-- ── compliance_deadlines ──────────────────────────────────────────────────────
-- One row per GSTIN × return-type × period.
-- Seeded by the Next.js server action on first page load; idempotent (ON CONFLICT DO NOTHING).

create table if not exists public.compliance_deadlines (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies  (id) on delete cascade,
  gstin_id     uuid        not null references public.gstins     (id) on delete cascade,
  return_type  text        not null
                 check (return_type in ('GSTR-1','GSTR-3B','GSTR-2B','GSTR-9','GSTR-9C','GSTR-4','CMP-08')),
  period_month smallint    not null check (period_month between 1 and 12),
  period_year  smallint    not null,
  due_date     date        not null,
  filing_date  date,                    -- null until filed
  status       text        not null default 'pending'
                 check (status in ('pending','filed','overdue')),
  is_nil_return boolean    not null default false,
  -- tax_payable in paise (integer); used for GSTR-3B interest calc
  tax_payable  integer     not null default 0 check (tax_payable >= 0),
  source       text        not null default 'system',  -- 'system' | 'manual'
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (gstin_id, return_type, period_month, period_year)
);

create index if not exists compliance_deadlines_company_id_idx
  on public.compliance_deadlines (company_id);

create index if not exists compliance_deadlines_gstin_id_idx
  on public.compliance_deadlines (gstin_id);

create index if not exists compliance_deadlines_due_date_idx
  on public.compliance_deadlines (due_date);

create or replace trigger compliance_deadlines_updated_at
  before update on public.compliance_deadlines
  for each row execute function public.set_updated_at();

-- ── alert_preferences ─────────────────────────────────────────────────────────
-- Per-user, per-company alert settings.
-- alert_days: sorted DESC, e.g. {7,3,1} means send at 7, 3, and 1 days before.

create table if not exists public.alert_preferences (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users   (id) on delete cascade,
  company_id        uuid        not null references public.companies (id) on delete cascade,
  alert_days        integer[]   not null default '{7,3,1}',
  email_enabled     boolean     not null default true,
  whatsapp_enabled  boolean     not null default false,
  whatsapp_number   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, company_id)
);

create or replace trigger alert_preferences_updated_at
  before update on public.alert_preferences
  for each row execute function public.set_updated_at();

-- ── alert_logs ────────────────────────────────────────────────────────────────
-- Deduplication + audit log for sent alerts.
-- The unique constraint prevents double-sending the same alert.

create table if not exists public.alert_logs (
  id           uuid        primary key default gen_random_uuid(),
  deadline_id  uuid        not null references public.compliance_deadlines (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  alert_type   text        not null check (alert_type in ('email','whatsapp')),
  days_before  integer     not null,
  status       text        not null check (status in ('sent','failed')),
  error_message text,
  sent_at      timestamptz not null default now(),
  unique (deadline_id, user_id, alert_type, days_before)
);

create index if not exists alert_logs_deadline_id_idx
  on public.alert_logs (deadline_id);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table public.compliance_deadlines enable row level security;
alter table public.alert_preferences    enable row level security;
alter table public.alert_logs           enable row level security;

-- compliance_deadlines: company members can read/insert/update
drop policy if exists "compliance_deadlines: members can read" on public.compliance_deadlines;
create policy "compliance_deadlines: members can read"
  on public.compliance_deadlines for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "compliance_deadlines: members can insert" on public.compliance_deadlines;
create policy "compliance_deadlines: members can insert"
  on public.compliance_deadlines for insert
  with check (company_id in (select public.my_company_ids()));

drop policy if exists "compliance_deadlines: members can update" on public.compliance_deadlines;
create policy "compliance_deadlines: members can update"
  on public.compliance_deadlines for update
  using (company_id in (select public.my_company_ids()));

-- alert_preferences: own rows only
drop policy if exists "alert_preferences: own rows" on public.alert_preferences;
create policy "alert_preferences: own rows"
  on public.alert_preferences for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- alert_logs: own rows only
drop policy if exists "alert_logs: own rows" on public.alert_logs;
create policy "alert_logs: own rows"
  on public.alert_logs for all
  using     (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────
notify pgrst, 'reload schema';
