"""
TDS Engine - CA Compliance Test Suite
Tests all sections, thresholds, surcharge, cess, and edge cases
"""

import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import TDSEngine, Deductee, Payment, DeducteeCategory
from datetime import datetime
from config import TDS_SECTIONS

def test_194c_threshold_single():
    """Test 194C single transaction threshold (Rs.30,000)"""
    engine = TDSEngine()
    deductee = Deductee(pan="ABCDE1234F", name="Test", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    p1 = Payment("P001", "ABCDE1234F", "194C", "contractor", 25000.0, datetime(2025, 4, 15), 2025)
    r1 = engine.calculate_tds(p1, deductee)
    assert r1.threshold_applied == False, "Below 30k should not deduct"
    assert r1.total_tds == 0, "TDS should be 0"
    print("PASS: 194C below single threshold")

    p2 = Payment("P002", "ABCDE1234F", "194C", "contractor", 35000.0, datetime(2025, 4, 16), 2025)
    r2 = engine.calculate_tds(p2, deductee)
    assert r2.threshold_applied == True, "Above 30k should deduct"
    assert r2.tds_rate == 0.01, "Individual rate 1%"
    assert r2.tds_amount == 350.0, "35000 * 1% = 350"
    assert r2.cess_amount == 0.0,  "No cess for resident deductee (CBDT: cess not added at source for 194C residents)"
    assert r2.total_tds  == 350.0, "35000 * 1% = 350 (no cess for residents)"
    print("PASS: 194C above single threshold")

def test_194c_threshold_aggregate():
    """Test 194C aggregate threshold (Rs.1,00,000)"""
    engine = TDSEngine()
    deductee = Deductee(pan="FGHIJ5678K", name="Test2", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    for i in range(3):
        p = Payment(f"P{i}", "FGHIJ5678K", "194C", "contractor", 25000.0, datetime(2025, 5, 15), 2025)
        r = engine.calculate_tds(p, deductee)
        assert r.threshold_applied == False, f"Payment {i} below threshold"

    p4 = Payment("P4", "FGHIJ5678K", "194C", "contractor", 25000.0, datetime(2025, 6, 18), 2025)
    r4 = engine.calculate_tds(p4, deductee)
    assert r4.threshold_applied == True, "Aggregate crosses 1L"
    assert r4.aggregate_before == 75000.0
    assert r4.aggregate_after == 100000.0
    print("PASS: 194C aggregate threshold")

def test_194c_company_rate():
    """Test 194C company rate (2%)"""
    engine = TDSEngine()
    deductee = Deductee(pan="KLMNO9012P", name="ABC Ltd", category=DeducteeCategory.RESIDENT_DOMESTIC_CO)

    p = Payment("P001", "KLMNO9012P", "194C", "contractor", 50000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.02, "Company rate 2%"
    assert r.tds_amount == 1000.0, "50000 * 2% = 1000"
    print("PASS: 194C company rate")

def test_194j_threshold():
    """Test 194J threshold (Rs.50,000 per transaction)"""
    engine = TDSEngine()
    deductee = Deductee(pan="PQRST3456U", name="Consultant", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    p1 = Payment("P001", "PQRST3456U", "194J", "professional_services", 40000.0, datetime(2025, 4, 15), 2025)
    r1 = engine.calculate_tds(p1, deductee)
    assert r1.threshold_applied == False, "Below 50k"

    p2 = Payment("P002", "PQRST3456U", "194J", "professional_services", 60000.0, datetime(2025, 4, 16), 2025)
    r2 = engine.calculate_tds(p2, deductee)
    assert r2.threshold_applied == True, "Above 50k"
    assert r2.tds_rate == 0.10, "Professional 10%"
    assert r2.tds_amount == 6000.0
    print("PASS: 194J threshold and rate")

def test_194j_technical_rate():
    """Test 194J technical rate (2%)"""
    engine = TDSEngine()
    deductee = Deductee(pan="VWXYZ7890A", name="Tech Co", category=DeducteeCategory.RESIDENT_DOMESTIC_CO)

    p = Payment("P001", "VWXYZ7890A", "194J", "technical_services", 100000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.02, "Technical 2%"
    assert r.tds_amount == 2000.0
    print("PASS: 194J technical rate")

def test_194i_threshold():
    """Test 194I threshold (Rs.6,00,000 per year)"""
    engine = TDSEngine()
    deductee = Deductee(pan="BCDEF1234G", name="Landlord", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    # 11 payments of 50,000 each = 5,50,000 (below 6L)
    for i in range(11):
        p = Payment(f"P{i}", "BCDEF1234G", "194I", "land_building", 50000.0, datetime(2025, 5, 1), 2025)
        r = engine.calculate_tds(p, deductee)
        assert r.threshold_applied == False, f"Payment {i+1} below 6L"

    # 12th payment of 50,000 = 6,00,000 (crosses threshold)
    p12 = Payment("P12", "BCDEF1234G", "194I", "land_building", 50000.0, datetime(2025, 6, 1), 2025)
    r12 = engine.calculate_tds(p12, deductee)
    assert r12.threshold_applied == True, "12th month crosses 6L"
    assert r12.tds_rate == 0.10, "Land/Building 10%"
    print("PASS: 194I threshold")

def test_194h_threshold():
    """Test 194H threshold (Rs.20,000 per year)"""
    engine = TDSEngine()
    deductee = Deductee(pan="CDEFG5678H", name="Agent", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    p1 = Payment("P001", "CDEFG5678H", "194H", "default", 15000.0, datetime(2025, 4, 15), 2025)
    r1 = engine.calculate_tds(p1, deductee)
    assert r1.threshold_applied == False, "Below 20k"

    p2 = Payment("P002", "CDEFG5678H", "194H", "default", 10000.0, datetime(2025, 5, 15), 2025)
    r2 = engine.calculate_tds(p2, deductee)
    assert r2.threshold_applied == True, "Crosses 20k"
    assert r2.tds_rate == 0.02, "Commission 2%"
    print("PASS: 194H threshold")

def test_pan_not_available():
    """Test Sec 206AA - 20% rate when PAN not available"""
    engine = TDSEngine()
    deductee = Deductee(pan="", name="No PAN", category=DeducteeCategory.RESIDENT_INDIVIDUAL, is_pan_available=False)

    p = Payment("P001", "", "194C", "contractor", 50000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.20, "PAN not available = 20%"
    assert r.tds_amount == 10000.0, "50000 * 20% = 10000"
    print("PASS: PAN not available (206AA)")

def test_transporter_exception():
    """Test Sec 44AE transporter exception"""
    engine = TDSEngine()
    deductee = Deductee(pan="EFGHI9012J", name="Transporter", category=DeducteeCategory.RESIDENT_INDIVIDUAL, is_transporter_44ae=True)

    p = Payment("P001", "EFGHI9012J", "194C", "carriage_goods", 100000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.0, "Transporter with 44AE = NIL"
    assert r.total_tds == 0, "No TDS"
    print("PASS: Transporter exception (44AE)")

def test_nri_surcharge():
    """Test surcharge for NRI Individual"""
    engine = TDSEngine()
    deductee = Deductee(pan="JKLMN3456O", name="NRI", category=DeducteeCategory.NRI_INDIVIDUAL, estimated_total_income=7500000.0)

    p = Payment("P001", "JKLMN3456O", "194J", "professional_services", 100000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.10, "Professional 10%"
    assert r.tds_amount == 10000.0
    assert r.surcharge_rate == 0.10, "NRI income 50L-1Cr = 10% surcharge"
    assert r.surcharge_amount == 1000.0, "10000 * 10% = 1000"
    assert r.cess_amount == 440.0, "(10000+1000) * 4% = 440"
    assert r.total_tds == 11440.0, "10000 + 1000 + 440 = 11440"
    print("PASS: NRI surcharge")

def test_resident_no_surcharge():
    """Test no surcharge for resident"""
    engine = TDSEngine()
    deductee = Deductee(pan="PQRST7890U", name="Resident", category=DeducteeCategory.RESIDENT_INDIVIDUAL, estimated_total_income=100000000.0)

    p = Payment("P001", "PQRST7890U", "194J", "professional_services", 100000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.surcharge_rate == 0.0, "Resident = no surcharge"
    assert r.surcharge_amount == 0.0
    print("PASS: Resident no surcharge")

def test_194i_plant_machinery():
    """Test 194I Plant & Machinery rate (2%)"""
    engine = TDSEngine()
    deductee = Deductee(pan="TUVWX1234Y", name="Factory", category=DeducteeCategory.RESIDENT_DOMESTIC_CO)

    p = Payment("P001", "TUVWX1234Y", "194I", "plant_machinery", 700000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)
    assert r.tds_rate == 0.02, "Plant & Machinery 2%"
    assert r.tds_amount == 14000.0
    print("PASS: 194I Plant & Machinery")

def test_194c_already_crossed():
    """Test 194C when aggregate already crossed"""
    engine = TDSEngine()
    deductee = Deductee(pan="ZZZZZ0000Z", name="Big Contractor", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    # First payment crosses aggregate
    p1 = Payment("P001", "ZZZZZ0000Z", "194C", "contractor", 150000.0, datetime(2025, 4, 1), 2025)
    r1 = engine.calculate_tds(p1, deductee)
    assert r1.threshold_applied == True

    # Second payment - already crossed, should deduct
    p2 = Payment("P002", "ZZZZZ0000Z", "194C", "contractor", 50000.0, datetime(2025, 5, 1), 2025)
    r2 = engine.calculate_tds(p2, deductee)
    assert r2.threshold_applied == True, "Should deduct since already crossed"
    assert r2.tds_amount == 500.0, "50000 * 1% = 500"
    print("PASS: 194C already crossed aggregate")

def test_194j_no_aggregate():
    """Test 194J has no aggregate threshold"""
    engine = TDSEngine()
    deductee = Deductee(pan="YYYYY1111Y", name="Consultant", category=DeducteeCategory.RESIDENT_INDIVIDUAL)

    # Multiple payments below 50k each
    for i in range(5):
        p = Payment(f"P{i}", "YYYYY1111Y", "194J", "professional_services", 40000.0, datetime(2025, 4, 15), 2025)
        r = engine.calculate_tds(p, deductee)
        assert r.threshold_applied == False, f"Payment {i} below 50k"

    # Total aggregate = 2L but no deduction since each below 50k
    summary = engine.get_deductee_summary("YYYYY1111Y", 2025)
    assert summary['194J']['aggregate_paid'] == 200000.0
    print("PASS: 194J no aggregate threshold")

def test_cess_calculation():
    """Verify cess is 4% on (TDS + Surcharge)"""
    engine = TDSEngine()
    deductee = Deductee(pan="XXXXX2222X", name="NRI High Income", category=DeducteeCategory.NRI_INDIVIDUAL, estimated_total_income=15000000.0)

    p = Payment("P001", "XXXXX2222X", "194J", "professional_services", 200000.0, datetime(2025, 4, 15), 2025)
    r = engine.calculate_tds(p, deductee)

    # TDS = 200000 * 10% = 20000
    # Surcharge = 15% (1Cr-2Cr slab) = 3000
    # Cess = 4% of (20000+3000) = 920
    expected_tds = 20000.0
    expected_sc = 3000.0
    expected_cess = 920.0
    expected_total = 23920.0

    assert abs(r.tds_amount - expected_tds) < 0.01, f"TDS expected {expected_tds}, got {r.tds_amount}"
    assert abs(r.surcharge_amount - expected_sc) < 0.01, f"SC expected {expected_sc}, got {r.surcharge_amount}"
    assert abs(r.cess_amount - expected_cess) < 0.01, f"Cess expected {expected_cess}, got {r.cess_amount}"
    assert abs(r.total_tds - expected_total) < 0.01, f"Total expected {expected_total}, got {r.total_tds}"
    print("PASS: Cess calculation verified")

def run_all_tests():
    print("=" * 60)
    print("TDS ENGINE - CA COMPLIANCE TEST SUITE")
    print("FY 2025-26 | AY 2026-27")
    print("=" * 60)

    tests = [
        test_194c_threshold_single,
        test_194c_threshold_aggregate,
        test_194c_company_rate,
        test_194j_threshold,
        test_194j_technical_rate,
        test_194i_threshold,
        test_194h_threshold,
        test_pan_not_available,
        test_transporter_exception,
        test_nri_surcharge,
        test_resident_no_surcharge,
        test_194i_plant_machinery,
        test_194c_already_crossed,
        test_194j_no_aggregate,
        test_cess_calculation,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL: {test.__name__} - {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__} - {e}")
            failed += 1

    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)

    if failed == 0:
        print("ALL TESTS PASSED - ENGINE IS CA COMPLIANT")
    else:
        print("SOME TESTS FAILED - REVIEW REQUIRED")

    return failed == 0

if __name__ == "__main__":
    run_all_tests()