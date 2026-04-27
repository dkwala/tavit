"""
TDS Engine - Practical Demo
Shows real-world usage scenarios
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import TDSEngine, Deductee, Payment, DeducteeCategory
from challan import ChallanGenerator
from datetime import datetime

def demo():
    print("=" * 70)
    print("TDS ENGINE - PRACTICAL DEMO")
    print("FY 2025-26 | CA-Compliant Calculations")
    print("=" * 70)

    engine = TDSEngine()

    # Scenario 1: Contractor payments to individual
    print("\n[SCENARIO 1] Contractor Payments to Individual")
    print("-" * 70)
    contractor = Deductee(pan="ABCPD1234E", name="Ramesh Contractor", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    payments_194c = [
        ("P001", 25000, "Below threshold"),
        ("P002", 35000, "Above 30k - deduct"),
        ("P003", 20000, "Still below aggregate"),
        ("P004", 25000, "Crosses 1L aggregate"),
    ]

    for pid, amt, desc in payments_194c:
        p = Payment(pid, "ABCPD1234E", "194C", "contractor", amt, datetime(2025, 4, 15), 2025)
        r = engine.calculate_tds(p, contractor)
        status = "DEDUCTED" if r.threshold_applied else "EXEMPT"
        print(f"  {pid}: Rs.{amt:>8,} | {desc:<30} | {status} | TDS: Rs.{r.total_tds:>10,.2f}")

    # Scenario 2: Professional fees
    print("\n[SCENARIO 2] Professional Fees")
    print("-" * 70)
    consultant = Deductee(pan="XYZAB5678C", name="Dr. Sharma", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    p1 = Payment("P005", "XYZAB5678C", "194J", "professional_services", 40000, datetime(2025, 5, 1), 2025)
    r1 = engine.calculate_tds(p1, consultant)
    print(f"  P005: Rs.40,000 (Professional) | {'EXEMPT' if not r1.threshold_applied else 'DEDUCTED'} | Below 50k")

    p2 = Payment("P006", "XYZAB5678C", "194J", "professional_services", 75000, datetime(2025, 6, 1), 2025)
    r2 = engine.calculate_tds(p2, consultant)
    print(f"  P006: Rs.75,000 (Professional) | DEDUCTED | Rate: 10% | TDS: Rs.{r2.total_tds:,.2f}")

    # Scenario 3: Rent payments
    print("\n[SCENARIO 3] Rent Payments (Annual)")
    print("-" * 70)
    landlord = Deductee(pan="LMNOP9012Q", name="Mr. Property Owner", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    # Monthly rent of Rs.55,000
    for month in range(1, 13):
        pid = f"RENT{month:02d}"
        p = Payment(pid, "LMNOP9012Q", "194I", "land_building", 55000, datetime(2025, month, 1), 2025)
        r = engine.calculate_tds(p, landlord)
        if r.threshold_applied:
            print(f"  Month {month:2d}: Rs.55,000 | DEDUCTED | Rate: 10% | TDS: Rs.{r.total_tds:,.2f} | Aggregate crossed 6L")
        else:
            print(f"  Month {month:2d}: Rs.55,000 | EXEMPT | Aggregate: Rs.{r.aggregate_after:,.0f}")

    # Scenario 4: NRI with surcharge
    print("\n[SCENARIO 4] NRI Professional with Surcharge")
    print("-" * 70)
    nri = Deductee(pan="NRIAB1234C", name="John Smith", category=DeducteeCategory.NRI_INDIVIDUAL, estimated_total_income=8000000)

    p = Payment("P007", "NRIAB1234C", "194J", "professional_services", 500000, datetime(2025, 7, 1), 2025)
    r = engine.calculate_tds(p, nri)
    print(f"  Payment: Rs.5,00,000 (Professional)")
    print(f"  TDS @ 10%:          Rs.{r.tds_amount:>12,.2f}")
    print(f"  Surcharge @ 10%:    Rs.{r.surcharge_amount:>12,.2f}")
    print(f"  HEC @ 4%:           Rs.{r.cess_amount:>12,.2f}")
    print(f"  TOTAL TDS:          Rs.{r.total_tds:>12,.2f}")
    print(f"  Net Payment:        Rs.{r.net_payment:>12,.2f}")

    # Scenario 5: PAN not available
    print("\n[SCENARIO 5] PAN Not Available (Sec 206AA)")
    print("-" * 70)
    no_pan = Deductee(pan="", name="Unknown Party", category=DeducteeCategory.RESIDENT_INDIVIDUAL, is_pan_available=False)

    p = Payment("P008", "", "194C", "contractor", 100000, datetime(2025, 8, 1), 2025)
    r = engine.calculate_tds(p, no_pan)
    print(f"  Payment: Rs.1,00,000 (Contractor)")
    print(f"  Rate: 20% (u/s 206AA - PAN not available)")
    print(f"  TDS: Rs.{r.total_tds:,.2f}")

    # Scenario 6: Transporter exception
    print("\n[SCENARIO 6] Transporter u/s 44AE (NIL TDS)")
    print("-" * 70)
    transporter = Deductee(pan="TRANP1234S", name="Fast Logistics", category=DeducteeCategory.RESIDENT_INDIVIDUAL, is_transporter_44ae=True)

    p = Payment("P009", "TRANP1234S", "194C", "carriage_goods", 200000, datetime(2025, 9, 1), 2025)
    r = engine.calculate_tds(p, transporter)
    print(f"  Payment: Rs.2,00,000 (Goods Transport)")
    print(f"  TDS: NIL (Transporter with 44AE declaration)")

    # Generate Challan
    print("\n[SCENARIO 7] Generate ITNS 281 Challan")
    print("-" * 70)

    challan_entries = [
        {"section": "194C", "nature_of_payment": "contractor", "amount_paid": 160000, "tds_amount": 1600, "surcharge": 0, "cess": 64},
        {"section": "194J", "nature_of_payment": "professional_services", "amount_paid": 115000, "tds_amount": 11500, "surcharge": 0, "cess": 460},
        {"section": "194I", "nature_of_payment": "land_building", "amount_paid": 660000, "tds_amount": 66000, "surcharge": 0, "cess": 2640},
    ]

    challan = ChallanGenerator.create_challan(
        deductor_name="ABC Enterprises Pvt Ltd",
        deductor_pan="AAACC1234D",
        deductor_tan="CHEM12345A",
        assessment_year="2026-27",
        fy_year="2025-26",
        entries=challan_entries,
        minor_head="200",
        nature_of_payment="92C",
        interest=500,
        penalty=0,
        fee=0
    )

    print(f"  Challan ID: {challan.challan_id}")
    print(f"  Deductor: {challan.deductor_name}")
    print(f"  Total Tax: Rs.{challan.total_tax:,.2f}")
    print(f"  Total Surcharge: Rs.{challan.total_surcharge:,.2f}")
    print(f"  Total Cess: Rs.{challan.total_cess:,.2f}")
    print(f"  Interest: Rs.{challan.total_interest:,.2f}")
    print(f"  GRAND TOTAL: Rs.{challan.total_amount:,.2f}")

    print("\n" + "=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    demo()