import re
from typing import Optional

TALLY_UNREGISTERED_PLACEHOLDERS = {"URP", "NA", "N/A", "NIL", "NONE", "-", ""}

GSTIN_PATTERN = re.compile(
    r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
)

STATE_CODES = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "96": "Other Countries",
    "97": "Other Territory",
    "99": "Centre Jurisdiction",
}


def validate_gstin(gstin: str) -> dict:
    """
    Validate a GSTIN and return structured result.
    GSTIN format: 2-digit state + PAN (10 chars) + entity + Z + checksum
    """
    if not gstin:
        return {"valid": False, "error": "GSTIN is empty"}

    gstin = gstin.strip().upper()

    if gstin in TALLY_UNREGISTERED_PLACEHOLDERS:
        return {
            "valid": False,
            "error": "Unregistered party",
            "is_unregistered": True
        }

    if len(gstin) != 15:
        return {"valid": False, "error": f"Length {len(gstin)}, expected 15"}

    if not GSTIN_PATTERN.match(gstin):
        return {"valid": False, "error": "Pattern mismatch — invalid format"}

    state_code = gstin[:2]
    if state_code not in STATE_CODES:
        return {"valid": False, "error": f"Invalid state code: {state_code}"}

    if not _verify_checksum(gstin):
        return {"valid": False, "error": "Checksum digit invalid"}

    return {
        "valid": True,
        "gstin": gstin,
        "state_code": state_code,
        "state_name": STATE_CODES[state_code],
        "pan": gstin[2:12],
        "entity_number": gstin[12],
        "taxpayer_type": gstin[5],
        "checksum": gstin[14],
    }


def _verify_checksum(gstin: str) -> bool:
    """Verify the 15th character checksum using modulo-36 algorithm."""
    CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    factor = 2
    total = 0
    try:
        for char in reversed(gstin[:-1]):
            digit = CHARS.index(char) * factor
            digit = (digit // 36) + (digit % 36)
            total += digit
            factor = 1 if factor == 2 else 2
    except ValueError:
        return False
    expected = CHARS[(36 - (total % 36)) % 36]
    return expected == gstin[-1]


def get_state_from_gstin(gstin: str) -> Optional[str]:
    """Extract validated 2-digit state code from GSTIN. Returns None if invalid."""
    if not gstin:
        return None
    gstin = gstin.strip().upper()
    if gstin in TALLY_UNREGISTERED_PLACEHOLDERS:
        return None
    if len(gstin) < 2:
        return None
    state_code = gstin[:2]
    if state_code not in STATE_CODES:
        return None
    return state_code
