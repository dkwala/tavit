from decimal import Decimal
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from .types import round_gst, ZERO

# Date tolerance for fuzzy invoice matching.
# GST law does not mandate a specific tolerance for ITC reconciliation.
# ±3 days covers transit time, month-end discrepancies, and Tally entry
# variations between buyer and supplier systems.
# CA-reviewed and approved: Session 1 — [fill date after review].
DATE_TOLERANCE_DAYS = 3


@dataclass
class PurchaseEntry:
    invoice_no:     str
    invoice_date:   str         # YYYY-MM-DD
    supplier_gstin: str
    taxable_value:  Decimal
    igst:           Decimal
    cgst:           Decimal
    sgst:           Decimal
    cess:           Decimal = Decimal('0')   # FIXED — added cess
    total_itc:      Decimal = Decimal('0')   # auto-computed if not provided

    def __post_init__(self):
        computed = self.igst + self.cgst + self.sgst + self.cess
        if self.total_itc == Decimal('0'):
            # Auto-compute if caller left it at default
            object.__setattr__(self, 'total_itc', computed)
        else:
            # Validate caller-provided value
            diff = abs(self.total_itc - computed)
            if diff > Decimal('1.00'):
                raise ValueError(
                    f"PurchaseEntry {self.invoice_no}: total_itc "
                    f"{self.total_itc} != igst+cgst+sgst+cess "
                    f"{computed} (diff: {diff})"
                )


@dataclass
class GSTR2BEntry:
    invoice_no:       str
    invoice_date:     str
    supplier_gstin:   str
    taxable_value:    Decimal
    igst:             Decimal
    cgst:             Decimal
    sgst:             Decimal
    cess:             Decimal = Decimal('0')   # FIXED — added cess
    itc_availability: str = "Y"               # "Y" eligible, "N" blocked, "T" deferred


@dataclass
class ReconciliationResult:
    matched:              list
    unmatched_in_books:   list
    unmatched_in_2b:      list
    total_itc_eligible:   Decimal   # "Y" entries — safe to claim in 3B Table 4
    total_itc_pending:    Decimal   # not in 2B yet — follow up with supplier
    total_itc_deferred:   Decimal   # FIXED — "T" entries, recoverable next month
    total_itc_ineligible: Decimal   # "N" entries only — permanently blocked Rule 38
    # Per-component for GSTR-3B Table 4 population
    eligible_igst:  Decimal = Decimal('0')
    eligible_cgst:  Decimal = Decimal('0')
    eligible_sgst:  Decimal = Decimal('0')
    eligible_cess:  Decimal = Decimal('0')


def reconcile_itc(
    purchase_entries: List[PurchaseEntry],
    gstr2b_entries:   List[GSTR2BEntry],
) -> ReconciliationResult:
    """
    Match purchase register against GSTR-2B. Returns four buckets:
    - matched / eligible    ("Y") — claim in GSTR-3B Table 4
    - matched / deferred    ("T") — supplier filed late, claim next month
    - matched / blocked     ("N") — Rule 38, never claimable
    - unmatched in books         — not in 2B, contact supplier
    - unmatched in 2B            — in 2B, not booked in Tally
    """

    # Build O(1) exact-match index keyed by (norm_gstin, norm_inv_no)
    exact_index: dict = {}
    for entry in gstr2b_entries:
        key = (
            _norm_gstin(entry.supplier_gstin),
            _normalize_invoice_no(entry.invoice_no),
        )
        # If duplicate key (same supplier + invoice, different date): keep first
        if key not in exact_index:
            exact_index[key] = entry

    used_ids = set()   # ids of matched 2B entries
    matched, unmatched_books = [], []

    for purchase in purchase_entries:
        p_key = (
            _norm_gstin(purchase.supplier_gstin),
            _normalize_invoice_no(purchase.invoice_no),
        )
        matched_entry = None
        match_type    = ""

        # Pass 1 — O(1) exact match (GSTIN + invoice no + exact date)
        candidate = exact_index.get(p_key)
        if candidate and id(candidate) not in used_ids:
            if candidate.invoice_date == purchase.invoice_date:
                matched_entry = candidate
                match_type    = "exact"

        # Pass 2 — fuzzy date (GSTIN + invoice no + ±3 days)
        if not matched_entry:
            for entry in gstr2b_entries:
                if (id(entry) not in used_ids
                        and _norm_gstin(entry.supplier_gstin) == p_key[0]
                        and _normalize_invoice_no(entry.invoice_no) == p_key[1]
                        and _dates_within_tolerance(
                            entry.invoice_date, purchase.invoice_date)):
                    matched_entry = entry
                    match_type    = "fuzzy_date"
                    break

        if matched_entry:
            used_ids.add(id(matched_entry))
            avail = matched_entry.itc_availability
            matched.append({
                "purchase":      purchase,
                "gstr2b":        matched_entry,
                "match_type":    match_type,
                "itc_status":    avail,
                "itc_amount":    purchase.total_itc if avail == "Y" else ZERO,
                "itc_deferred":  purchase.total_itc if avail == "T" else ZERO,
                "itc_blocked":   purchase.total_itc if avail == "N" else ZERO,
                "itc_available": avail == "Y",
            })
        else:
            unmatched_books.append({
                "purchase":       purchase,
                "supplier_gstin": purchase.supplier_gstin,
                "itc_at_risk":    purchase.total_itc,
                "reason":         "Not found in GSTR-2B",
                "action":         "Contact supplier or wait for next 2B cycle",
            })

    unmatched_2b = [
        {
            "gstr2b": entry,
            "reason": "In 2B but not in purchase register",
            "action": "Verify and book the invoice in Tally",
        }
        for entry in gstr2b_entries if id(entry) not in used_ids
    ]

    # Aggregate totals
    total_eligible   = round_gst(sum(m["itc_amount"]   for m in matched))
    total_deferred   = round_gst(sum(m["itc_deferred"] for m in matched))
    total_ineligible = round_gst(sum(m["itc_blocked"]  for m in matched))
    total_pending    = round_gst(sum(
        p["purchase"].total_itc for p in unmatched_books
    ))

    # Per-component eligible ITC for GSTR-3B Table 4
    elig_matched  = [m for m in matched if m["itc_available"]]
    eligible_igst = round_gst(sum(m["purchase"].igst for m in elig_matched))
    eligible_cgst = round_gst(sum(m["purchase"].cgst for m in elig_matched))
    eligible_sgst = round_gst(sum(m["purchase"].sgst for m in elig_matched))
    eligible_cess = round_gst(sum(m["purchase"].cess for m in elig_matched))

    return ReconciliationResult(
        matched              = matched,
        unmatched_in_books   = unmatched_books,
        unmatched_in_2b      = unmatched_2b,
        total_itc_eligible   = total_eligible,
        total_itc_pending    = total_pending,
        total_itc_deferred   = total_deferred,
        total_itc_ineligible = total_ineligible,
        eligible_igst        = eligible_igst,
        eligible_cgst        = eligible_cgst,
        eligible_sgst        = eligible_sgst,
        eligible_cess        = eligible_cess,
    )


def _norm_gstin(gstin: str) -> str:
    return gstin.strip().upper()


def _normalize_invoice_no(inv_no: str) -> str:
    """Normalise invoice number — strip all common separators."""
    return (inv_no.strip().upper()
            .replace(' ', '').replace('/', '').replace('-', '')
            .replace('\\', '').replace('.', '').replace('#', ''))


def _dates_within_tolerance(date1: str, date2: str) -> bool:
    try:
        d1 = datetime.strptime(date1, "%Y-%m-%d")
        d2 = datetime.strptime(date2, "%Y-%m-%d")
        return abs((d1 - d2).days) <= DATE_TOLERANCE_DAYS
    except ValueError:
        return False
