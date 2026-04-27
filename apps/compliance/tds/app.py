"""
TDS Engine - Flask REST API
Backend for TDS Calculation, Threshold Tracking & Challan Generation
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
import uuid
import json
import os

from config import (
    TDS_SECTIONS, DEDUCTEE_TYPES,
    NATURE_OF_PAYMENT_194C, NATURE_OF_PAYMENT_194J, NATURE_OF_PAYMENT_194I
)
from engine import TDSEngine, Deductee, Payment, DeducteeCategory, TDSCalculationResult
from challan import ChallanGenerator

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# In-memory storage (use database in production)
engine = TDSEngine()
deductees_db = {}  # pan -> Deductee
payments_db = {}   # payment_id -> TDSCalculationResult
challans_db = {}   # challan_id -> Challan


def get_category(category_str: str) -> DeducteeCategory:
    """Map string to DeducteeCategory enum"""
    mapping = {
        "resident_individual": DeducteeCategory.RESIDENT_INDIVIDUAL,
        "resident_huf": DeducteeCategory.RESIDENT_HUF,
        "resident_company_domestic": DeducteeCategory.RESIDENT_DOMESTIC_CO,
        "resident_company_foreign": DeducteeCategory.RESIDENT_FOREIGN_CO,
        "resident_firm": DeducteeCategory.RESIDENT_FIRM,
        "nri_individual": DeducteeCategory.NRI_INDIVIDUAL,
        "nri_company": DeducteeCategory.NRI_COMPANY,
        "nri_other": DeducteeCategory.NRI_OTHER,
    }
    return mapping.get(category_str, DeducteeCategory.RESIDENT_INDIVIDUAL)


# ============================================================
# API ROUTES
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/sections", methods=["GET"])
def get_sections():
    """Get all TDS sections with rates and thresholds"""
    sections = {}
    for code, config in TDS_SECTIONS.items():
        sections[code] = {
            "section": config.section,
            "description": config.description,
            "threshold_single": config.threshold_single,
            "threshold_aggregate": config.threshold_aggregate,
            "rates": config.rates,
        }
    return jsonify({
        "success": True,
        "data": sections,
        "fy": "2025-26",
        "ay": "2026-27"
    })


@app.route("/api/deductee-types", methods=["GET"])
def get_deductee_types():
    return jsonify({
        "success": True,
        "data": DEDUCTEE_TYPES
    })


@app.route("/api/nature-of-payment", methods=["GET"])
def get_nature_of_payment():
    return jsonify({
        "success": True,
        "data": {
            "194C": NATURE_OF_PAYMENT_194C,
            "194J": NATURE_OF_PAYMENT_194J,
            "194I": NATURE_OF_PAYMENT_194I,
            "194H": {"default": "Commission/Brokerage"}
        }
    })


@app.route("/api/deductees", methods=["POST"])
def add_deductee():
    """Add a new deductee"""
    data = request.json

    deductee = Deductee(
        pan=data["pan"].upper().strip(),
        name=data["name"],
        category=get_category(data.get("category", "resident_individual")),
        is_pan_available=data.get("is_pan_available", True),
        estimated_total_income=data.get("estimated_total_income", 0.0),
        is_transporter_44ae=data.get("is_transporter_44ae", False)
    )

    deductees_db[deductee.pan] = deductee

    return jsonify({
        "success": True,
        "message": "Deductee added successfully",
        "data": {
            "pan": deductee.pan,
            "name": deductee.name,
            "category": deductee.category.value
        }
    })


@app.route("/api/deductees", methods=["GET"])
def get_deductees():
    """Get all deductees"""
    return jsonify({
        "success": True,
        "data": [
            {
                "pan": d.pan,
                "name": d.name,
                "category": d.category.value,
                "is_pan_available": d.is_pan_available,
                "estimated_total_income": d.estimated_total_income,
                "is_transporter_44ae": d.is_transporter_44ae
            }
            for d in deductees_db.values()
        ]
    })


@app.route("/api/deductees/<pan>", methods=["GET"])
def get_deductee_summary(pan):
    """Get deductee summary with threshold tracking"""
    pan = pan.upper().strip()
    fy_year = request.args.get("fy_year", 2025, type=int)

    if pan not in deductees_db:
        return jsonify({"success": False, "message": "Deductee not found"}), 404

    summary = engine.get_deductee_summary(pan, fy_year)

    return jsonify({
        "success": True,
        "data": {
            "deductee": {
                "pan": deductees_db[pan].pan,
                "name": deductees_db[pan].name,
                "category": deductees_db[pan].category.value
            },
            "fy_year": fy_year,
            "threshold_summary": summary
        }
    })


@app.route("/api/calculate", methods=["POST"])
def calculate_tds():
    """Calculate TDS for a payment"""
    data = request.json

    pan = data["deductee_pan"].upper().strip()
    if pan not in deductees_db:
        return jsonify({"success": False, "message": "Deductee not found. Please add deductee first."}), 400

    deductee = deductees_db[pan]

    payment = Payment(
        payment_id=str(uuid.uuid4())[:8].upper(),
        deductee_pan=pan,
        section=data["section"],
        nature_of_payment=data["nature_of_payment"],
        amount=float(data["amount"]),
        payment_date=datetime.strptime(data["payment_date"], "%Y-%m-%d"),
        fy_year=int(data.get("fy_year", 2025))
    )

    result = engine.calculate_tds(payment, deductee)
    payments_db[result.payment_id] = result

    return jsonify({
        "success": True,
        "data": result.to_dict()
    })


@app.route("/api/payments", methods=["GET"])
def get_payments():
    """Get all calculated payments"""
    pan = request.args.get("pan")
    section = request.args.get("section")
    fy_year = request.args.get("fy_year", type=int)

    results = list(payments_db.values())

    if pan:
        results = [r for r in results if r.deductee_pan == pan.upper().strip()]
    if section:
        results = [r for r in results if r.section == section]

    return jsonify({
        "success": True,
        "count": len(results),
        "data": [r.to_dict() for r in results]
    })


@app.route("/api/challan", methods=["POST"])
def generate_challan():
    """Generate ITNS 281 Challan"""
    data = request.json

    entries = data.get("entries", [])

    challan = ChallanGenerator.create_challan(
        deductor_name=data["deductor_name"],
        deductor_pan=data["deductor_pan"],
        deductor_tan=data["deductor_tan"],
        assessment_year=data["assessment_year"],
        fy_year=data["fy_year"],
        entries=entries,
        minor_head=data.get("minor_head", "200"),
        nature_of_payment=data.get("nature_of_payment", "92C"),
        interest=data.get("interest", 0.0),
        penalty=data.get("penalty", 0.0),
        fee=data.get("fee", 0.0)
    )

    challans_db[challan.challan_id] = challan

    return jsonify({
        "success": True,
        "message": "Challan generated successfully",
        "data": challan.to_dict()
    })


@app.route("/api/challan/<challan_id>/text", methods=["GET"])
def get_challan_text(challan_id):
    """Get challan in text format"""
    if challan_id not in challans_db:
        return jsonify({"success": False, "message": "Challan not found"}), 404

    challan = challans_db[challan_id]

    return jsonify({
        "success": True,
        "data": challan.generate_text_format()
    })


@app.route("/api/challans", methods=["GET"])
def get_challans():
    """Get all challans"""
    return jsonify({
        "success": True,
        "data": [c.to_dict() for c in challans_db.values()]
    })


@app.route("/api/reset", methods=["POST"])
def reset_engine():
    """Reset engine data"""
    global engine, payments_db, challans_db
    engine = TDSEngine()
    payments_db = {}
    challans_db = {}
    return jsonify({"success": True, "message": "Engine reset successfully"})


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"success": False, "message": "Bad request", "error": str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Not found", "error": str(e)}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "message": "Internal server error", "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)