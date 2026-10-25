import unittest
import json
import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ehr_service import get_student_profile, get_clinical_context, load_student_record

class TestEHRService(unittest.TestCase):
    def test_tc1_auth_and_context_injection(self):
        profile = get_student_profile("STU-88219")
        self.assertEqual(profile["student_id"], "STU-88219")
        self.assertEqual(profile["name"], "Alex Taylor")
        self.assertEqual(profile["date_of_birth"], "2004-05-14")
        self.assertIn("Iron deficiency anemia (managed)", profile["medical_history"])

        context = get_clinical_context("STU-88219")
        self.assertIn("STU-88219", context)
        self.assertIn("Alex Taylor", context)
        self.assertIn("2026-02-10", context)
        self.assertIn("Complete Blood Count", context)
        self.assertIn("11 ng/mL", context)

    def test_mock_record_structure(self):
        record = load_student_record()
        self.assertIn("student_id", record)
        self.assertIn("recent_labs", record)
        self.assertEqual(len(record["recent_labs"]), 1)
        self.assertEqual(record["recent_labs"][0]["findings"], "Low serum ferritin (11 ng/mL, reference 20-200), mild microcytic anemia indicated.")

if __name__ == '__main__':
    unittest.main()
