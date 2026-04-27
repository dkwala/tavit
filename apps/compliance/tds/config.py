"""
TDS Engine Configuration - FY 2025-26 (AY 2026-27)
CA-Compliant Tax Rates and Thresholds
Source: Income Tax Act, 1961 as amended by Finance Act 2025
"""

from dataclasses import dataclass
from typing import Dict, Optional

# ============================================================
# SECTION 194C - Payment to Contractors/Sub-contractors
# ============================================================
# Threshold: ₹30,000 single transaction OR ₹1,00,000 aggregate per FY
# Rates: 1% (Individual/HUF), 2% (Others)
# Exception: Transporters owning ≤10 goods carriages (Sec 44AE) with PAN - NIL

# ============================================================
# SECTION 194J - Professional/Technical Services
# ============================================================
# Threshold: ₹50,000 per transaction (increased from ₹30,000 w.e.f 01-04-2025)
# Rates: 2% (Technical, Royalty, Call Centre, Films), 10% (Other Professional)

# ============================================================
# SECTION 194I - Rent
# ============================================================
# Threshold: ₹6,00,000 aggregate per FY (increased from ₹2,40,000 w.e.f 01-04-2025)
# Rates: 2% (Plant & Machinery), 10% (Land/Building/Furniture)

# ============================================================
# SECTION 194H - Commission/Brokerage
# ============================================================
# Threshold: ₹20,000 aggregate per FY (increased from ₹15,000 w.e.f 01-04-2025)
# Rate: 2%

# ============================================================
# CESS & SURCHARGE (FY 2025-26)
# ============================================================
# Health & Education Cess: 4% on tax amount (applicable to all)
# Surcharge: Applicable for Non-Residents and Foreign Companies based on income

@dataclass
class SectionConfig:
    section: str
    description: str
    threshold_single: Optional[float]      # Per transaction threshold
    threshold_aggregate: Optional[float]   # Annual aggregate threshold
    rates: Dict[str, float]                # Rate mapping
    cess_applicable: bool = True
    surcharge_applicable: bool = False     # True for NR, False for Resident default


TDS_SECTIONS = {
    "194C": SectionConfig(
        section="194C",
        description="Payment to Contractors/Sub-contractors",
        threshold_single=30000.0,
        threshold_aggregate=100000.0,
        rates={
            "individual_huf": 0.01,
            "others": 0.02,
            "no_pan": 0.20,  # Sec 206AA
        }
    ),
    "194J": SectionConfig(
        section="194J",
        description="Professional/Technical Services",
        threshold_single=50000.0,
        threshold_aggregate=None,
        rates={
            "technical_royalty_callcentre_films": 0.02,
            "professional_others": 0.10,
            "no_pan": 0.20,
        }
    ),
    "194I": SectionConfig(
        section="194I",
        description="Rent",
        threshold_single=None,
        threshold_aggregate=600000.0,
        rates={
            "plant_machinery": 0.02,
            "land_building_furniture": 0.10,
            "no_pan": 0.20,
        }
    ),
    "194H": SectionConfig(
        section="194H",
        description="Commission or Brokerage",
        threshold_single=None,
        threshold_aggregate=20000.0,
        rates={
            "default": 0.02,
            "no_pan": 0.20,
        }
    ),
}

# Surcharge Slabs for Non-Resident Individuals (FY 2025-26)
SURCHARGE_SLABS_NRI = [
    (0, 5000000, 0.00),
    (5000000, 10000000, 0.10),
    (10000000, 20000000, 0.15),
    (20000000, 50000000, 0.25),
    (50000000, float('inf'), 0.37),
]

# Surcharge Slabs for Foreign Companies (FY 2025-26)
SURCHARGE_SLABS_FOREIGN_CO = [
    (0, 10000000, 0.00),
    (10000000, 100000000, 0.02),
    (100000000, float('inf'), 0.05),
]

# Surcharge Slabs for Domestic Companies (FY 2025-26)
SURCHARGE_SLABS_DOMESTIC_CO = [
    (0, 10000000, 0.00),
    (10000000, 100000000, 0.07),
    (100000000, float('inf'), 0.12),
]

# Health & Education Cess Rate
HEALTH_EDUCATION_CESS_RATE = 0.04

# PAN Not Available - Higher Rate (Sec 206AA)
PAN_NOT_AVAILABLE_RATE = 0.20

# Deductee Types
DEDUCTEE_TYPES = {
    "resident_individual": "Resident Individual",
    "resident_huf": "Resident HUF",
    "resident_company_domestic": "Resident Domestic Company",
    "resident_company_foreign": "Resident Foreign Company",
    "resident_firm": "Resident Firm/LLP",
    "nri_individual": "Non-Resident Individual",
    "nri_company": "Non-Resident Company",
    "nri_other": "Non-Resident Other",
}

# Nature of Payment for 194J sub-classification
NATURE_OF_PAYMENT_194J = {
    "technical_services": "Technical Services (incl. Call Centre, Films)",
    "royalty": "Royalty",
    "professional_services": "Professional Services (Others)",
    "director_fees": "Director Fees",
}

# Nature of Payment for 194I sub-classification
NATURE_OF_PAYMENT_194I = {
    "plant_machinery": "Plant & Machinery",
    "land_building": "Land/Building/Furniture/Fittings",
}

# Nature of Payment for 194C sub-classification
NATURE_OF_PAYMENT_194C = {
    "contractor": "Contractor (General)",
    "sub_contractor": "Sub-Contractor",
    "advertising": "Advertising Contract",
    "broadcasting": "Broadcasting/Telecasting",
    "carriage_goods": "Carriage of Goods (Transporter)",
    "carriage_passengers": "Carriage of Passengers",
}