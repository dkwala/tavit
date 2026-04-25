-- Migration 0006 — Tally import fields
-- tallyGuid: nullable. PostgreSQL allows multiple NULLs in a unique index.
-- NULLs = manually created vouchers. Non-null values must be unique.

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS tally_guid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_tally_guid
  ON vouchers (tally_guid)
  WHERE tally_guid IS NOT NULL;

ALTER TABLE voucher_line_items
  ADD COLUMN IF NOT EXISTS cess_amount INTEGER NOT NULL DEFAULT 0;
