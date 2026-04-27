"""
Challan Generator - ITNS 281
TDS/TCS Payment Challan for FY 2025-26
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
import json
import uuid


@dataclass
class ChallanEntry:
    """Individual TDS entry for challan"""
    section: str
    nature_of_payment: str
    amount_paid: float
    tds_amount: float
    surcharge: float
    cess: float
    total: float


@dataclass
class Challan281:
    """
    ITNS 281 Challan for TDS Payment
    """
    challan_id: str
    deductor_name: str
    deductor_pan: str
    deductor_tan: str
    assessment_year: str
    fy_year: str
    minor_head: str  # '200' for TDS payable by taxpayer, '400' for TDS regular assessment
    nature_of_payment: str  # '92B' for Company Deductee, '92C' for Non-Company
    entries: List[ChallanEntry]
    total_tax: float
    total_surcharge: float
    total_cess: float
    total_interest: float  # u/s 220(2) or 234A/B/C
    total_penalty: float
    total_fee: float  # u/s 234E - late filing fee
    total_amount: float
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    payment_date: Optional[datetime] = None
    bsr_code: Optional[str] = None
    challan_serial: Optional[str] = None

    def __post_init__(self):
        if not self.challan_id:
            self.challan_id = str(uuid.uuid4())[:12].upper()

    def to_dict(self) -> dict:
        return {
            "challan_id": self.challan_id,
            "deductor_name": self.deductor_name,
            "deductor_pan": self.deductor_pan,
            "deductor_tan": self.deductor_tan,
            "assessment_year": self.assessment_year,
            "fy_year": self.fy_year,
            "minor_head": self.minor_head,
            "minor_head_desc": "TDS/TCS Payable by Taxpayer" if self.minor_head == "200" else "TDS/TCS Regular Assessment",
            "nature_of_payment": self.nature_of_payment,
            "nature_desc": "Company Deductee" if self.nature_of_payment == "92B" else "Non-Company Deductee",
            "entries": [
                {
                    "section": e.section,
                    "nature_of_payment": e.nature_of_payment,
                    "amount_paid": round(e.amount_paid, 2),
                    "tds_amount": round(e.tds_amount, 2),
                    "surcharge": round(e.surcharge, 2),
                    "cess": round(e.cess, 2),
                    "total": round(e.total, 2),
                }
                for e in self.entries
            ],
            "totals": {
                "total_tax": round(self.total_tax, 2),
                "total_surcharge": round(self.total_surcharge, 2),
                "total_cess": round(self.total_cess, 2),
                "total_interest": round(self.total_interest, 2),
                "total_penalty": round(self.total_penalty, 2),
                "total_fee": round(self.total_fee, 2),
                "total_amount": round(self.total_amount, 2),
            },
            "bank_details": {
                "bank_name": self.bank_name,
                "bank_branch": self.bank_branch,
                "bsr_code": self.bsr_code,
                "challan_serial": self.challan_serial,
                "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            }
        }

    def generate_text_format(self) -> str:
        """Generate a text representation of the challan"""
        lines = []
        lines.append("=" * 70)
        lines.append("                    CHALLAN NO./ITNS 281")
        lines.append("              Tax Deducted at Source (TDS) Payment")
        lines.append("=" * 70)
        lines.append(f"Challan ID: {self.challan_id}")
        lines.append(f"Assessment Year: {self.assessment_year}")
        lines.append(f"Financial Year: {self.fy_year}")
        lines.append("-" * 70)
        lines.append("DEDUCTOR DETAILS:")
        lines.append(f"  Name: {self.deductor_name}")
        lines.append(f"  PAN: {self.deductor_pan}")
        lines.append(f"  TAN: {self.deductor_tan}")
        lines.append("-" * 70)
        lines.append(f"Minor Head: {self.minor_head} - {'TDS Payable by Taxpayer' if self.minor_head == '200' else 'TDS Regular Assessment'}")
        lines.append(f"Nature of Payment: {self.nature_of_payment} - {'Company Deductee' if self.nature_of_payment == '92B' else 'Non-Company Deductee'}")
        lines.append("-" * 70)
        lines.append(f"{'Section':<10} {'Nature':<25} {'Amount Paid':>12} {'TDS':>10} {'SC':>8} {'Cess':>8} {'Total':>10}")
        lines.append("-" * 70)

        for entry in self.entries:
            lines.append(
                f"{entry.section:<10} {entry.nature_of_payment[:25]:<25} "
                f"{entry.amount_paid:>12,.2f} {entry.tds_amount:>10,.2f} "
                f"{entry.surcharge:>8,.2f} {entry.cess:>8,.2f} {entry.total:>10,.2f}"
            )

        lines.append("-" * 70)
        lines.append(f"{'TOTAL TAX':<50} {self.total_tax:>18,.2f}")
        lines.append(f"{'TOTAL SURCHARGE':<50} {self.total_surcharge:>18,.2f}")
        lines.append(f"{'TOTAL CESS (4% HEC)':<50} {self.total_cess:>18,.2f}")
        lines.append(f"{'TOTAL INTEREST':<50} {self.total_interest:>18,.2f}")
        lines.append(f"{'TOTAL PENALTY':<50} {self.total_penalty:>18,.2f}")
        lines.append(f"{'TOTAL FEE (u/s 234E)':<50} {self.total_fee:>18,.2f}")
        lines.append("=" * 70)
        lines.append(f"{'GRAND TOTAL':<50} {self.total_amount:>18,.2f}")
        lines.append("=" * 70)

        if self.payment_date:
            lines.append(f"Payment Date: {self.payment_date.strftime('%d-%m-%Y')}")
        if self.bsr_code:
            lines.append(f"BSR Code: {self.bsr_code}")
        if self.challan_serial:
            lines.append(f"Challan Serial: {self.challan_serial}")

        lines.append("=" * 70)
        lines.append("Note: This is a system-generated challan. Verify before payment.")
        lines.append("       Pay at authorized bank or via e-Payment on TIN-NSDL.")
        lines.append("=" * 70)

        return "\n".join(lines)


class ChallanGenerator:
    """Generator for TDS Challans"""

    @staticmethod
    def create_challan(
        deductor_name: str,
        deductor_pan: str,
        deductor_tan: str,
        assessment_year: str,
        fy_year: str,
        entries: List[Dict],
        minor_head: str = "200",
        nature_of_payment: str = "92C",
        interest: float = 0.0,
        penalty: float = 0.0,
        fee: float = 0.0
    ) -> Challan281:
        """
        Create a new ITNS 281 Challan

        Args:
            entries: List of dicts with keys: section, nature_of_payment, 
                     amount_paid, tds_amount, surcharge, cess
        """
        challan_entries = []
        total_tax = 0.0
        total_surcharge = 0.0
        total_cess = 0.0

        for entry in entries:
            ce = ChallanEntry(
                section=entry["section"],
                nature_of_payment=entry["nature_of_payment"],
                amount_paid=entry["amount_paid"],
                tds_amount=entry["tds_amount"],
                surcharge=entry.get("surcharge", 0.0),
                cess=entry.get("cess", 0.0),
                total=entry["tds_amount"] + entry.get("surcharge", 0.0) + entry.get("cess", 0.0)
            )
            challan_entries.append(ce)
            total_tax += ce.tds_amount
            total_surcharge += ce.surcharge
            total_cess += ce.cess

        total_amount = total_tax + total_surcharge + total_cess + interest + penalty + fee

        return Challan281(
            challan_id=str(uuid.uuid4())[:12].upper(),
            deductor_name=deductor_name,
            deductor_pan=deductor_pan,
            deductor_tan=deductor_tan,
            assessment_year=assessment_year,
            fy_year=fy_year,
            minor_head=minor_head,
            nature_of_payment=nature_of_payment,
            entries=challan_entries,
            total_tax=total_tax,
            total_surcharge=total_surcharge,
            total_cess=total_cess,
            total_interest=interest,
            total_penalty=penalty,
            total_fee=fee,
            total_amount=total_amount,
            payment_date=datetime.now()
        )