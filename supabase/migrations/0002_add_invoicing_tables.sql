-- ─────────────────────────────────────────────────────────────────────────────
-- Tavit — Invoicing & Stock Tables (Migration 0002)
-- Adds vouchers, line items, tax codes, stock management, and journal entries
-- All new tables have Row-Level Security enabled for multi-tenant isolation
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. tax_codes ──────────────────────────────────────────────────────────────
create table if not exists public.tax_codes (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  code              text not null,
  description       text not null,
  tax_rate          integer not null,          -- basis points: 1800 = 18%
  cgst_rate         integer not null,          -- basis points: 900 = 9%
  sgst_rate         integer not null,          -- basis points: 900 = 9%
  igst_rate         integer not null,          -- basis points: 1800 = 18%
  applies_to        text not null default 'both',  -- goods|services|both
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists tax_codes_company_id_idx on public.tax_codes (company_id);

create trigger tax_codes_updated_at
  before update on public.tax_codes
  for each row execute function public.set_updated_at();

-- ── 2. vouchers ───────────────────────────────────────────────────────────────
create table if not exists public.vouchers (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete cascade,
  gstin_id              uuid not null references public.gstins (id) on delete restrict,
  voucher_type          text not null,              -- sales_invoice|purchase_invoice|credit_note|debit_note
  voucher_number        text not null,              -- e.g., "INV-2024-001"
  reference_voucher_id  uuid,                       -- FK for credit/debit notes
  party_name            text not null,
  party_pan             char(10),
  party_gstin           char(15),
  invoice_date          timestamptz not null,
  due_date              timestamptz,
  description           text,
  total_amount          integer not null,           -- paise
  cgst_amount           integer not null default 0, -- paise
  sgst_amount           integer not null default 0, -- paise
  igst_amount           integer not null default 0, -- paise
  total_tax             integer not null default 0, -- paise
  grand_total           integer not null,           -- paise
  status                text not null default 'draft',  -- draft|finalized|reversed
  is_reversal_entry     boolean not null default false,
  created_at            timestamptz not null default now(),
  created_by            uuid not null,
  finalized_at          timestamptz,
  reversed_at           timestamptz,
  foreign key (reference_voucher_id) references public.vouchers (id) on delete set null
);

create index if not exists vouchers_company_id_idx on public.vouchers (company_id);
create index if not exists vouchers_gstin_id_idx on public.vouchers (gstin_id);
create index if not exists vouchers_number_idx on public.vouchers (voucher_number);
create index if not exists vouchers_created_at_idx on public.vouchers (created_at);

-- ── 3. voucher_line_items ─────────────────────────────────────────────────────
create table if not exists public.voucher_line_items (
  id          uuid primary key default gen_random_uuid(),
  voucher_id  uuid not null references public.vouchers (id) on delete cascade,
  item_name   text not null,
  hsn_sac_code text,
  quantity    integer not null,
  unit_price  integer not null,          -- paise
  line_amount integer not null,          -- paise
  tax_code_id uuid not null references public.tax_codes (id) on delete restrict,
  cgst_rate   integer not null,          -- basis points
  sgst_rate   integer not null,          -- basis points
  igst_rate   integer not null,          -- basis points
  cgst_amount integer not null default 0, -- paise
  sgst_amount integer not null default 0, -- paise
  igst_amount integer not null default 0, -- paise
  line_total  integer not null,          -- paise
  created_at  timestamptz not null default now()
);

create index if not exists voucher_line_items_voucher_id_idx on public.voucher_line_items (voucher_id);
create index if not exists voucher_line_items_tax_code_id_idx on public.voucher_line_items (tax_code_id);

-- ── 4. stock_items ────────────────────────────────────────────────────────────
create table if not exists public.stock_items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  name             text not null,
  hsn_sac_code     text not null,
  unit             text not null,              -- pcs, kg, ltr, box, etc.
  current_quantity integer not null default 0,
  opening_quantity integer not null default 0,
  opening_value    integer,                    -- paise
  reorder_level    integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists stock_items_company_id_idx on public.stock_items (company_id);

create trigger stock_items_updated_at
  before update on public.stock_items
  for each row execute function public.set_updated_at();

-- ── 5. stock_transactions ─────────────────────────────────────────────────────
create table if not exists public.stock_transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  voucher_id       uuid references public.vouchers (id) on delete set null,
  stock_item_id    uuid not null references public.stock_items (id) on delete restrict,
  transaction_type text not null,              -- inward|outward|adjustment|opening
  quantity         integer not null,           -- can be negative for outward
  unit_price       integer,                    -- paise
  transaction_date timestamptz not null,
  description      text,
  created_at       timestamptz not null default now()
);

create index if not exists stock_transactions_company_id_idx on public.stock_transactions (company_id);
create index if not exists stock_transactions_voucher_id_idx on public.stock_transactions (voucher_id);
create index if not exists stock_transactions_stock_item_id_idx on public.stock_transactions (stock_item_id);

-- ── 6. journal_entries ────────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  voucher_id  uuid references public.vouchers (id) on delete set null,
  account_name text not null,
  debit_amount integer not null default 0,    -- paise
  credit_amount integer not null default 0,   -- paise
  posted_at   timestamptz not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists journal_entries_company_id_idx on public.journal_entries (company_id);
create index if not exists journal_entries_voucher_id_idx on public.journal_entries (voucher_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tax_codes enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_line_items enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.journal_entries enable row level security;

-- ── tax_codes policies ────────────────────────────────────────────────────────
drop policy if exists "tax_codes: owners can manage" on public.tax_codes;
create policy "tax_codes: owners can manage"
  on public.tax_codes for all
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ── vouchers policies ─────────────────────────────────────────────────────────
drop policy if exists "vouchers: members can read own company" on public.vouchers;
create policy "vouchers: members can read own company"
  on public.vouchers for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "vouchers: members can create" on public.vouchers;
create policy "vouchers: members can create"
  on public.vouchers for insert
  with check (company_id in (select public.my_company_ids()));

drop policy if exists "vouchers: owners can update draft" on public.vouchers;
create policy "vouchers: owners can update draft"
  on public.vouchers for update
  using (
    status = 'draft'
    and company_id in (
      select company_id from public.company_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ── voucher_line_items policies ───────────────────────────────────────────────
drop policy if exists "voucher_line_items: read with voucher" on public.voucher_line_items;
create policy "voucher_line_items: read with voucher"
  on public.voucher_line_items for select
  using (
    voucher_id in (
      select id from public.vouchers
      where company_id in (select public.my_company_ids())
    )
  );

drop policy if exists "voucher_line_items: insert own company voucher" on public.voucher_line_items;
create policy "voucher_line_items: insert own company voucher"
  on public.voucher_line_items for insert
  with check (
    voucher_id in (
      select id from public.vouchers
      where company_id in (select public.my_company_ids())
    )
  );

drop policy if exists "voucher_line_items: update draft voucher only" on public.voucher_line_items;
create policy "voucher_line_items: update draft voucher only"
  on public.voucher_line_items for update
  using (
    voucher_id in (
      select id from public.vouchers
      where status = 'draft'
        and company_id in (
          select company_id from public.company_members
          where user_id = auth.uid() and role = 'owner'
        )
    )
  );

-- ── stock_items policies ──────────────────────────────────────────────────────
drop policy if exists "stock_items: members can read own company" on public.stock_items;
create policy "stock_items: members can read own company"
  on public.stock_items for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "stock_items: accountants can manage" on public.stock_items;
create policy "stock_items: accountants can manage"
  on public.stock_items for all
  using (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid()
        and role in ('owner', 'accountant')
    )
  )
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid()
        and role in ('owner', 'accountant')
    )
  );

-- ── stock_transactions policies ───────────────────────────────────────────────
drop policy if exists "stock_transactions: members can read" on public.stock_transactions;
create policy "stock_transactions: members can read"
  on public.stock_transactions for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "stock_transactions: accountants can create" on public.stock_transactions;
create policy "stock_transactions: accountants can create"
  on public.stock_transactions for insert
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid()
        and role in ('owner', 'accountant')
    )
  );

-- ── journal_entries policies ──────────────────────────────────────────────────
drop policy if exists "journal_entries: members can read" on public.journal_entries;
create policy "journal_entries: members can read"
  on public.journal_entries for select
  using (company_id in (select public.my_company_ids()));

drop policy if exists "journal_entries: accountants can create" on public.journal_entries;
create policy "journal_entries: accountants can create"
  on public.journal_entries for insert
  with check (
    company_id in (
      select company_id from public.company_members
      where user_id = auth.uid()
        and role in ('owner', 'accountant')
    )
  );
