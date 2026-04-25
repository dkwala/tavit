from decimal import Decimal
from .types import SupplyType, VoucherLineItem

B2CL_THRESHOLD = Decimal('250000')
# Applies to INVOICE VALUE (taxable + igst), not taxable value alone — Rule 59 CGST


def classify_supply(item: VoucherLineItem, seller_state_code: str) -> SupplyType:
    """
    Classify a voucher line item into correct GSTR-1 supply type.
    RED ZONE — do not modify without CA review.

    Priority order (per CGST Act):
    0. Credit note / Debit note  → Table 9B
    1. Non-GST supply            → Table 8 (outside GST Act)
    2. Exempt supply             → Table 8 (inside Act, no tax)
    3. Nil rated supply          → Table 8 (0% rate, in taxable turnover)
    4. Export                    → Table 6A (POS=96 only)
    5. SEZ supply                → Table 6B (explicit flag only)
    6. B2B registered buyer      → Table 4A / 4B (builder splits on RCM)
    7. B2CL large interstate     → Table 5A (invoice value > 2.5L)
    8. B2CS all others           → Table 7 (aggregated)
    """

    place_of_supply = item.place_of_supply

    # Priority 0: Credit note / Debit note → Table 9B
    if item.voucher_type.lower() in ('credit note', 'debit note') or item.is_credit_note:
        if item.party_gstin and item.party_gstin_valid:
            return SupplyType.CDN_REGISTERED
        return SupplyType.CDN_UNREGISTERED

    # Priority 1: Non-GST — outside GST Act entirely
    if _is_non_gst(item):
        return SupplyType.NON_GST

    # Priority 2: Exempt — inside GST Act but no tax liability
    if _is_exempt(item):
        return SupplyType.EXEMPT

    # Priority 3: Nil rated — taxable supply at 0%
    # Only reaches here if not exempt and not non-GST
    if item.gst_rate == Decimal('0'):
        return SupplyType.NIL_RATED

    # Priority 4: Exports — ONLY POS 96 (Other Countries)
    # POS 97 = Other Territory (domestic) — falls through to B2CS
    if place_of_supply == '96':
        if item.igst_amount > Decimal('0'):
            return SupplyType.EXPORT_WPAY
        return SupplyType.EXPORT_NOPAY

    # Priority 5: SEZ supply — explicit flag ONLY
    # Cannot detect SEZ from GSTIN structure — must be flagged at import
    if item.is_sez_supply:
        if item.igst_amount > Decimal('0'):
            return SupplyType.SEZ_WPAY
        return SupplyType.SEZ_NOPAY

    # Priority 6: Registered buyer (valid GSTIN) → B2B
    # RCM split (Table 4A vs 4B) done by GSTR-1 builder, not here
    if item.party_gstin and item.party_gstin_valid:
        return SupplyType.B2B

    # Priority 7: Unregistered interstate > ₹2.5L → B2CL
    is_interstate = (place_of_supply != seller_state_code)
    invoice_value = item.taxable_value + item.igst_amount
    if is_interstate and invoice_value > B2CL_THRESHOLD:
        return SupplyType.B2CL

    # Default: B2CS
    return SupplyType.B2CS


def _is_non_gst(item: VoucherLineItem) -> bool:
    """
    Supplies outside GST Act — petroleum, alcohol, electricity.
    MVP: string matching on description.
    Beta: replace with HSN code lookup against non-GST HSN master list.
    """
    non_gst_markers = [
        'non-gst', 'nongst', 'non gst',
        'petrol', 'diesel', 'hsd', 'high speed diesel',
        'motor spirit', 'aviation turbine', 'atf',
        'natural gas', 'petroleum crude',
        'alcohol', 'liquor', 'beer', 'wine', 'spirits',
        'electricity',
    ]
    desc = item.item_description.lower()
    return any(m in desc for m in non_gst_markers)


def _is_exempt(item: VoucherLineItem) -> bool:
    """
    Exempt supplies under Schedule III of CGST Act.
    MVP: string matching on description.
    Beta: replace with HSN code lookup against exempt HSN master list.
    """
    exempt_markers = [
        'exempt', 'exempted', 'exmt',
        'health service', 'medical service', 'hospital',
        'educational', 'school fee', 'college fee',
        'agriculture', 'agricultural produce',
        'unprocessed food', 'fresh vegetable', 'fresh fruit',
    ]
    desc = item.item_description.lower()
    return any(m in desc for m in exempt_markers)
