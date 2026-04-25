"""
CLI wrapper for gstr1_builder.py — called by NestJS via child_process.
Usage: python3 /abs/path/gstr1_cli.py <seller_gstin> <period_MMYYYY> <json_path>
Prints GSTR-1 JSON to stdout.
"""
import sys
import os
import json
from decimal import Decimal

# Invoked with absolute path, so relative imports fail.
# Insert apps/compliance/ into sys.path so `from src.xxx` resolves.
_src_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_root = os.path.dirname(_src_dir)
if _pkg_root not in sys.path:
    sys.path.insert(0, _pkg_root)

from src.gstr1_builder import build_gstr1
from src.types import VoucherLineItem, paise_to_rupees


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} not serialisable")


def _derive_fields(d: dict, seller_state: str) -> dict:
    """Derives is_interstate, place_of_supply, gst_rate before VoucherLineItem construction.

    Must be called before slicing party_gstin — guards the None[:2] AttributeError
    that would crash on every B2CS (retail/unregistered) sale.
    """
    party_gstin = d.get('party_gstin') or None  # normalise empty string to None
    is_interstate = (party_gstin[:2] != seller_state) if party_gstin else False
    place_of_supply = party_gstin[:2] if party_gstin else seller_state
    gst_rate = (Decimal(str(d['cgst_rate_bp'])) + Decimal(str(d['sgst_rate_bp']))) / 100
    if gst_rate == 0:
        gst_rate = Decimal(str(d['igst_rate_bp'])) / 100
    return {
        **d,
        'is_interstate': is_interstate,
        'place_of_supply': place_of_supply,
        'gst_rate': gst_rate,
    }


_PAISE_FIELDS = (
    'invoice_value_paise', 'line_amount_paise',
    'cgst_amount_paise', 'sgst_amount_paise', 'igst_amount_paise', 'cess_amount_paise',
)


def _assert_paise_integers(d: dict) -> None:
    """Guard against values already divided by 100 (double-conversion from paise to rupees)."""
    for field in _PAISE_FIELDS:
        v = d.get(field, 0) or 0
        if float(v) != int(float(v)):
            raise ValueError(
                f"{field}={v!r} is not a whole number — "
                "value appears to be in rupees, not paise (double-conversion?)"
            )


def _dict_to_line_item(d: dict) -> VoucherLineItem:
    _assert_paise_integers(d)
    return VoucherLineItem(
        voucher_id=d['voucher_id'],
        invoice_number=d['invoice_number'],
        invoice_value=paise_to_rupees(d['invoice_value_paise']),
        voucher_date=d['voucher_date'],
        voucher_type=d['voucher_type'],
        seller_gstin=d['seller_gstin'],
        seller_state_code=d['seller_state_code'],
        party_gstin=d.get('party_gstin') or None,
        party_name=d['party_name'],
        item_description=d.get('item_description') or '',
        quantity=Decimal(str(d.get('quantity', 1))),
        unit=d.get('unit') or 'NOS',
        taxable_value=paise_to_rupees(d['line_amount_paise']),
        gst_rate=d['gst_rate'],
        cgst_amount=paise_to_rupees(d['cgst_amount_paise']),
        sgst_amount=paise_to_rupees(d['sgst_amount_paise']),
        igst_amount=paise_to_rupees(d['igst_amount_paise']),
        cess_amount=paise_to_rupees(d.get('cess_amount_paise', 0)),
        is_interstate=d['is_interstate'],
        place_of_supply=d['place_of_supply'],
        reverse_charge=False,
        is_amendment=False,
        hsn_sac=d.get('hsn_sac') or None,
        is_credit_note=d.get('voucher_type') == 'credit_note',
        party_gstin_valid=bool(d.get('party_gstin') and len(d['party_gstin']) == 15),
    )


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: gstr1_cli.py <seller_gstin> <period_MMYYYY> <json_path>'}))
        sys.exit(1)

    seller_gstin = ''.join(c for c in sys.argv[1].strip().upper() if c.isalnum())
    if len(seller_gstin) != 15:
        print(json.dumps({'error': 'Invalid seller GSTIN length'}))
        sys.exit(1)

    period    = sys.argv[2].strip()
    json_path = sys.argv[3]
    seller_state = seller_gstin[:2]

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            raw_items = json.load(f)

        line_items = [
            _dict_to_line_item(_derive_fields(d, seller_state))
            for d in raw_items
        ]
        result = build_gstr1(line_items, seller_gstin)
        result['ret_period'] = period
        print(json.dumps(result, default=_decimal_default))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
