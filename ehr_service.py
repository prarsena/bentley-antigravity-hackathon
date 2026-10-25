import json
import os
from typing import Dict, Any, List, Optional

def _resolve_data_path(filename: str = "mock_students.json") -> str:
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "data", filename),
        os.path.join(os.getcwd(), "data", filename),
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return os.path.join(os.getcwd(), "data", filename)

def load_all_student_records() -> List[Dict[str, Any]]:
    students_path = _resolve_data_path("mock_students.json")
    if os.path.exists(students_path):
        try:
            with open(students_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception:
            pass
    single_path = _resolve_data_path("mock_student_record.json")
    if os.path.exists(single_path):
        with open(single_path, "r", encoding="utf-8") as f:
            return [json.load(f)]
    return []

def load_student_record(student_id: Optional[str] = None) -> Dict[str, Any]:
    records = load_all_student_records()
    if not student_id:
        return records[0] if records else {}
    for r in records:
        if r.get("student_id", "").lower() == student_id.lower():
            return r
    return records[0] if records else {}

def get_all_students() -> List[Dict[str, Any]]:
    records = load_all_student_records()
    return [
        {
            "student_id": r.get("student_id"),
            "name": f"{r.get('first_name')} {r.get('last_name')}",
            "first_name": r.get("first_name"),
            "last_name": r.get("last_name"),
            "date_of_birth": r.get("date_of_birth"),
            "medical_history": r.get("medical_history", []),
            "recent_labs": r.get("recent_labs", [])
        }
        for r in records
    ]

def get_student_profile(student_id: Optional[str] = None) -> Dict[str, Any]:
    record = load_student_record(student_id)
    return {
        "student_id": record.get("student_id"),
        "name": f"{record.get('first_name')} {record.get('last_name')}",
        "first_name": record.get("first_name"),
        "last_name": record.get("last_name"),
        "date_of_birth": record.get("date_of_birth"),
        "medical_history": record.get("medical_history", []),
        "recent_labs": record.get("recent_labs", [])
    }

def get_clinical_context(student_id: Optional[str] = None) -> str:
    record = load_student_record(student_id)
    if not record:
        return "No student context available."

    full_name = f"{record.get('first_name', '')} {record.get('last_name', '')}".strip()
    med_history = record.get("medical_history", [])
    allergies = next((h for h in med_history if "allerg" in h.lower()), "None reported")
    chronic = ", ".join([h for h in med_history if "allerg" not in h.lower()]) or "None reported"

    recent_labs = record.get("recent_labs", [])
    if recent_labs:
        lab_lines = []
        for lab in recent_labs:
            test_name = lab.get("test_name")
            date = lab.get("date")
            findings = lab.get("findings")
            status = lab.get("status")
            status_str = f" ({status})" if status else ""
            lab_lines.append(f"  - {date}: {test_name}\n    - Findings: {findings}{status_str}")
        labs_str = "\n".join(lab_lines)
    else:
        labs_str = "  - No recent labs on file."

    return (
        f"### Active Student Context\n"
        f"- Student ID: {record.get('student_id')}\n"
        f"- Name: {full_name}\n"
        f"- DOB: {record.get('date_of_birth')}\n"
        f"- Known Allergies: {allergies}\n"
        f"- Chronic / Past Conditions: {chronic}\n"
        f"- Relevant Recent Lab History:\n"
        f"{labs_str}"
    ).strip()
