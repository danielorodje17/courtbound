"""
Iteration 6: Test new features - Export CSV/PDF (client-side), Email Templates API, Coach Call Notes API
All endpoints should return 401 without auth
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTemplatesAPI:
    """Email Template Library endpoints - auth protected"""

    def test_get_templates_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/templates")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: GET /api/templates returns 401 without auth")

    def test_post_templates_requires_auth(self):
        resp = requests.post(f"{BASE_URL}/api/templates", json={"name": "Test", "subject": "Subj", "body": "Body"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: POST /api/templates returns 401 without auth")

    def test_delete_template_requires_auth(self):
        resp = requests.delete(f"{BASE_URL}/api/templates/000000000000000000000001")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: DELETE /api/templates/{id} returns 401 without auth")


class TestCallNotesAPI:
    """Coach Call Notes per college - auth protected"""

    def test_add_call_note_requires_auth(self):
        resp = requests.post(f"{BASE_URL}/api/my-colleges/test_college_id/call-note",
                             json={"date": "2026-02-01", "text": "Test note"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: POST /api/my-colleges/{id}/call-note returns 401 without auth")

    def test_delete_call_note_requires_auth(self):
        resp = requests.delete(f"{BASE_URL}/api/my-colleges/test_college_id/call-note/test_note_id")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: DELETE /api/my-colleges/{id}/call-note/{note_id} returns 401 without auth")
