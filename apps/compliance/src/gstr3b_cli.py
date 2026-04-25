"""
CLI wrapper for gstr3b_drafter.py — called by NestJS via child_process.
Usage: python3 /abs/path/gstr3b_cli.py <seller_gstin> <period_MMYYYY> <json_path>
JSON input: { "sales": [...], "purchases": [...] }
Prints GSTR-3B JSON to stdout.
"""
import sys
import os
import json
from decimal import Decimal

_src_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_root = os.path.dirname(_src_dir)
if _pkg_root not in sys.path:
    sys.path.insert(0, _pkg_root)

from src.gstr3b_drafter import (
    GSTR3BDrafter, ReconciliationResult, Table31Data, Table31Row,
    Table51Data, TaxComponent,
)


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} not serialisable")


def _paise_to_dec(paise) -> Decimal:
    return Decimal(str(int(paise))) / 100


def _aggregate_sales(sales: list) -> Table31Data:
    """Bucket sales vouchers into Table 3.1 rows.

    is_nil=True  → 3.1(c) nil/exempt (zero-tax sales)
    otherwise    → 3.1(a) outward taxable
    """
    t31 = Table31Data()

    for s in sales:
        taxable = _paise_to_dec(s.get('taxable_value_paise', 0))
        cgst    = _paise_to_dec(s.get('cgst_paise', 0))
        sgst    = _paise_to_dec(s.get('sgst_paise', 0))
        igst    = _paise_to_dec(s.get('igst_paise', 0))
        cess    = _paise_to_dec(s.get('cess_paise', 0))
        is_nil  = s.get('is_nil', False)

        if is_nil:
            t31.outward_nil_exempt.taxable_value += taxable
        else:
            t31.outward_taxable_supplies.taxable_value += taxable
            t31.outward_taxable_supplies.tax.igst += igst
            t31.outward_taxable_supplies.tax.cgst += cgst
            t31.outward_taxable_supplies.tax.sgst += sgst
            t31.outward_taxable_supplies.tax.cess += cess

    return t31


def _aggregate_itc(purchases: list) -> ReconciliationResult:
    """Sum eligible ITC from purchase invoices for Table 4."""
    igst = Decimal("0.00")
    cgst = Decimal("0.00")
    sgst = Decimal("0.00")
    cess = Decimal("0.00")

    for p in purchases:
        igst += _paise_to_dec(p.get('igst_paise', 0))
        cgst += _paise_to_dec(p.get('cgst_paise', 0))
        sgst += _paise_to_dec(p.get('sgst_paise', 0))
        cess += _paise_to_dec(p.get('cess_paise', 0))

    return ReconciliationResult(
        eligible_igst=igst,
        eligible_cgst=cgst,
        eligible_sgst=sgst,
        eligible_cess=cess,
    )


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: gstr3b_cli.py <seller_gstin> <period_MMYYYY> <json_path>'}))
        sys.exit(1)

    seller_gstin = ''.join(c for c in sys.argv[1].strip().upper() if c.isalnum())
    if len(seller_gstin) != 15:
        print(json.dumps({'error': 'Invalid seller GSTIN length'}))
        sys.exit(1)

    period    = sys.argv[2].strip()
    json_path = sys.argv[3]

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)

        table_31 = _aggregate_sales(payload.get('sales', []))
        recon    = _aggregate_itc(payload.get('purchases', []))

        drafter = GSTR3BDrafter(gstin=seller_gstin, return_period=period)
        drafter.set_liability(table_31)
        drafter.load_reconciliation_data(recon)
        drafter.calculate()

        result = drafter.get_form().to_dict()
        result['ret_period'] = period
        print(json.dumps(result, default=_decimal_default))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
