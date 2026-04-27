TDS Engine 2025-26
CA-Compliant Tax Deduction at Source System
A comprehensive TDS calculation engine covering Sections 194C, 194J, 194I, and 194H for FY 2025-26 (AY 2026-27).
Features
Section Mapping: Full support for 194C, 194J, 194I, 194H with correct rates
Threshold Accumulation: Per-transaction and annual aggregate tracking
Surcharge & Cess: Automatic calculation for NRI/Foreign Company + 4% HEC
Challan Generation: ITNS 281 challan with text export
PAN Validation: Sec 206AA higher rate (20%) for missing PAN
Transporter Exception: Sec 44AE NIL TDS for qualifying transporters
Modular Architecture: Easy to extend and maintain  
Tax Rates (FY 2025-26)
| Section | Description | Threshold | Rate |
| ------- | ---------------------- | ------------------------------- | -------------------------- |
| 194C | Contractors | Rs.30,000/txn or Rs.1,00,000/yr | 1% (Ind/HUF), 2% (Others) |
| 194J | Professional/Technical | Rs.50,000/txn | 2% (Tech), 10% (Prof) |
| 194I | Rent | Rs.6,00,000/yr | 2% (P\&M), 10% (Land/Bldg) |
| 194H | Commission | Rs.20,000/yr | 2% |
pip install -r requirements.txt
python app.py
tds_engine/
├── config.py # Tax rates, thresholds, surcharge slabs
├── engine.py # Core TDS calculation engine
├── challan.py # ITNS 281 challan generator
├── app.py # Flask REST API
├── templates/
│ └── index.html # Single-page UI
├── requirements.txt
└── README.md
API Endpoints
| Method | Endpoint | Description |
| ------ | -------------- | -------------------- |
| GET | /api/sections | Get all TDS sections |
| POST | /api/deductees | Add deductee |
| GET | /api/deductees | List deductees |
| POST | /api/calculate | Calculate TDS |
| GET | /api/payments | List payments |
| POST | /api/challan | Generate challan |
CA Compliance Notes
Thresholds: Updated as per Finance Act 2025
194J: Rs.50,000 (increased from Rs.30,000)
194I: Rs.6,00,000 (increased from Rs.2,40,000)
194H: Rs.20,000 (increased from Rs.15,000)
Surcharge: Applicable only for Non-Residents based on income slabs
Cess: 4% Health & Education Cess on (TDS + Surcharge)
PAN: 20% rate u/s 206AA if PAN not available
Transporter: NIL TDS u/s 194C if owning <=10 goods carriages with PAN
License
For professional tax compliance use.
