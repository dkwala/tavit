from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import List, Optional
import xml.etree.ElementTree as ET
from datetime import datetime

from .types import VoucherLineItem, rupees_to_paise, ZERO
from .gstin_validator import (validate_gstin,
    TALLY_UNREGISTERED_PLACEHOLDERS, get_state_from_gstin)
from .calculator import verify_voucher_tax
from .tally_field_map import (
    VOUCHER_TYPE_MAP, CREDIT_NOTE_TYPES, AMOUNT_SIGN_RULES,
    CGST_PATTERNS, SGST_PATTERNS, IGST_PATTERNS, CESS_PATTERNS,
    TALLY_DATE_FORMAT, ISO_DATE_FORMAT,
)


@dataclass
class ImportWarning:
    tally_guid:     str
    invoice_number: str
    code:   str    # MISSING_HSN | GSTIN_INVALID | TAX_MISMATCH
                   # | POS_INFERRED | SKIP_TYPE
    detail: str


@dataclass
class ImportPreview:
    company_name:        str
    period_from:         Optional[str]
    period_to:           Optional[str]
    voucher_count:       int
    total_taxable_paise: int
    warnings:            List[ImportWarning]
    items:               List[VoucherLineItem]
    skipped_guids:       List[str]


def parse_tally_xml(xml_str: str,
                    seller_gstin: str) -> ImportPreview:
    root       = ET.fromstring(xml_str.strip())
    seller_state = seller_gstin[:2]

    ledger_gstin_index = _build_ledger_gstin_index(root)
    hsn_index          = _build_hsn_index(root)

    company_name = (root.findtext('.//COMPANY/NAME')
                    or root.findtext('.//COMPANYNAME', ''))
    vouchers     = root.findall('.//VOUCHER')

    items, warnings, skipped = [], [], []
    dates = []

    for v in vouchers:
        raw_type = v.findtext('VOUCHERTYPENAME', '').strip()
        mapped   = VOUCHER_TYPE_MAP.get(raw_type)
        guid     = v.findtext('GUID', '').strip()

        if not mapped or mapped in ('journal','payment','receipt',
                                    'sales_order','purchase_order'):
            skipped.append(guid)
            continue

        raw_date  = v.findtext('DATE', '').strip()
        try:
            inv_date = datetime.strptime(
                raw_date, TALLY_DATE_FORMAT
            ).strftime(ISO_DATE_FORMAT)
        except ValueError:
            inv_date = raw_date
        dates.append(inv_date)

        inv_no     = v.findtext('VOUCHERNUMBER', '').strip()
        party_name = v.findtext('PARTYLEDGERNAME', '').strip()

        party_gstin = _extract_party_gstin(
            v, party_name, ledger_gstin_index)
        gstin_valid = False
        if party_gstin:
            result = validate_gstin(party_gstin)
            if result['valid']:
                gstin_valid = True
            else:
                if not result.get('is_unregistered'):
                    warnings.append(ImportWarning(
                        guid, inv_no, 'GSTIN_INVALID',
                        f"Invalid GSTIN '{party_gstin}': {result['error']}"))
                party_gstin = None

        pos = _derive_pos(v, party_gstin, seller_state,
                          warnings, inv_no, guid)
        is_interstate = (pos != seller_state)
        is_credit_note = raw_type in CREDIT_NOTE_TYPES

        negate_inv, negate_tax = AMOUNT_SIGN_RULES.get(
            mapped, (False, False))

        line_items = _extract_line_items(
            v, mapped, negate_inv, negate_tax,
            seller_gstin, party_gstin, gstin_valid,
            party_name, inv_no, inv_date, pos,
            is_interstate, is_credit_note,
            hsn_index, warnings, guid)

        items.extend(line_items)

    for item in items:
        chk = verify_voucher_tax(item)
        if not chk['valid']:
            warnings.append(ImportWarning(
                item.voucher_id, item.invoice_number,
                'TAX_MISMATCH', chk['message']))

    total_paise = sum(rupees_to_paise(i.taxable_value) for i in items)
    sorted_dates = sorted(d for d in dates if d)

    return ImportPreview(
        company_name        = company_name,
        period_from         = sorted_dates[0]  if sorted_dates else None,
        period_to           = sorted_dates[-1] if sorted_dates else None,
        voucher_count       = len(items),
        total_taxable_paise = total_paise,
        warnings            = warnings,
        items               = items,
        skipped_guids       = skipped,
    )


def _build_ledger_gstin_index(root) -> dict:
    idx = {}
    for ledger in root.findall('.//LEDGER'):
        name  = ledger.get('NAME', '').strip().upper()
        gstin = (ledger.findtext('GSTN')
                 or ledger.findtext('.//GSTREGISTRATIONDETAILS.LIST/GSTIN')
                 or '').strip().upper()
        if name and gstin and gstin not in TALLY_UNREGISTERED_PLACEHOLDERS:
            idx[name] = gstin
    return idx


def _build_hsn_index(root) -> dict:
    idx = {}
    for item in root.findall('.//STOCKITEM'):
        name = item.get('NAME', '').strip().upper()
        hsn  = (item.findtext('HSNCODE')
                or item.findtext('.//HSNDETAILS.LIST/HSNCODE')
                or '').strip()
        if name and hsn:
            idx[name] = hsn
    return idx


def _extract_party_gstin(voucher_elem, party_name: str,
                          ledger_index: dict) -> Optional[str]:
    for path in [
        './/LEDGERENTRIES.LIST/GSTREGISTRATIONDETAILS.LIST/GSTIN',
        './/LEDGERENTRIES.LIST/GSTREGISTRATIONNO',
        'PARTYGSTIN',
    ]:
        val = voucher_elem.findtext(path, '').strip().upper()
        if val and val not in TALLY_UNREGISTERED_PLACEHOLDERS:
            return val
    return ledger_index.get(party_name.upper())


def _derive_pos(voucher_elem, party_gstin: Optional[str],
                seller_state: str, warnings: list,
                inv_no: str, guid: str) -> str:
    pos = voucher_elem.findtext('PLACEOFSUPPLY', '').strip()
    if pos and pos.isdigit() and len(pos) == 2:
        return pos
    if party_gstin and len(party_gstin) >= 2:
        sc = party_gstin[:2]
        if sc.isdigit():
            return sc
    warnings.append(ImportWarning(guid, inv_no, 'POS_INFERRED',
        f"Place of supply not found — defaulted to {seller_state}. Verify."))
    return seller_state


def _parse_quantity(bq_str: Optional[str]):
    if not bq_str or not bq_str.strip():
        return Decimal('1'), 'NOS'
    parts = bq_str.strip().split(' ', 1)
    try:
        qty  = Decimal(parts[0].replace(',', ''))
        unit = parts[1].strip().upper() if len(parts) > 1 else 'NOS'
        return qty, unit
    except (InvalidOperation, IndexError):
        return Decimal('1'), 'NOS'


def _parse_rate(rate_str: Optional[str]) -> Decimal:
    if not rate_str or not rate_str.strip():
        return ZERO
    try:
        return Decimal(
            rate_str.split('/')[0].replace(',', '').strip())
    except InvalidOperation:
        return ZERO


def _extract_line_items(
    v, mapped, negate_inv, negate_tax,
    seller_gstin, party_gstin, gstin_valid,
    party_name, inv_no, inv_date, pos,
    is_interstate, is_credit_note,
    hsn_index, warnings, guid
) -> list:
    lines = []
    seller_state = seller_gstin[:2]

    # Extract tax amounts from LEDGERENTRIES
    cgst = sgst = igst = cess = ZERO
    for entry in v.findall('.//LEDGERENTRIES.LIST'):
        ln   = (entry.findtext('LEDGERNAME') or '').lower()
        raw  = entry.findtext('AMOUNT', '0').replace(',','')
        try:
            amt = Decimal(raw)
        except InvalidOperation:
            continue
        if negate_tax:
            amt = abs(amt)
        if any(p in ln for p in CGST_PATTERNS):
            cgst += amt
        elif any(p in ln for p in SGST_PATTERNS):
            sgst += amt
        elif any(p in ln for p in IGST_PATTERNS):
            igst += amt
        elif any(p in ln for p in CESS_PATTERNS):
            cess += amt

    for entry in v.findall('.//ALLINVENTORYENTRIES.LIST'):
        raw_tax = entry.findtext('TAXABLEAMOUNT') or entry.findtext('AMOUNT','0')
        try:
            txval = Decimal(raw_tax.replace(',',''))
            if negate_inv:
                txval = abs(txval)
        except InvalidOperation:
            txval = ZERO

        qty, unit = _parse_quantity(entry.findtext('BILLEDQTY'))
        hsn_name  = (entry.findtext('STOCKITEMNAME') or '').strip().upper()
        hsn       = (entry.findtext('HSNCODE') or '').strip()
        if not hsn:
            hsn = hsn_index.get(hsn_name)
        if not hsn:
            warnings.append(ImportWarning(guid, inv_no, 'MISSING_HSN',
                f"No HSN for '{hsn_name}' — enter manually before filing"))

        raw_rate = entry.findtext('RATE', '')
        gst_rate_str = entry.findtext('GSTRATE', '0').replace('%','').strip()
        try:
            gst_rate = Decimal(gst_rate_str)
        except InvalidOperation:
            gst_rate = ZERO

        lines.append(VoucherLineItem(
            voucher_id         = guid,
            invoice_number     = inv_no,
            invoice_value      = txval + cgst + sgst + igst + cess,
            voucher_date       = inv_date,
            voucher_type       = mapped,
            seller_gstin       = seller_gstin,
            seller_state_code  = seller_state,
            party_gstin        = party_gstin,
            party_name         = party_name,
            party_gstin_valid  = gstin_valid,
            hsn_sac            = hsn or None,
            item_description   = (entry.findtext('STOCKITEMNAME') or '').strip(),
            quantity           = qty,
            unit               = unit,
            taxable_value      = txval,
            gst_rate           = gst_rate,
            cgst_amount        = cgst,
            sgst_amount        = sgst,
            igst_amount        = igst,
            cess_amount        = cess,
            cess_rate          = ZERO,
            is_interstate      = is_interstate,
            place_of_supply    = pos,
            reverse_charge     = False,
            is_amendment       = False,
            is_credit_note     = is_credit_note,
            is_sez_supply      = False,
            original_invoice_no   = None,
            original_invoice_date = None,
        ))
    return lines