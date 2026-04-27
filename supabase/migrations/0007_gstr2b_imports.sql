-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007 — GSTR-2B import table + status constraint fix
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix pre-existing bug: buildGstr1Action / buildGstr3bAction write status='draft'
-- but the constraint only allowed ('pending','filed','overdue').
ALTER TABLE public.compliance_deadlines
  DROP CONSTRAINT IF EXISTS compliance_deadlines_status_check;

ALTER TABLE public.compliance_deadlines
  ADD CONSTRAINT compliance_deadlines_status_check
    CHECK (status IN ('pending', 'filed', 'overdue', 'draft'));

-- ─────────────────────────────────────────────────────────────────────────────
-- GSTR-2B import table
-- One row per invoice per period per GSTIN.
-- Re-imports are idempotent via ON CONFLICT DO NOTHING on the unique constraint.
-- All monetary amounts stored in paise (integer), consistent with vouchers table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gstr2b_imports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES public.companies(id)  ON DELETE CASCADE,
  gstin_id         UUID        NOT NULL REFERENCES public.gstins(id)     ON DELETE CASCADE,
  period_month     SMALLINT    NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year      SMALLINT    NOT NULL,
  invoice_no       TEXT        NOT NULL,
  invoice_date     DATE        NOT NULL,
  supplier_gstin   CHAR(15)    NOT NULL,
  taxable_value    INTEGER     NOT NULL DEFAULT 0 CHECK (taxable_value >= 0),
  igst             INTEGER     NOT NULL DEFAULT 0 CHECK (igst >= 0),
  cgst             INTEGER     NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst             INTEGER     NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  cess             INTEGER     NOT NULL DEFAULT 0 CHECK (cess >= 0),
  -- Y = fully available, N = not available, T = temporary reversal (GST portal values)
  itc_availability CHAR(1)     NOT NULL DEFAULT 'Y' CHECK (itc_availability IN ('Y', 'N', 'T')),
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (gstin_id, period_month, period_year, invoice_no, supplier_gstin)
);

-- Indexes for reconciliation queries (gstin+period is the primary lookup pattern)
CREATE INDEX IF NOT EXISTS gstr2b_imports_gstin_period_idx
  ON public.gstr2b_imports (gstin_id, period_month, period_year);

CREATE INDEX IF NOT EXISTS gstr2b_imports_company_id_idx
  ON public.gstr2b_imports (company_id);

-- Row-Level Security (same pattern as compliance_deadlines)
ALTER TABLE public.gstr2b_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gstr2b_imports: members can read" ON public.gstr2b_imports;
CREATE POLICY "gstr2b_imports: members can read"
  ON public.gstr2b_imports FOR SELECT
  USING (company_id IN (SELECT public.my_company_ids()));

DROP POLICY IF EXISTS "gstr2b_imports: members can insert" ON public.gstr2b_imports;
CREATE POLICY "gstr2b_imports: members can insert"
  ON public.gstr2b_imports FOR INSERT
  WITH CHECK (company_id IN (SELECT public.my_company_ids()));

DROP POLICY IF EXISTS "gstr2b_imports: members can delete" ON public.gstr2b_imports;
CREATE POLICY "gstr2b_imports: members can delete"
  ON public.gstr2b_imports FOR DELETE
  USING (company_id IN (SELECT public.my_company_ids()));

NOTIFY pgrst, 'reload schema';
