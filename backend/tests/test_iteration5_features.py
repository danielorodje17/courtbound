"""
Tests for Iteration 5: Dashboard Analytics, AI Match, College Checklist, Clickable Stat Cards
These endpoints require auth - we verify 401 without auth and check public endpoints work.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestNewEndpoints:
    """Test new endpoints return 401 without auth (proving they exist and are protected)"""

    def test_dashboard_analytics_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/analytics")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print(f"PASS: /api/dashboard/analytics returns 401 without auth")

    def test_ai_match_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/ai/match")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print(f"PASS: /api/ai/match returns 401 without auth")

    def test_checklist_get_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/checklist/some_college_id")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print(f"PASS: GET /api/checklist/{{id}} returns 401 without auth")

    def test_checklist_put_requires_auth(self):
        resp = requests.put(f"{BASE_URL}/api/checklist/some_college_id", json={"items": []})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print(f"PASS: PUT /api/checklist/{{id}} returns 401 without auth")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""

    def test_colleges_public(self):
        resp = requests.get(f"{BASE_URL}/api/colleges")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: /api/colleges returns {len(data)} colleges")

    def test_dashboard_stats_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 401
        print(f"PASS: /api/dashboard/stats returns 401 without auth")

    def test_my_colleges_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/my-colleges")
        assert resp.status_code == 401
        print(f"PASS: /api/my-colleges returns 401 without auth")

    def test_profile_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 401
        print(f"PASS: /api/profile returns 401 without auth")
