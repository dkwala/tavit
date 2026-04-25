from decimal import Decimal
from collections import defaultdict
from typing import List
from .types import SupplyType, VoucherLineItem, round_gst, ZERO
from .classifier import classify_supply


def build_gstr1(vouchers: List[VoucherLineItem], seller_gstin: str) -> dict:
    seller_state = seller_gstin[:2]

    b2b_regular   = defaultdict(list)   # Table 4A — B2B non-RCM
    b2b_rcm       = defaultdict(list)   # Table 4B — B2B reverse charge
    sez_wpay      = defaultdict(list)   # Table 4C — SEZ with payment
    b2cl          = defaultdict(list)   # Table 5A — large interstate unregistered
    exports       = []                  # Table 6A — exports with/without payment
    sez_nopay     = []                  # Table 6B — SEZ without payment
    b2cs          = defaultdict(dict)   # Table 7  — small unregistered (aggregated)
    cdn_reg       = defaultdict(list)   # Table 9B — CDN to registered
    cdn_unreg     = []                  # Table 9B — CDN to unregistered

    # Table 8 — nil/exempt/non-GST split by intra/interstate
    nil_exempt = {
        "INTRA": {"nil_rated": ZERO, "exempt": ZERO, "non_gst": ZERO},
        "INTER": {"nil_rated": ZERO, "exempt": ZERO, "non_gst": ZERO},
    }

    hsn_summary = defaultdict(lambda: {
        "description": "", "uom": "",
        "quantity": ZERO, "taxable_value": ZERO,
        "igst": ZERO, "cgst": ZERO, "sgst": ZERO, "cess": ZERO,
    })

    missing_hsn = []   # invoices with no HSN — surfaced as UI warning

    for item in vouchers:
        supply_type = classify_supply(item, seller_state)
        supply_key  = "INTER" if item.is_interstate else "INTRA"

        if supply_type == SupplyType.B2B:
            if item.reverse_charge:
                _add_to_b2b(b2b_rcm, item)       # Table 4B
            else:
                _add_to_b2b(b2b_regular, item)   # Table 4A

        elif supply_type == SupplyType.B2CL:
            _add_to_b2cl(b2cl, item)

        elif supply_type == SupplyType.B2CS:
            _add_to_b2cs(b2cs, item)

        elif supply_type == SupplyType.EXPORT_WPAY:
            _add_to_exports(exports, item, supply_type)

        elif supply_type == SupplyType.EXPORT_NOPAY:
            _add_to_exports(exports, item, supply_type)

        elif supply_type == SupplyType.SEZ_WPAY:
            _add_to_b2b(sez_wpay, item)           # Table 4C — same structure as B2B

        elif supply_type == SupplyType.SEZ_NOPAY:
            _add_to_exports(sez_nopay, item, supply_type)  # Table 6B

        elif supply_type == SupplyType.CDN_REGISTERED:
            _add_to_cdn_registered(cdn_reg, item)

        elif supply_type == SupplyType.CDN_UNREGISTERED:
            _add_to_cdn_unregistered(cdn_unreg, item)

        elif supply_type == SupplyType.NIL_RATED:
            nil_exempt[supply_key]["nil_rated"] += item.taxable_value

        elif supply_type == SupplyType.EXEMPT:
            nil_exempt[supply_key]["exempt"] += item.taxable_value

        elif supply_type == SupplyType.NON_GST:
            nil_exempt[supply_key]["non_gst"] += item.taxable_value

        # HSN summary — skip CDNs (negative values distort totals)
        if supply_type not in (SupplyType.CDN_REGISTERED, SupplyType.CDN_UNREGISTERED):
            _add_to_hsn(hsn_summary, item, missing_hsn)

    return {
        "gstin":      seller_gstin,
        "ret_period": "",            # Caller fills — MMYYYY
        "b2b":        _format_b2b_split(b2b_regular, b2b_rcm),
        "b2cl":       _format_b2cl(b2cl),
        "b2cs":       _format_b2cs(b2cs),
        "exp":        exports,
        "exp_sez":    sez_nopay,
        "b2b_sez":    _format_b2b(sez_wpay),
        "cdnr":       _format_cdn_registered(cdn_reg),
        "cdnur":      cdn_unreg,
        "nil":        _format_nil(nil_exempt),
        "hsn":        _format_hsn(hsn_summary),
        "totals":     _compute_totals(vouchers),
        "warnings":   {"missing_hsn_invoices": missing_hsn},
    }


def _add_to_b2b(b2b: dict, item: VoucherLineItem):
    b2b[item.party_gstin].append({
        "inum": item.invoice_number,
        "idt":  item.voucher_date,
        "val":  str(round_gst(item.invoice_value)),
        "pos":  item.place_of_supply,
        "rchrg": "Y" if item.reverse_charge else "N",
        "itms": [{"num": 1, "itm_det": {
            "txval": str(item.taxable_value),
            "rt":    str(item.gst_rate),
            "iamt":  str(item.igst_amount),
            "camt":  str(item.cgst_amount),
            "samt":  str(item.sgst_amount),
            "csamt": str(item.cess_amount),
        }}]
    })


def _add_to_b2cl(b2cl: dict, item: VoucherLineItem):
    b2cl[item.place_of_supply].append({
        "inum": item.invoice_number,
        "idt":  item.voucher_date,
        "val":  str(round_gst(item.invoice_value)),
        "itms": [{"num": 1, "itm_det": {
            "txval": str(item.taxable_value),
            "rt":    str(item.gst_rate),
            "iamt":  str(item.igst_amount),
            "csamt": str(item.cess_amount),
        }}]
    })


def _add_to_b2cs(b2cs: dict, item: VoucherLineItem):
    key = f"{item.place_of_supply}_{item.gst_rate}"
    if key not in b2cs:
        b2cs[key] = {
            "pos": item.place_of_supply, "rt": str(item.gst_rate),
            "txval": ZERO, "iamt": ZERO, "camt": ZERO,
            "samt": ZERO, "csamt": ZERO,
        }
    b2cs[key]["txval"]  += item.taxable_value
    b2cs[key]["iamt"]   += item.igst_amount
    b2cs[key]["camt"]   += item.cgst_amount
    b2cs[key]["samt"]   += item.sgst_amount
    b2cs[key]["csamt"]  += item.cess_amount


def _add_to_exports(exports: list, item: VoucherLineItem, supply_type: SupplyType):
    exports.append({
        "exp_tp": supply_type.value,
        "inum":   item.invoice_number,
        "idt":    item.voucher_date,
        "val":    str(round_gst(item.invoice_value)),
        "sbnum":  "",    # Shipping bill number — user fills before filing
        "sbdt":   "",    # Shipping bill date DD/MM/YYYY
        "itms": [{
            "txval": str(item.taxable_value),
            "rt":    str(item.gst_rate),
            "iamt":  str(item.igst_amount),
            "csamt": str(item.cess_amount),
        }]
    })


def _add_to_cdn_registered(cdn_reg: dict, item: VoucherLineItem):
    cdn_reg[item.party_gstin].append({
        "inum":  item.invoice_number,
        "idt":   item.voucher_date,
        "val":   str(round_gst(item.invoice_value)),
        "pos":   item.place_of_supply,
        "typ":   "C" if "credit" in item.voucher_type.lower() else "D",
        "itms":  [{"num": 1, "itm_det": {
            "txval": str(item.taxable_value),
            "rt":    str(item.gst_rate),
            "iamt":  str(item.igst_amount),
            "camt":  str(item.cgst_amount),
            "samt":  str(item.sgst_amount),
            "csamt": str(item.cess_amount),
        }}]
    })


def _add_to_cdn_unregistered(cdn_unreg: list, item: VoucherLineItem):
    cdn_unreg.append({
        "inum":  item.invoice_number,
        "idt":   item.voucher_date,
        "val":   str(round_gst(item.invoice_value)),
        "typ":   "C" if "credit" in item.voucher_type.lower() else "D",
        "itms":  [{"num": 1, "itm_det": {
            "txval": str(item.taxable_value),
            "rt":    str(item.gst_rate),
            "iamt":  str(item.igst_amount),
            "csamt": str(item.cess_amount),
        }}]
    })


def _add_to_hsn(hsn_summary: dict, item: VoucherLineItem, missing_hsn: list):
    if not item.hsn_sac:
        missing_hsn.append(item.invoice_number)
        return
    k = item.hsn_sac
    hsn_summary[k]["description"]   = item.item_description[:30]
    hsn_summary[k]["uom"]           = item.unit
    hsn_summary[k]["quantity"]      += item.quantity
    hsn_summary[k]["taxable_value"] += item.taxable_value
    hsn_summary[k]["igst"]          += item.igst_amount
    hsn_summary[k]["cgst"]          += item.cgst_amount
    hsn_summary[k]["sgst"]          += item.sgst_amount
    hsn_summary[k]["cess"]          += item.cess_amount


def _format_b2b(b2b: dict) -> list:
    return [{"ctin": gstin, "inv": invoices} for gstin, invoices in b2b.items()]


def _format_b2b_split(regular: dict, rcm: dict) -> dict:
    return {
        "regular": _format_b2b(regular),   # Table 4A
        "rcm":     _format_b2b(rcm),       # Table 4B
    }


def _format_b2cl(b2cl: dict) -> list:
    return [{"pos": pos, "inv": invoices} for pos, invoices in b2cl.items()]


def _format_b2cs(b2cs: dict) -> list:
    return [{
        "pos":   e["pos"], "rt": e["rt"],
        "txval": str(round_gst(e["txval"])),
        "iamt":  str(round_gst(e["iamt"])),
        "camt":  str(round_gst(e["camt"])),
        "samt":  str(round_gst(e["samt"])),
        "csamt": str(round_gst(e["csamt"])),
    } for e in b2cs.values()]


def _format_nil(nil: dict) -> dict:
    return {"inv": [
        {
            "sply_ty":   "INTRA",
            "nil_amt":   str(round_gst(nil["INTRA"]["nil_rated"])),
            "expt_amt":  str(round_gst(nil["INTRA"]["exempt"])),
            "ngsup_amt": str(round_gst(nil["INTRA"]["non_gst"])),
        },
        {
            "sply_ty":   "INTER",
            "nil_amt":   str(round_gst(nil["INTER"]["nil_rated"])),
            "expt_amt":  str(round_gst(nil["INTER"]["exempt"])),
            "ngsup_amt": str(round_gst(nil["INTER"]["non_gst"])),
        },
    ]}


def _format_cdn_registered(cdn_reg: dict) -> list:
    return [{"ctin": gstin, "nt": notes} for gstin, notes in cdn_reg.items()]


def _format_hsn(hsn_summary: dict) -> dict:
    return {"details": [{
        "hsn_sc": code,
        "desc":   v["description"],
        "uqc":    v["uom"],
        "qty":    str(round_gst(v["quantity"])),
        "txval":  str(round_gst(v["taxable_value"])),
        "iamt":   str(round_gst(v["igst"])),
        "camt":   str(round_gst(v["cgst"])),
        "samt":   str(round_gst(v["sgst"])),
        "csamt":  str(round_gst(v["cess"])),
    } for code, v in hsn_summary.items()]}


def _compute_totals(vouchers: List[VoucherLineItem]) -> dict:
    t_tax  = sum(v.taxable_value for v in vouchers)
    t_igst = sum(v.igst_amount   for v in vouchers)
    t_cgst = sum(v.cgst_amount   for v in vouchers)
    t_sgst = sum(v.sgst_amount   for v in vouchers)
    t_cess = sum(v.cess_amount   for v in vouchers)
    return {
        "total_taxable": str(round_gst(t_tax)),
        "total_igst":    str(round_gst(t_igst)),
        "total_cgst":    str(round_gst(t_cgst)),
        "total_sgst":    str(round_gst(t_sgst)),
        "total_cess":    str(round_gst(t_cess)),
        "total_tax":     str(round_gst(t_igst + t_cgst + t_sgst + t_cess)),
    }
