from decimal import Decimal, ROUND_HALF_UP
from .types import ComputedTax, VoucherLineItem, TWO_PLACES, round_gst


def compute_tax_from_inclusive(
    inclusive_value: Decimal,
    gst_rate: Decimal,
    is_interstate: bool,
    cess_rate: Decimal = Decimal('0'),
) -> ComputedTax:
    """
    Compute tax when invoice value is GST-inclusive.
    Formula: taxable = inclusive / (1 + rate/100)

    NOTE: Tally exports are almost always exclusive (taxable value given separately).
    Use compute_tax_from_exclusive() for all Tally import pipeline calls.
    This function is for manual invoice entry and API use cases only.
    """
    rate_decimal = gst_rate / Decimal('100')
    taxable = inclusive_value / (Decimal('1') + rate_decimal)
    taxable = round_gst(taxable)
    return split_tax_components(taxable, gst_rate, is_interstate, cess_rate)


def compute_tax_from_exclusive(
    taxable_value: Decimal,
    gst_rate: Decimal,
    is_interstate: bool,
    cess_rate: Decimal = Decimal('0'),
) -> ComputedTax:
    """
    Compute tax when invoice value is GST-exclusive (taxable value given).
    Standard case for all Tally XML imports.
    """
    # Guard — nil-rated and exempt supplies carry zero tax
    # They should not reach the calculator but this handles it safely
    if gst_rate == Decimal('0') and cess_rate == Decimal('0'):
        return ComputedTax(
            taxable_value=taxable_value,
            cgst=Decimal('0'),
            sgst=Decimal('0'),
            igst=Decimal('0'),
            cess=Decimal('0'),
            total_tax=Decimal('0'),
            total_invoice_value=taxable_value,
        )
    return split_tax_components(taxable_value, gst_rate, is_interstate, cess_rate)


def split_tax_components(
    taxable: Decimal,
    gst_rate: Decimal,
    is_interstate: bool,
    cess_rate: Decimal = Decimal('0'),
) -> ComputedTax:
    """
    Split GST into CGST+SGST (intrastate) or IGST (interstate).
    Renamed from _split_tax so test suite can import directly.
    No float. All arithmetic in Decimal.
    """
    total_tax = round_gst(taxable * gst_rate / Decimal('100'))
    cess = round_gst(taxable * cess_rate / Decimal('100'))

    if is_interstate:
        igst = total_tax
        cgst = Decimal('0')
        sgst = Decimal('0')
    else:
        half_rate = gst_rate / Decimal('2')
        cgst = round_gst(taxable * half_rate / Decimal('100'))
        sgst = round_gst(taxable * half_rate / Decimal('100'))
        igst = Decimal('0')
        # Reconcile 1-paise rounding surplus — CGST absorbs it (ICAI convention)
        actual_total = cgst + sgst
        if actual_total != total_tax:
            cgst += (total_tax - actual_total)

    # Invoice value = taxable + GST + cess
    total_invoice_value = taxable + total_tax + cess

    return ComputedTax(
        taxable_value=taxable,
        cgst=cgst,
        sgst=sgst,
        igst=igst,
        cess=cess,
        total_tax=total_tax,
        total_invoice_value=total_invoice_value,
    )


def verify_voucher_tax(item: VoucherLineItem) -> dict:
    """
    Verify that tax amounts in a Tally voucher are correct.
    Compares Tally's figures against engine-computed figures.
    Returns per-component discrepancy for CA review spreadsheet.
    """
    cess_rate = getattr(item, 'cess_rate', Decimal('0'))

    expected = compute_tax_from_exclusive(
        item.taxable_value,
        item.gst_rate,
        item.is_interstate,
        cess_rate,
    )

    total_claimed = (
        item.cgst_amount
        + item.sgst_amount
        + item.igst_amount
        + item.cess_amount
    )
    total_expected = expected.total_tax + expected.cess

    discrepancy = abs(total_claimed - total_expected)
    tolerance = Decimal('1.00')  # Re 1 — covers legitimate Tally rounding variants

    return {
        "valid": discrepancy <= tolerance,
        "discrepancy": discrepancy,
        "claimed": total_claimed,
        "expected": total_expected,
        "message": "OK" if discrepancy <= tolerance else f"Tax discrepancy: Rs{discrepancy}",
        # Per-component breakdown — used in CA review spreadsheet
        "cgst_discrepancy": abs(item.cgst_amount - expected.cgst),
        "sgst_discrepancy": abs(item.sgst_amount - expected.sgst),
        "igst_discrepancy": abs(item.igst_amount - expected.igst),
        "cess_discrepancy": abs(item.cess_amount - expected.cess),
    }
