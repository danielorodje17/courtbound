"""
Tests for:
1. GET /dashboard/heatmap - heatmap endpoint structure
2. GET /colleges - should return 274 colleges
3. Euro Friendly badge spot checks
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://b-ball-pathway.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = "test_session_heatmap_1776356925"

AUTH_HEADERS = {"Authorization": f"Bearer {SESSION_TOKEN}"}


class TestHeatmapEndpoint:
    """Tests for GET /api/dashboard/heatmap"""

    def test_heatmap_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap")
        assert r.status_code == 401, f"Expected 401 but got {r.status_code}"
        print("PASS: heatmap requires auth")

    def test_heatmap_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap", headers=AUTH_HEADERS)
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        print("PASS: heatmap returns 200")

    def test_heatmap_response_structure(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap", headers=AUTH_HEADERS)
        assert r.status_code == 200
        data = r.json()
        for field in ["weeks", "max_count", "total_emails", "active_days", "streak"]:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: all required fields present. max_count={data['max_count']}, total_emails={data['total_emails']}, streak={data['streak']}")

    def test_heatmap_weeks_count(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap", headers=AUTH_HEADERS)
        assert r.status_code == 200
        data = r.json()
        weeks = data["weeks"]
        # Should have ~52 weeks (52)
        assert len(weeks) == 52, f"Expected 52 weeks, got {len(weeks)}"
        print(f"PASS: 52 weeks returned")

    def test_heatmap_week_structure(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap", headers=AUTH_HEADERS)
        data = r.json()
        week = data["weeks"][0]
        assert "week_start" in week
        assert "days" in week
        assert len(week["days"]) == 7, f"Expected 7 days per week, got {len(week['days'])}"
        day = week["days"][0]
        assert "date" in day
        assert "count" in day
        assert "day_of_week" in day
        print("PASS: week structure correct")

    def test_heatmap_numeric_fields(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/heatmap", headers=AUTH_HEADERS)
        data = r.json()
        assert isinstance(data["max_count"], int)
        assert isinstance(data["total_emails"], int)
        assert isinstance(data["active_days"], int)
        assert isinstance(data["streak"], int)
        assert data["max_count"] >= 1, "max_count should be >= 1"
        print("PASS: numeric fields valid")


class TestCollegesCount:
    """Tests for GET /api/colleges - should return 274 colleges"""

    def test_colleges_total_count(self):
        r = requests.get(f"{BASE_URL}/api/colleges?limit=300")
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}"
        data = r.json()
        # Response may be list or dict with items
        if isinstance(data, list):
            count = len(data)
        elif isinstance(data, dict):
            count = data.get("total") or len(data.get("colleges", data.get("items", [])))
        else:
            count = 0
        print(f"Colleges count: {count}")
        assert count == 274, f"Expected 274 colleges, got {count}"
        print("PASS: 274 colleges returned")

    def test_nebraska_kearney_not_foreign_friendly(self):
        r = requests.get(f"{BASE_URL}/api/colleges?limit=300")
        assert r.status_code == 200
        data = r.json()
        colleges = data if isinstance(data, list) else data.get("colleges", data.get("items", []))
        match = [c for c in colleges if "Kearney" in c.get("name", "") or "Nebraska-Kearney" in c.get("name", "")]
        assert len(match) > 0, "Nebraska-Kearney not found in colleges"
        college = match[0]
        print(f"Nebraska-Kearney: foreign_friendly={college.get('foreign_friendly')}, euro_friendly={college.get('euro_friendly')}")
        ff = college.get("foreign_friendly") or college.get("euro_friendly")
        assert ff is False or ff is None or ff == 0, f"Nebraska-Kearney should NOT be foreign_friendly, got {ff}"
        print("PASS: Nebraska-Kearney foreign_friendly=false")

    def test_cowley_county_is_foreign_friendly(self):
        r = requests.get(f"{BASE_URL}/api/colleges?limit=300")
        assert r.status_code == 200
        data = r.json()
        colleges = data if isinstance(data, list) else data.get("colleges", data.get("items", []))
        match = [c for c in colleges if "Cowley" in c.get("name", "")]
        assert len(match) > 0, "Cowley County not found in colleges"
        college = match[0]
        print(f"Cowley County: foreign_friendly={college.get('foreign_friendly')}, euro_friendly={college.get('euro_friendly')}")
        ff = college.get("foreign_friendly") or college.get("euro_friendly")
        assert ff is True or ff == 1, f"Cowley County should be foreign_friendly=true, got {ff}"
        print("PASS: Cowley County foreign_friendly=true")
