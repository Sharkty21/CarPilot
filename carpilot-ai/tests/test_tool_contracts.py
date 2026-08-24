"""Tool contract smoke tests — docstrings must warn before destructive calls."""

from __future__ import annotations

from tools.insurance_tools import update_insurance_info
from tools.maintenance_tools import delete_maintenance_record, update_maintenance_record
from tools.warranty_tools import update_warranty_info


def test_delete_docstring_requires_confirmation():
    doc = delete_maintenance_record.description or delete_maintenance_record.__doc__ or ""
    assert "confirm" in doc.lower()


def test_update_maintenance_docstring_requires_confirmation():
    doc = update_maintenance_record.description or update_maintenance_record.__doc__ or ""
    assert "confirm" in doc.lower()


def test_update_insurance_docstring_requires_confirmation():
    doc = update_insurance_info.description or update_insurance_info.__doc__ or ""
    assert "confirm" in doc.lower()


def test_update_warranty_docstring_requires_confirmation():
    doc = update_warranty_info.description or update_warranty_info.__doc__ or ""
    assert "confirm" in doc.lower()
