"""
CLI wrapper for tally_importer.py — called by NestJS via child_process.
Usage: python3 tally_importer_cli.py  
Prints ImportPreview as JSON to stdout.
"""
import sys
import json
from decimal import Decimal
from dataclasses import asdict
from .tally_importer import parse_tally_xml


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} not serialisable")


def result_to_dict(preview) -> dict:
    d = asdict(preview)
    return d


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: tally_importer_cli.py  "}))
        sys.exit(1)

    filepath     = sys.argv[1]
    seller_gstin = sys.argv[2]

    # Sanitise GSTIN — strip everything except alphanumeric
    seller_gstin = ''.join(c for c in seller_gstin.upper()
                           if c.isalnum())
    if len(seller_gstin) != 15:
        print(json.dumps({"error": "Invalid seller GSTIN length"}))
        sys.exit(1)

    try:
        with open(filepath, 'r', encoding='utf-8',
                  errors='replace') as f:
            xml_str = f.read()
        result = parse_tally_xml(xml_str, seller_gstin)
        print(json.dumps(result_to_dict(result),
                         default=_decimal_default))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)