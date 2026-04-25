# CA-VERIFIED FIELD MAP
# Reviewer: [CA name] | Session: [fill after Session 1]
# Do not modify without CA sign-off and incrementing SESSION_ID.

SESSION_ID = 1

VOUCHER_TYPE_MAP = {
    "Sales":          "sales_invoice",
    "Purchase":       "purchase_invoice",
    "Credit Note":    "credit_note",
    "Debit Note":     "debit_note",
    "Sales Order":    "sales_order",
    "Purchase Order": "purchase_order",
    "Journal":        "journal",
    "Payment":        "payment",
    "Receipt":        "receipt",
}

CREDIT_NOTE_TYPES = {"Credit Note", "Debit Note"}

# Per-voucher-type sign rules — CA REVIEWED
# (negate_inventory_amount, negate_tax_ledger_amount)
# Credit notes MUST stay negative — they reduce taxable value in GSTR-1
AMOUNT_SIGN_RULES = {
    "sales_invoice":    (True,  True),
    "purchase_invoice": (False, True),
    "credit_note":      (False, False),
    "debit_note":       (True,  True),
    "sales_order":      (True,  True),
    "purchase_order":   (False, True),
}

CGST_PATTERNS  = [
    "cgst", "central gst", "central tax",
    "output cgst", "input cgst", "cgst @",
]
SGST_PATTERNS  = [
    "sgst", "state gst", "state tax",
    "utgst", "ut gst", "utsgst", "sgst/utgst",
    "output sgst", "input sgst", "sgst @",
]
IGST_PATTERNS  = [
    "igst", "integrated gst", "integrated tax",
    "output igst", "input igst", "igst @",
]
CESS_PATTERNS  = [
    "cess", "gst cess", "compensation cess",
    "gst compensation cess", "cess @",
]

TALLY_DATE_FORMAT = "%Y%m%d"
ISO_DATE_FORMAT   = "%Y-%m-%d"