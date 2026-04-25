from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from enum import Enum
from typing import Optional

TWO_PLACES = Decimal('0.01')
ZERO = Decimal('0')


class SupplyType(str, Enum):
    B2B = "B2B"                  # Business to registered business
    B2CL = "B2CL"                # Business to large consumer (>2.5L interstate)
    B2CS = "B2CS"                # Business to small consumer
    EXPORT_WPAY = "EXPWP"        # Export with payment of tax
    EXPORT_NOPAY = "EXPNP"       # Export without payment
    SEZ_WPAY = "SEZWP"           # SEZ supply with payment
    SEZ_NOPAY = "SEZNP"          # SEZ supply without payment
    NIL_RATED = "NIL"            # Nil rated supply
    EXEMPT = "EXMT"              # Exempt supply
    NON_GST = "NGSUP"            # Non-GST supply
    CDN_REGISTERED = "CDNR"      # Credit/Debit note to registered party → Table 9B
    CDN_UNREGISTERED = "CDNUR"   # Credit/Debit note to unregistered party → Table 9B


class GSTRate(str, Enum):
    ZERO = "0"
    POINT_1 = "0.1"
    POINT_25 = "0.25"
    THREE = "3"
    FIVE = "5"
    SIX = "6"
    SEVEN_POINT_5 = "7.5"
    TWELVE = "12"
    EIGHTEEN = "18"
    TWENTY_EIGHT = "28"


@dataclass
class VoucherLineItem:
    voucher_id: str               # Tally GUID — for dedup only
    invoice_number: str           # Tally VOUCHERNUMBER e.g. "INV/25-26/001"
    invoice_value: Decimal        # taxable + cgst + sgst + igst + cess
    voucher_date: str
    voucher_type: str
    seller_gstin: str             # which of the company's GSTINs is selling
    seller_state_code: str        # seller_gstin[:2], passed in at import
    party_gstin: Optional[str]
    party_name: str
    item_description: str
    quantity: Decimal
    unit: str
    taxable_value: Decimal
    gst_rate: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    is_interstate: bool
    place_of_supply: str
    reverse_charge: bool
    is_amendment: bool
    hsn_sac: Optional[str] = None             # Optional, Tally often blank
    original_invoice_no: Optional[str] = None
    original_invoice_date: Optional[str] = None
    party_gstin_valid: bool = False            # pre-validated at import time
    is_sez_supply: bool = False               # explicit SEZ flag from Tally ledger
    is_credit_note: bool = False              # True for credit notes (negative invoices)
    cess_rate: Decimal = Decimal('0')         # cess rate %, alongside cess_amount


@dataclass
class ComputedTax:
    taxable_value: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal
    cess: Decimal
    total_tax: Decimal
    total_invoice_value: Decimal


def paise_to_rupees(paise: int) -> Decimal:
    """Convert integer paise from DB to Decimal rupees."""
    return Decimal(paise) / Decimal('100')


def rupees_to_paise(rupees: Decimal) -> int:
    """Convert Decimal rupees to integer paise for DB storage."""
    return int(rupees.quantize(TWO_PLACES, rounding=ROUND_HALF_UP) * 100)


def round_gst(amount: Decimal) -> Decimal:
    """Round to 2 decimal places using ROUND_HALF_UP (GST rule)."""
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
