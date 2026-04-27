"""
TDS Calculation Engine - FY 2025-26
CA-Compliant with Threshold Accumulation, Surcharge & Cess
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json

from config import (
    TDS_SECTIONS, SURCHARGE_SLABS_NRI, SURCHARGE_SLABS_FOREIGN_CO,
    SURCHARGE_SLABS_DOMESTIC_CO, HEALTH_EDUCATION_CESS_RATE,
    PAN_NOT_AVAILABLE_RATE
)


class DeducteeCategory(Enum):
    RESIDENT_INDIVIDUAL = "resident_individual"
    RESIDENT_HUF = "resident_huf"
    RESIDENT_DOMESTIC_CO = "resident_company_domestic"
    RESIDENT_FOREIGN_CO = "resident_company_foreign"
    RESIDENT_FIRM = "resident_firm"
    NRI_INDIVIDUAL = "nri_individual"
    NRI_COMPANY = "nri_company"
    NRI_OTHER = "nri_other"


@dataclass
class Deductee:
    """Represents a deductee (payee)"""
    pan: str
    name: str
    category: DeducteeCategory
    is_pan_available: bool = True
    estimated_total_income: float = 0.0  # For surcharge calculation
    is_transporter_44ae: bool = False   # For 194C transporter exception

    def __hash__(self):
        return hash(self.pan)


@dataclass
class Payment:
    """Represents a single payment transaction"""
    payment_id: str
    deductee_pan: str
    section: str
    nature_of_payment: str
    amount: float
    payment_date: datetime
    fy_year: int  # Financial Year (e.g., 2025 for FY 2025-26)


_NRI_TYPES = {DeducteeCategory.NRI_INDIVIDUAL, DeducteeCategory.NRI_COMPANY, DeducteeCategory.NRI_OTHER}


@dataclass
class TDSCalculationResult:
    """Result of TDS calculation for a payment"""
    payment_id: str
    deductee_pan: str
    section: str
    nature_of_payment: str
    gross_amount: float
    taxable_amount: float
    tds_rate: float
    tds_amount: float
    surcharge_rate: float
    surcharge_amount: float
    cess_rate: float
    cess_amount: float
    total_tds: float
    net_payment: float
    threshold_applied: bool
    threshold_type: Optional[str]  # 'single', 'aggregate', 'both', 'none'
    aggregate_before: float
    aggregate_after: float
    remarks: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "payment_id": self.payment_id,
            "deductee_pan": self.deductee_pan,
            "section": self.section,
            "nature_of_payment": self.nature_of_payment,
            "gross_amount": round(self.gross_amount, 2),
            "taxable_amount": round(self.taxable_amount, 2),
            "tds_rate": round(self.tds_rate * 100, 2),
            "tds_amount": round(self.tds_amount, 2),
            "surcharge_rate": round(self.surcharge_rate * 100, 2),
            "surcharge_amount": round(self.surcharge_amount, 2),
            "cess_rate": round(self.cess_rate * 100, 2),
            "cess_amount": round(self.cess_amount, 2),
            "total_tds": round(self.total_tds, 2),
            "net_payment": round(self.net_payment, 2),
            "threshold_applied": self.threshold_applied,
            "threshold_type": self.threshold_type,
            "aggregate_before": round(self.aggregate_before, 2),
            "aggregate_after": round(self.aggregate_after, 2),
            "remarks": self.remarks,
        }


class TDSEngine:
    """
    Core TDS Calculation Engine
    Handles threshold accumulation, rate determination, surcharge & cess
    """

    def __init__(self):
        self.transactions: Dict[str, List[Payment]] = {}  # pan -> list of payments
        self.aggregate_tracker: Dict[str, Dict[str, float]] = {}  # pan -> {fy_section: amount}

    def _get_fy_key(self, fy_year: int, section: str) -> str:
        return f"{fy_year}_{section}"

    def _get_aggregate(self, pan: str, fy_year: int, section: str) -> float:
        key = self._get_fy_key(fy_year, section)
        return self.aggregate_tracker.get(pan, {}).get(key, 0.0)

    def _update_aggregate(self, pan: str, fy_year: int, section: str, amount: float):
        key = self._get_fy_key(fy_year, section)
        if pan not in self.aggregate_tracker:
            self.aggregate_tracker[pan] = {}
        self.aggregate_tracker[pan][key] = self.aggregate_tracker[pan].get(key, 0.0) + amount

    def _determine_rate(self, section: str, deductee: Deductee, 
                        nature_of_payment: str) -> Tuple[float, List[str]]:
        """
        Determine applicable TDS rate based on section, deductee category,
        PAN availability, and nature of payment.
        """
        remarks = []
        config = TDS_SECTIONS.get(section)
        if not config:
            raise ValueError(f"Invalid section: {section}")

        # Check PAN availability (Sec 206AA)
        if not deductee.is_pan_available:
            remarks.append("PAN not available. Applied 20% rate u/s 206AA")
            return PAN_NOT_AVAILABLE_RATE, remarks

        rate = 0.0

        if section == "194C":
            if deductee.is_transporter_44ae:
                remarks.append("Transporter with 44AE declaration - NIL TDS")
                return 0.0, remarks

            if deductee.category in [DeducteeCategory.RESIDENT_INDIVIDUAL, 
                                      DeducteeCategory.RESIDENT_HUF,
                                      DeducteeCategory.NRI_INDIVIDUAL]:
                rate = config.rates["individual_huf"]
                remarks.append(f"Applied 1% rate (Individual/HUF) u/s 194C")
            else:
                rate = config.rates["others"]
                remarks.append(f"Applied 2% rate (Others) u/s 194C")

        elif section == "194J":
            if nature_of_payment in ["technical_services", "royalty", "call_centre", "films"]:
                rate = config.rates["technical_royalty_callcentre_films"]
                remarks.append(f"Applied 2% rate (Technical/Royalty/Call Centre) u/s 194J(a)")
            else:
                rate = config.rates["professional_others"]
                remarks.append(f"Applied 10% rate (Professional Services) u/s 194J(b)")

        elif section == "194I":
            if nature_of_payment == "plant_machinery":
                rate = config.rates["plant_machinery"]
                remarks.append(f"Applied 2% rate (Plant & Machinery) u/s 194I(a)")
            else:
                rate = config.rates["land_building_furniture"]
                remarks.append(f"Applied 10% rate (Land/Building/Furniture) u/s 194I(b)")

        elif section == "194H":
            rate = config.rates["default"]
            remarks.append(f"Applied 2% rate u/s 194H")

        return rate, remarks

    def _calculate_surcharge(self, tds_amount: float, deductee: Deductee) -> Tuple[float, float, List[str]]:
        """
        Calculate surcharge based on deductee category and estimated income.
        Returns: (surcharge_rate, surcharge_amount, remarks)
        """
        remarks = []

        # Surcharge generally not applicable for resident deductees under 194C/J/I/H
        if deductee.category in [
            DeducteeCategory.RESIDENT_INDIVIDUAL,
            DeducteeCategory.RESIDENT_HUF,
            DeducteeCategory.RESIDENT_DOMESTIC_CO,
            DeducteeCategory.RESIDENT_FOREIGN_CO,
            DeducteeCategory.RESIDENT_FIRM
        ]:
            return 0.0, 0.0, remarks

        # For non-residents, apply surcharge based on estimated total income
        income = deductee.estimated_total_income
        surcharge_rate = 0.0

        if deductee.category == DeducteeCategory.NRI_INDIVIDUAL:
            for low, high, rate in SURCHARGE_SLABS_NRI:
                if low <= income < high:
                    surcharge_rate = rate
                    break
            if surcharge_rate > 0:
                remarks.append(f"Surcharge @ {surcharge_rate*100}% applied (NRI Individual, Income ₹{income:,.0f})")

        elif deductee.category == DeducteeCategory.NRI_COMPANY:
            # Check if foreign company or domestic company
            # For simplicity, assuming foreign company for NRI_COMPANY
            for low, high, rate in SURCHARGE_SLABS_FOREIGN_CO:
                if low <= income < high:
                    surcharge_rate = rate
                    break
            if surcharge_rate > 0:
                remarks.append(f"Surcharge @ {surcharge_rate*100}% applied (Foreign Company, Income ₹{income:,.0f})")

        surcharge_amount = tds_amount * surcharge_rate
        return surcharge_rate, surcharge_amount, remarks

    def _calculate_cess(self, tds_amount: float, surcharge_amount: float) -> Tuple[float, float]:
        """Calculate Health & Education Cess @ 4%"""
        base = tds_amount + surcharge_amount
        cess_amount = base * HEALTH_EDUCATION_CESS_RATE
        return HEALTH_EDUCATION_CESS_RATE, cess_amount

    def _check_threshold(self, section: str, amount: float, 
                         aggregate_before: float) -> Tuple[bool, Optional[str], float, List[str]]:
        """
        Check if payment crosses threshold limits.
        Returns: (should_deduct, threshold_type, taxable_amount, remarks)
        """
        config = TDS_SECTIONS.get(section)
        if not config:
            return False, None, 0.0, ["Invalid section"]

        remarks = []
        threshold_single = config.threshold_single
        threshold_aggregate = config.threshold_aggregate

        # Check single transaction threshold
        crosses_single = threshold_single is not None and amount > threshold_single

        # Check aggregate threshold
        aggregate_after = aggregate_before + amount
        crosses_aggregate = (threshold_aggregate is not None and 
                            aggregate_before < threshold_aggregate and 
                            aggregate_after >= threshold_aggregate)
        already_crossed = (threshold_aggregate is not None and 
                          aggregate_before >= threshold_aggregate)

        if section == "194C":
            # 194C: Deduct if SINGLE > 30,000 OR AGGREGATE > 1,00,000
            if crosses_single:
                remarks.append(f"Single transaction ₹{amount:,.2f} exceeds ₹{threshold_single:,.0f}")
                if already_crossed or crosses_aggregate:
                    return True, "both", amount, remarks
                return True, "single", amount, remarks

            if crosses_aggregate:
                remarks.append(f"Aggregate ₹{aggregate_after:,.2f} crosses ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks

            if already_crossed:
                remarks.append(f"Aggregate already exceeded ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks

            remarks.append(f"Below threshold (Single ≤ ₹{threshold_single:,.0f}, Aggregate ≤ ₹{threshold_aggregate:,.0f})")
            return False, "none", 0.0, remarks

        elif section == "194J":
            # 194J: Deduct if SINGLE > 50,000
            if crosses_single:
                remarks.append(f"Single transaction ₹{amount:,.2f} exceeds ₹{threshold_single:,.0f}")
                return True, "single", amount, remarks
            remarks.append(f"Below threshold (Single ≤ ₹{threshold_single:,.0f})")
            return False, "none", 0.0, remarks

        elif section == "194I":
            # 194I: Deduct if AGGREGATE > 6,00,000
            if crosses_aggregate:
                remarks.append(f"Aggregate ₹{aggregate_after:,.2f} crosses ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks
            if already_crossed:
                remarks.append(f"Aggregate already exceeded ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks
            remarks.append(f"Below threshold (Aggregate ≤ ₹{threshold_aggregate:,.0f})")
            return False, "none", 0.0, remarks

        elif section == "194H":
            # 194H: Deduct if AGGREGATE > 20,000
            if crosses_aggregate:
                remarks.append(f"Aggregate ₹{aggregate_after:,.2f} crosses ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks
            if already_crossed:
                remarks.append(f"Aggregate already exceeded ₹{threshold_aggregate:,.0f}")
                return True, "aggregate", amount, remarks
            remarks.append(f"Below threshold (Aggregate ≤ ₹{threshold_aggregate:,.0f})")
            return False, "none", 0.0, remarks

        return False, "none", 0.0, remarks

    def calculate_tds(self, payment: Payment, deductee: Deductee) -> TDSCalculationResult:
        """
        Main method to calculate TDS for a payment.
        CA-Compliant calculation with full audit trail.
        """
        # Get current aggregate
        aggregate_before = self._get_aggregate(deductee.pan, payment.fy_year, payment.section)

        # Check threshold
        should_deduct, threshold_type, taxable_amount, threshold_remarks = self._check_threshold(
            payment.section, payment.amount, aggregate_before
        )

        all_remarks = threshold_remarks.copy()

        if not should_deduct:
            # Update aggregate even if no TDS (for tracking)
            self._update_aggregate(deductee.pan, payment.fy_year, payment.section, payment.amount)

            return TDSCalculationResult(
                payment_id=payment.payment_id,
                deductee_pan=deductee.pan,
                section=payment.section,
                nature_of_payment=payment.nature_of_payment,
                gross_amount=payment.amount,
                taxable_amount=0.0,
                tds_rate=0.0,
                tds_amount=0.0,
                surcharge_rate=0.0,
                surcharge_amount=0.0,
                cess_rate=0.0,
                cess_amount=0.0,
                total_tds=0.0,
                net_payment=payment.amount,
                threshold_applied=False,
                threshold_type=threshold_type,
                aggregate_before=aggregate_before,
                aggregate_after=aggregate_before + payment.amount,
                remarks=all_remarks
            )

        # Determine rate
        tds_rate, rate_remarks = self._determine_rate(
            payment.section, deductee, payment.nature_of_payment
        )
        all_remarks.extend(rate_remarks)

        # If rate is 0 (e.g., transporter exception)
        if tds_rate == 0.0:
            self._update_aggregate(deductee.pan, payment.fy_year, payment.section, payment.amount)
            return TDSCalculationResult(
                payment_id=payment.payment_id,
                deductee_pan=deductee.pan,
                section=payment.section,
                nature_of_payment=payment.nature_of_payment,
                gross_amount=payment.amount,
                taxable_amount=0.0,
                tds_rate=0.0,
                tds_amount=0.0,
                surcharge_rate=0.0,
                surcharge_amount=0.0,
                cess_rate=0.0,
                cess_amount=0.0,
                total_tds=0.0,
                net_payment=payment.amount,
                threshold_applied=True,
                threshold_type=threshold_type,
                aggregate_before=aggregate_before,
                aggregate_after=aggregate_before + payment.amount,
                remarks=all_remarks
            )

        # Calculate TDS
        tds_amount = taxable_amount * tds_rate

        # Calculate Surcharge
        surcharge_rate, surcharge_amount, surcharge_remarks = self._calculate_surcharge(
            tds_amount, deductee
        )
        all_remarks.extend(surcharge_remarks)

        # Calculate Cess — only for NRI deductees (not applicable to residents under 194C/J/I/H)
        if deductee.category in _NRI_TYPES:
            cess_rate, cess_amount = self._calculate_cess(tds_amount, surcharge_amount)
            all_remarks.append("Health & Education Cess @ 4% on (TDS + Surcharge)")
        else:
            cess_rate, cess_amount = 0.0, 0.0

        # Total TDS
        total_tds = tds_amount + surcharge_amount + cess_amount
        net_payment = payment.amount - total_tds

        # Update aggregate
        self._update_aggregate(deductee.pan, payment.fy_year, payment.section, payment.amount)
        aggregate_after = self._get_aggregate(deductee.pan, payment.fy_year, payment.section)

        return TDSCalculationResult(
            payment_id=payment.payment_id,
            deductee_pan=deductee.pan,
            section=payment.section,
            nature_of_payment=payment.nature_of_payment,
            gross_amount=payment.amount,
            taxable_amount=taxable_amount,
            tds_rate=tds_rate,
            tds_amount=tds_amount,
            surcharge_rate=surcharge_rate,
            surcharge_amount=surcharge_amount,
            cess_rate=cess_rate,
            cess_amount=cess_amount,
            total_tds=total_tds,
            net_payment=net_payment,
            threshold_applied=True,
            threshold_type=threshold_type,
            aggregate_before=aggregate_before,
            aggregate_after=aggregate_after,
            remarks=all_remarks
        )

    def get_deductee_summary(self, pan: str, fy_year: int) -> Dict:
        """Get summary of all transactions for a deductee in a FY"""
        summary = {}
        for section in ["194C", "194J", "194I", "194H"]:
            key = self._get_fy_key(fy_year, section)
            amount = self.aggregate_tracker.get(pan, {}).get(key, 0.0)
            config = TDS_SECTIONS[section]
            threshold = config.threshold_aggregate or config.threshold_single or 0
            summary[section] = {
                "aggregate_paid": amount,
                "threshold": threshold,
                "threshold_crossed": amount > threshold if threshold > 0 else False,
                "remaining_threshold": max(0, threshold - amount) if threshold > 0 else 0
            }
        return summary

    def reset(self):
        """Reset all tracking data"""
        self.transactions = {}
        self.aggregate_tracker = {}


# Utility function for precise decimal calculation
def round_off(amount: float, decimals: int = 2) -> float:
    """Round to specified decimal places using HALF_UP"""
    d = Decimal(str(amount))
    return float(d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))