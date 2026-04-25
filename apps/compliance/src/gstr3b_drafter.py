#!/usr/bin/env python3
"""
GSTR-3B Drafter - RED ZONE Focus
================================

CA-cleared module for manually drafting GSTR-3B returns.
Fixes applied:
  1. Table 6.1 tax_payable now carries gross liability (not net) per GSTN validation.
  2. Section 49(5) 5-step ITC utilization sequence (IGST→IGST→CGST→SGST→CGST→SGST).
  3. Silent bugs fixed in OverrideManager (missing assignments for ineligible_itc & intra_state).
  4. Table 3.1(e) Non-GST outward supplies added; calculate() simplified.
"""

import json
import sys
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Tuple, Any
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum


# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

class TaxHead(str, Enum):
    IGST = "igst"
    CGST = "cgst"
    SGST = "sgst"
    CESS = "cess"


TAX_HEADS = [TaxHead.IGST, TaxHead.CGST, TaxHead.SGST, TaxHead.CESS]


# =============================================================================
# DOMAIN MODELS
# =============================================================================

@dataclass
class TaxComponent:
    """Represents tax values across all four heads."""
    igst: Decimal = Decimal("0.00")
    cgst: Decimal = Decimal("0.00")
    sgst: Decimal = Decimal("0.00")
    cess: Decimal = Decimal("0.00")

    def __post_init__(self):
        for head in TAX_HEADS:
            value = getattr(self, head.value)
            if not isinstance(value, Decimal):
                setattr(self, head.value, Decimal(str(value)).quantize(Decimal("0.01")))

    def to_dict(self) -> Dict[str, str]:
        return {head.value: str(getattr(self, head.value)) for head in TAX_HEADS}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TaxComponent":
        return cls(**{k: Decimal(str(v)) for k, v in data.items()})

    def __add__(self, other: "TaxComponent") -> "TaxComponent":
        return TaxComponent(**{
            head.value: getattr(self, head.value) + getattr(other, head.value)
            for head in TAX_HEADS
        })

    def __sub__(self, other: "TaxComponent") -> "TaxComponent":
        return TaxComponent(**{
            head.value: getattr(self, head.value) - getattr(other, head.value)
            for head in TAX_HEADS
        })


@dataclass
class ReconciliationResult:
    """Input data model from reconciliation engine."""
    eligible_igst: Decimal = Decimal("0.00")
    eligible_cgst: Decimal = Decimal("0.00")
    eligible_sgst: Decimal = Decimal("0.00")
    eligible_cess: Decimal = Decimal("0.00")

    def to_tax_component(self) -> TaxComponent:
        return TaxComponent(
            igst=self.eligible_igst,
            cgst=self.eligible_cgst,
            sgst=self.eligible_sgst,
            cess=self.eligible_cess,
        )


@dataclass
class Table31Row:
    """Table 3.1 row structure for outward/inward supplies."""
    description: str
    taxable_value: Decimal = Decimal("0.00")
    tax: TaxComponent = field(default_factory=TaxComponent)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "description": self.description,
            "taxable_value": str(self.taxable_value),
            "tax": self.tax.to_dict()
        }


@dataclass
class Table31Data:
    """Table 3.1: Outward and reverse charge supplies."""
    outward_taxable_supplies: Table31Row = field(default_factory=lambda: Table31Row("(a) Outward taxable supplies"))
    outward_zero_rated: Table31Row = field(default_factory=lambda: Table31Row("(b) Outward zero rated"))
    outward_nil_exempt: Table31Row = field(default_factory=lambda: Table31Row("(c) Nil rated/exempt"))
    inward_reverse_charge: Table31Row = field(default_factory=lambda: Table31Row("(d) Inward reverse charge"))
    outward_non_gst: Table31Row = field(default_factory=lambda: Table31Row("(e) Non-GST outward supplies"))

    def total_liability(self) -> TaxComponent:
        """Aggregate tax liability from taxable rows only (e carries no GST)."""
        return (
            self.outward_taxable_supplies.tax +
            self.outward_zero_rated.tax +
            self.outward_nil_exempt.tax +
            self.inward_reverse_charge.tax
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "3.1(a)": self.outward_taxable_supplies.to_dict(),
            "3.1(b)": self.outward_zero_rated.to_dict(),
            "3.1(c)": self.outward_nil_exempt.to_dict(),
            "3.1(d)": self.inward_reverse_charge.to_dict(),
            "3.1(e)": self.outward_non_gst.to_dict(),
            "total_liability": self.total_liability().to_dict()
        }


@dataclass
class Table4Data:
    """Table 4: Eligible ITC and Ineligible ITC."""
    itc_available: TaxComponent = field(default_factory=TaxComponent)
    ineligible_itc: TaxComponent = field(default_factory=TaxComponent)

    def net_itc(self) -> TaxComponent:
        result = self.itc_available - self.ineligible_itc
        # Enforce zero floor per head
        final = {}
        for head in TAX_HEADS:
            val = getattr(result, head.value)
            final[head.value] = max(Decimal("0.00"), val)
        return TaxComponent(**final)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "4A_itc_available": self.itc_available.to_dict(),
            "4D(1)_ineligible": self.ineligible_itc.to_dict(),
            "net_itc": self.net_itc().to_dict()
        }


@dataclass
class Table51Data:
    """Table 5.1: Exempt, nil-rated & non-GST inward supplies."""
    inter_state: Decimal = Decimal("0.00")
    intra_state: Decimal = Decimal("0.00")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "inter_state": str(self.inter_state),
            "intra_state": str(self.intra_state)
        }


@dataclass
class Table61Row:
    """Table 6.1: Tax payment row per head.

    GSTN expects:
      tax_payable         = Gross liability (before any ITC)
      tax_paid_through_itc= ITC utilized from this head
      tax_paid_in_cash    = Net payable after all ITC (cash component)
    """
    tax_payable: Decimal = Decimal("0.00")
    tax_paid_through_itc: Decimal = Decimal("0.00")
    tax_paid_in_cash: Decimal = Decimal("0.00")
    late_fee: Decimal = Decimal("0.00")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tax_payable": str(self.tax_payable),
            "tax_paid_through_itc": str(self.tax_paid_through_itc),
            "tax_paid_in_cash": str(self.tax_paid_in_cash),
            "late_fee": str(self.late_fee)
        }


@dataclass
class Table61Data:
    """Table 6.1: Payment of tax."""
    igst: Table61Row = field(default_factory=Table61Row)
    cgst: Table61Row = field(default_factory=Table61Row)
    sgst: Table61Row = field(default_factory=Table61Row)
    cess: Table61Row = field(default_factory=Table61Row)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "igst": self.igst.to_dict(),
            "cgst": self.cgst.to_dict(),
            "sgst": self.sgst.to_dict(),
            "cess": self.cess.to_dict()
        }


@dataclass
class GSTR3BForm:
    """Complete GSTR-3B Form structure."""
    gstin: str = ""
    return_period: str = ""  # Format: MMYYYY
    table_31: Table31Data = field(default_factory=Table31Data)
    table_4: Table4Data = field(default_factory=Table4Data)
    table_51: Table51Data = field(default_factory=Table51Data)
    table_61: Table61Data = field(default_factory=Table61Data)
    excess_itc_carried_forward: TaxComponent = field(default_factory=TaxComponent)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gstin": self.gstin,
            "return_period": self.return_period,
            "table_3.1": self.table_31.to_dict(),
            "table_4": self.table_4.to_dict(),
            "table_5.1": self.table_51.to_dict(),
            "table_6.1": self.table_61.to_dict(),
            "excess_itc_carried_forward": self.excess_itc_carried_forward.to_dict()
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)


# =============================================================================
# CALCULATION ENGINE
# =============================================================================

class GSTR3BCalculator:
    """
    Core calculation engine for GSTR-3B.
    Implements Section 49(5) ITC utilization sequence.
    """

    @staticmethod
    def compute_net_payable(liability: TaxComponent, itc: TaxComponent) -> Tuple[TaxComponent, TaxComponent, TaxComponent]:
        """
        Section 49(5) 5-step ITC utilisation sequence:
          1. IGST ITC  -> IGST Liability
          2. Surplus IGST ITC -> CGST Liability
          3. Surplus IGST ITC -> SGST Liability
          4. CGST ITC  -> CGST Liability
          5. SGST ITC  -> SGST Liability
          6. CESS ITC  -> CESS Liability  (no cross-utilisation)

        Args:
            liability: Gross tax liability per head (from Table 3.1)
            itc: Net available ITC per head (from Table 4)

        Returns:
            Tuple of (net_payable, excess_itc, itc_utilized)
        """
        # Working copies (mutable)
        liab = {h.value: getattr(liability, h.value) for h in TAX_HEADS}
        itc_avail = {h.value: getattr(itc, h.value) for h in TAX_HEADS}
        itc_used = {h.value: Decimal("0.00") for h in TAX_HEADS}

        # Step 1: IGST ITC against IGST Liability
        used = min(itc_avail["igst"], liab["igst"])
        itc_used["igst"] += used
        itc_avail["igst"] -= used
        liab["igst"] -= used

        # Step 2: Remaining IGST ITC against CGST Liability
        used = min(itc_avail["igst"], liab["cgst"])
        itc_used["igst"] += used
        itc_avail["igst"] -= used
        liab["cgst"] -= used

        # Step 3: Remaining IGST ITC against SGST Liability
        used = min(itc_avail["igst"], liab["sgst"])
        itc_used["igst"] += used
        itc_avail["igst"] -= used
        liab["sgst"] -= used

        # Step 4: CGST ITC against CGST Liability
        used = min(itc_avail["cgst"], liab["cgst"])
        itc_used["cgst"] += used
        itc_avail["cgst"] -= used
        liab["cgst"] -= used

        # Step 5: SGST ITC against SGST Liability
        used = min(itc_avail["sgst"], liab["sgst"])
        itc_used["sgst"] += used
        itc_avail["sgst"] -= used
        liab["sgst"] -= used

        # Step 6: CESS ITC against CESS Liability (island — no cross-utilisation)
        used = min(itc_avail["cess"], liab["cess"])
        itc_used["cess"] += used
        itc_avail["cess"] -= used
        liab["cess"] -= used

        net_payable = TaxComponent(**{h.value: liab[h.value] for h in TAX_HEADS})
        excess_itc = TaxComponent(**{h.value: itc_avail[h.value] for h in TAX_HEADS})
        itc_utilized = TaxComponent(**{h.value: itc_used[h.value] for h in TAX_HEADS})

        return net_payable, excess_itc, itc_utilized

    @staticmethod
    def build_table_61(gross_liability: TaxComponent, net_payable: TaxComponent,
                       itc_utilized: TaxComponent) -> Table61Data:
        """
        Build Table 6.1 with GSTN-compliant column mapping:
          tax_payable          = gross liability (pre-ITC)
          tax_paid_through_itc = ITC utilized from this head
          tax_paid_in_cash     = net payable (post-ITC)
        """
        table_61 = Table61Data()
        for head in TAX_HEADS:
            gross = getattr(gross_liability, head.value)
            net = getattr(net_payable, head.value)
            itc = getattr(itc_utilized, head.value)

            row = Table61Row(
                tax_payable=gross,
                tax_paid_through_itc=itc,
                tax_paid_in_cash=net,
                late_fee=Decimal("0.00")
            )
            setattr(table_61, head.value, row)

        return table_61


# =============================================================================
# OVERRIDE MANAGER
# =============================================================================

class OverrideManager:
    """
    Manages manual overrides for any field in the GSTR-3B form.
    Supports interactive CLI overrides and programmatic updates.
    """

    def __init__(self, form: GSTR3BForm):
        self.form = form
        self.overrides_log: list = []

    def update_table_31_row(self, row_key: str, taxable_value: Optional[Decimal] = None,
                           tax: Optional[TaxComponent] = None):
        """Override specific Table 3.1 row values."""
        row_map = {
            "3.1(a)": "outward_taxable_supplies",
            "3.1(b)": "outward_zero_rated",
            "3.1(c)": "outward_nil_exempt",
            "3.1(d)": "inward_reverse_charge",
            "3.1(e)": "outward_non_gst"
        }

        if row_key not in row_map:
            raise ValueError(f"Invalid row key. Choose from: {list(row_map.keys())}")

        row = getattr(self.form.table_31, row_map[row_key])

        if taxable_value is not None:
            self._log_override(f"3.1.{row_key}", "taxable_value", row.taxable_value, taxable_value)
            row.taxable_value = taxable_value

        if tax is not None:
            self._log_override(f"3.1.{row_key}", "tax", row.tax, tax)
            row.tax = tax

    def update_itc(self, itc_available: Optional[TaxComponent] = None,
                   ineligible_itc: Optional[TaxComponent] = None):
        """Override Table 4 ITC values."""
        if itc_available is not None:
            self._log_override("4A", "itc_available", self.form.table_4.itc_available, itc_available)
            self.form.table_4.itc_available = itc_available

        if ineligible_itc is not None:
            self._log_override("4D(1)", "ineligible_itc", self.form.table_4.ineligible_itc, ineligible_itc)
            self.form.table_4.ineligible_itc = ineligible_itc

    def update_table_51(self, inter_state: Optional[Decimal] = None, intra_state: Optional[Decimal] = None):
        """Override Table 5.1 values."""
        if inter_state is not None:
            self._log_override("5.1", "inter_state", self.form.table_51.inter_state, inter_state)
            self.form.table_51.inter_state = inter_state

        if intra_state is not None:
            self._log_override("5.1", "intra_state", self.form.table_51.intra_state, intra_state)
            self.form.table_51.intra_state = intra_state

    def update_table_61(self, head: TaxHead, tax_payable: Optional[Decimal] = None,
                        tax_paid_in_cash: Optional[Decimal] = None,
                        late_fee: Optional[Decimal] = None):
        """Override Table 6.1 specific head values."""
        row = getattr(self.form.table_61, head.value)

        if tax_payable is not None:
            self._log_override(f"6.1.{head.value}", "tax_payable", row.tax_payable, tax_payable)
            row.tax_payable = tax_payable
        if tax_paid_in_cash is not None:
            self._log_override(f"6.1.{head.value}", "tax_paid_in_cash", row.tax_paid_in_cash, tax_paid_in_cash)
            row.tax_paid_in_cash = tax_paid_in_cash
        if late_fee is not None:
            self._log_override(f"6.1.{head.value}", "late_fee", row.late_fee, late_fee)
            row.late_fee = late_fee

    def interactive_override(self):
        """Interactive CLI for manual adjustments."""
        print("\n" + "=" * 60)
        print("GSTR-3B MANUAL OVERRIDE INTERFACE")
        print("=" * 60)
        print("Current form values:")
        print(json.dumps(self.form.to_dict(), indent=2))
        print("=" * 60)

        print("\nSelect table to override:")
        print("1. Table 3.1 (Outward/RCM supplies)")
        print("2. Table 4 (ITC)")
        print("3. Table 5.1 (Exempt supplies)")
        print("4. Table 6.1 (Payment of tax)")
        print("5. Skip overrides")

        choice = input("\nEnter choice (1-5): ").strip()

        if choice == "1":
            self._interactive_table_31()
        elif choice == "2":
            self._interactive_table_4()
        elif choice == "3":
            self._interactive_table_51()
        elif choice == "4":
            self._interactive_table_61()
        elif choice == "5":
            print("Skipping overrides.")
        else:
            print("Invalid choice. Skipping overrides.")

    def _interactive_table_31(self):
        print("\n--- Table 3.1 Override ---")
        print("Select row:")
        print("1. 3.1(a) Outward taxable supplies")
        print("2. 3.1(b) Outward zero rated")
        print("3. 3.1(c) Nil rated/exempt")
        print("4. 3.1(d) Inward reverse charge")
        print("5. 3.1(e) Non-GST outward supplies")

        row_choice = input("Enter row (1-5): ").strip()
        row_map = {
            "1": "3.1(a)", "2": "3.1(b)", "3": "3.1(c)", "4": "3.1(d)", "5": "3.1(e)"
        }

        if row_choice not in row_map:
            print("Invalid selection.")
            return

        row_key = row_map[row_choice]
        attr_map = {
            "3.1(a)": "outward_taxable_supplies",
            "3.1(b)": "outward_zero_rated",
            "3.1(c)": "outward_nil_exempt",
            "3.1(d)": "inward_reverse_charge",
            "3.1(e)": "outward_non_gst"
        }
        current_row = getattr(self.form.table_31, attr_map[row_key])

        print(f"\nEnter new values for {row_key} (press Enter to keep current):")
        tv = input(f"Taxable value [{current_row.taxable_value}]: ").strip()
        tax_vals = {}
        for head in TAX_HEADS:
            current = getattr(current_row.tax, head.value)
            val = input(f"  {head.value.upper()} [{current}]: ").strip()
            if val:
                tax_vals[head.value] = Decimal(val)

        if tv or tax_vals:
            new_tax = current_row.tax
            if tax_vals:
                new_tax = TaxComponent(**{
                    h.value: Decimal(str(tax_vals.get(h.value, getattr(current_row.tax, h.value))))
                    for h in TAX_HEADS
                })
            self.update_table_31_row(
                row_key,
                taxable_value=Decimal(tv) if tv else None,
                tax=new_tax if tax_vals else None
            )
            print("Updated successfully.")

    def _interactive_table_4(self):
        print("\n--- Table 4 Override ---")
        print("Select field:")
        print("1. 4A ITC Available")
        print("2. 4D(1) Ineligible ITC")

        field_choice = input("Enter choice (1-2): ").strip()

        if field_choice == "1":
            current = self.form.table_4.itc_available
            print("Enter new ITC Available values:")
            vals = {}
            for head in TAX_HEADS:
                val = input(f"  {head.value.upper()} [{getattr(current, head.value)}]: ").strip()
                if val:
                    vals[head.value] = Decimal(val)
            if vals:
                new_itc = TaxComponent(**{
                    h.value: vals.get(h.value, getattr(current, h.value)) for h in TAX_HEADS
                })
                self.update_itc(itc_available=new_itc)
        elif field_choice == "2":
            current = self.form.table_4.ineligible_itc
            print("Enter new Ineligible ITC values:")
            vals = {}
            for head in TAX_HEADS:
                val = input(f"  {head.value.upper()} [{getattr(current, head.value)}]: ").strip()
                if val:
                    vals[head.value] = Decimal(val)
            if vals:
                new_itc = TaxComponent(**{
                    h.value: vals.get(h.value, getattr(current, h.value)) for h in TAX_HEADS
                })
                self.update_itc(ineligible_itc=new_itc)
        else:
            print("Invalid selection.")

    def _interactive_table_51(self):
        print("\n--- Table 5.1 Override ---")
        current = self.form.table_51
        inter = input(f"Inter-state supplies [{current.inter_state}]: ").strip()
        intra = input(f"Intra-state supplies [{current.intra_state}]: ").strip()

        self.update_table_51(
            inter_state=Decimal(inter) if inter else None,
            intra_state=Decimal(intra) if intra else None
        )
        print("Updated successfully.")

    def _interactive_table_61(self):
        print("\n--- Table 6.1 Override ---")
        print("Select tax head:")
        for i, head in enumerate(TAX_HEADS, 1):
            print(f"{i}. {head.value.upper()}")

        head_choice = input("Enter head (1-4): ").strip()
        if head_choice not in ["1", "2", "3", "4"]:
            print("Invalid selection.")
            return

        head = TAX_HEADS[int(head_choice) - 1]
        current = getattr(self.form.table_61, head.value)

        payable = input(f"Tax payable [{current.tax_payable}]: ").strip()
        cash = input(f"Tax paid in cash [{current.tax_paid_in_cash}]: ").strip()
        late = input(f"Late fee [{current.late_fee}]: ").strip()

        self.update_table_61(
            head=head,
            tax_payable=Decimal(payable) if payable else None,
            tax_paid_in_cash=Decimal(cash) if cash else None,
            late_fee=Decimal(late) if late else None
        )
        print("Updated successfully.")

    def _log_override(self, table: str, field: str, old_val: Any, new_val: Any):
        self.overrides_log.append({
            "table": table,
            "field": field,
            "old_value": str(old_val),
            "new_value": str(new_val)
        })

    def get_override_log(self) -> list:
        return self.overrides_log


# =============================================================================
# GSTR-3B DRAFTER
# =============================================================================

class GSTR3BDrafter:
    """
    Main orchestrator for GSTR-3B drafting.
    Coordinates calculation, overrides, and output generation.
    """

    def __init__(self, gstin: str, return_period: str):
        self.form = GSTR3BForm(gstin=gstin, return_period=return_period)
        self.calculator = GSTR3BCalculator()
        self.override_manager = OverrideManager(self.form)

    def load_reconciliation_data(self, reconciliation: ReconciliationResult):
        """Load ITC data from reconciliation result."""
        self.form.table_4.itc_available = reconciliation.to_tax_component()

    def set_liability(self, table_31: Table31Data):
        """Set outward supply liability data."""
        self.form.table_31 = table_31

    def set_exempt_supplies(self, table_51: Table51Data):
        """Set exempt/nil-rated supply data."""
        self.form.table_51 = table_51

    def calculate(self):
        """
        Execute main calculation pipeline with Section 49(5) sequencing.
        """
        total_liability = self.form.table_31.total_liability()
        net_itc = self.form.table_4.net_itc()

        net_payable, excess_itc, itc_utilized = self.calculator.compute_net_payable(
            total_liability, net_itc
        )

        self.form.table_61 = self.calculator.build_table_61(
            total_liability, net_payable, itc_utilized
        )
        self.form.excess_itc_carried_forward = excess_itc

    def apply_overrides(self, interactive: bool = False):
        """Apply manual overrides."""
        if interactive:
            self.override_manager.interactive_override()
        return self.override_manager

    def get_form(self) -> GSTR3BForm:
        return self.form

    def export_json(self, filepath: Optional[str] = None) -> str:
        """Export form to JSON."""
        json_str = self.form.to_json()
        if filepath:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(json_str)
        return json_str

    def generate_summary(self) -> str:
        """Generate human-readable summary."""
        lines = [
            "GSTR-3B DRAFT SUMMARY",
            "=" * 50,
            f"GSTIN: {self.form.gstin}",
            f"Return Period: {self.form.return_period}",
            "",
            "TABLE 3.1: LIABILITY",
            "-" * 30,
        ]

        t31 = self.form.table_31.to_dict()
        for key in ["3.1(a)", "3.1(b)", "3.1(c)", "3.1(d)", "3.1(e)"]:
            row = t31[key]
            lines.append(f"{key}: Taxable Value = {row['taxable_value']}")
            if key != "3.1(e)":
                for head, val in row['tax'].items():
                    lines.append(f"  {head.upper()}: {val}")

        lines.extend([
            f"\nTotal Liability: {t31['total_liability']}",
            "",
            "TABLE 4: ITC",
            "-" * 30,
            f"ITC Available: {self.form.table_4.itc_available.to_dict()}",
            f"Ineligible: {self.form.table_4.ineligible_itc.to_dict()}",
            f"Net ITC: {self.form.table_4.net_itc().to_dict()}",
            "",
            "TABLE 6.1: PAYMENT OF TAX",
            "-" * 30,
        ])

        for head in TAX_HEADS:
            row = getattr(self.form.table_61, head.value)
            lines.append(f"{head.value.upper()}:")
            lines.append(f"  Gross Payable : {row.tax_payable}")
            lines.append(f"  Paid via ITC  : {row.tax_paid_through_itc}")
            lines.append(f"  Paid in Cash  : {row.tax_paid_in_cash}")

        lines.extend([
            "",
            "EXCESS ITC CARRIED FORWARD",
            "-" * 30,
        ])
        for head in TAX_HEADS:
            val = getattr(self.form.excess_itc_carried_forward, head.value)
            lines.append(f"  {head.value.upper()}: {val}")

        if self.override_manager.overrides_log:
            lines.extend([
                "",
                "MANUAL OVERRIDES APPLIED",
                "-" * 30,
            ])
            for entry in self.override_manager.overrides_log:
                lines.append(f"Table {entry['table']}, Field {entry['field']}: "
                           f"{entry['old_value']} -> {entry['new_value']}")

        return "\n".join(lines)


# =============================================================================
# FACTORY & EXAMPLES
# =============================================================================

class GSTR3BFactory:
    """Factory for creating common GSTR-3B scenarios."""

    @staticmethod
    def create_sample_reconciliation() -> ReconciliationResult:
        return ReconciliationResult(
            eligible_igst=Decimal("30000.00"),
            eligible_cgst=Decimal("8000.00"),
            eligible_sgst=Decimal("5000.00"),
            eligible_cess=Decimal("1000.00")
        )

    @staticmethod
    def create_sample_liability() -> Table31Data:
        t31 = Table31Data()
        t31.outward_taxable_supplies = Table31Row(
            description="(a) Outward taxable supplies",
            taxable_value=Decimal("200000.00"),
            tax=TaxComponent(
                igst=Decimal("18000.00"),
                cgst=Decimal("10000.00"),
                sgst=Decimal("10000.00"),
                cess=Decimal("200.00")
            )
        )
        t31.inward_reverse_charge = Table31Row(
            description="(d) Inward reverse charge",
            taxable_value=Decimal("50000.00"),
            tax=TaxComponent(
                igst=Decimal("9000.00"),
                cgst=Decimal("2500.00"),
                sgst=Decimal("2500.00"),
                cess=Decimal("0.00")
            )
        )
        t31.outward_non_gst = Table31Row(
            description="(e) Non-GST outward supplies",
            taxable_value=Decimal("25000.00"),
            tax=TaxComponent()
        )
        return t31

    @staticmethod
    def create_red_zone_scenario() -> Tuple[ReconciliationResult, Table31Data]:
        """RED ZONE Scenario: High liability, limited ITC."""
        reconciliation = ReconciliationResult(
            eligible_igst=Decimal("30000.00"),
            eligible_cgst=Decimal("8000.00"),
            eligible_sgst=Decimal("5000.00"),
            eligible_cess=Decimal("100.00")
        )

        liability = Table31Data()
        liability.outward_taxable_supplies = Table31Row(
            description="(a) Outward taxable supplies",
            taxable_value=Decimal("150000.00"),
            tax=TaxComponent(
                igst=Decimal("18000.00"),
                cgst=Decimal("9000.00"),
                sgst=Decimal("9000.00"),
                cess=Decimal("200.00")
            )
        )
        liability.inward_reverse_charge = Table31Row(
            description="(d) Inward reverse charge",
            taxable_value=Decimal("35000.00"),
            tax=TaxComponent(
                igst=Decimal("9000.00"),
                cgst=Decimal("3500.00"),
                sgst=Decimal("3500.00"),
                cess=Decimal("0.00")
            )
        )
        liability.outward_non_gst = Table31Row(
            description="(e) Non-GST outward supplies",
            taxable_value=Decimal("40000.00"),
            tax=TaxComponent()
        )

        return reconciliation, liability


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    print("GSTR-3B Drafter v1.0 - RED ZONE Focus [CA-Cleared]")
    print("=" * 50)

    print("\n[EXAMPLE 1: Programmatic Drafting]")
    print("-" * 50)

    recon, liability = GSTR3BFactory.create_red_zone_scenario()

    drafter = GSTR3BDrafter(
        gstin="29ABCDE1234F1Z5",
        return_period="032026"
    )

    drafter.load_reconciliation_data(recon)
    drafter.set_liability(liability)
    drafter.calculate()

    print("\nPre-override calculation:")
    print(drafter.generate_summary())

    print("\n[EXAMPLE 2: Interactive Overrides]")
    print("-" * 50)

    drafter.apply_overrides(interactive=True)

    print("\nPost-override calculation:")
    drafter.calculate()
    print(drafter.generate_summary())

    output_path = "gstr3b_draft.json"
    drafter.export_json(output_path)
    print(f"\nExported to: {output_path}")

    print("\nFinal JSON Output:")
    print(drafter.export_json())


if __name__ == "__main__":
    main()
