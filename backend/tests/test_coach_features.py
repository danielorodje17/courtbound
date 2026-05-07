"""Tests for Coach Public Page, Analytics, and Landing Page APIs"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture
def coach_token():
    """Login as test coach and return bearer token"""
    resp = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": "testcoach@courtbound.edu",
        "password": "coach1234"
    })
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("token") or data.get("access_token") or data.get("session_token")
        return token
    pytest.skip(f"Coach login failed: {resp.status_code} {resp.text}")


# ── Public Programme Page API ──────────────────────────────────────────────────

class TestCoachPublicAPI:
    """GET /api/coach/public/:slug - no auth required"""

    def test_public_page_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_public_page_coach_name(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("coach_name") == "Test Coach", f"coach_name mismatch: {data.get('coach_name')}"

    def test_public_page_institution_name(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("institution_name") == "Test University", f"institution_name: {data.get('institution_name')}"

    def test_public_page_recruiting_prefs_positions(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        assert resp.status_code == 200
        data = resp.json()
        prefs = data.get("recruiting_prefs", {})
        positions = prefs.get("positions", [])
        assert "SG" in positions, f"Expected SG in positions: {positions}"

    def test_public_page_404_for_nonexistent(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/nonexistent-school-xyz-999")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

    def test_public_page_no_auth_required(self):
        """No Authorization header - should still work"""
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university",
                            headers={"Authorization": ""})
        assert resp.status_code == 200

    def test_public_page_response_structure(self):
        resp = requests.get(f"{BASE_URL}/api/coach/public/test-university")
        assert resp.status_code == 200
        data = resp.json()
        for field in ["coach_name", "institution_name", "recruiting_prefs", "is_verified"]:
            assert field in data, f"Missing field: {field}"
        assert data["is_verified"] is True


# ── Coach Analytics API ───────────────────────────────────────────────────────

class TestCoachAnalyticsAPI:
    """GET /api/coach/analytics - auth required"""

    def test_analytics_returns_200(self, coach_token):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics",
                            headers={"Authorization": f"Bearer {coach_token}"})
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text}"

    def test_analytics_views_structure(self, coach_token):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics",
                            headers={"Authorization": f"Bearer {coach_token}"})
        assert resp.status_code == 200
        data = resp.json()
        views = data.get("views", {})
        for k in ["all_time", "last_7d", "last_30d"]:
            assert k in views, f"Missing views.{k}"
            assert isinstance(views[k], int)

    def test_analytics_saves_structure(self, coach_token):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics",
                            headers={"Authorization": f"Bearer {coach_token}"})
        assert resp.status_code == 200
        data = resp.json()
        saves = data.get("saves", {})
        assert "total" in saves
        assert "by_list" in saves
        assert isinstance(saves["total"], int)

    def test_analytics_daily_views_14_entries(self, coach_token):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics",
                            headers={"Authorization": f"Bearer {coach_token}"})
        assert resp.status_code == 200
        data = resp.json()
        daily = data.get("daily_views", [])
        assert len(daily) == 14, f"Expected 14 daily_views entries, got {len(daily)}"

    def test_analytics_messages_sent(self, coach_token):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics",
                            headers={"Authorization": f"Bearer {coach_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "messages_sent" in data
        assert isinstance(data["messages_sent"], int)

    def test_analytics_no_auth_rejected(self):
        resp = requests.get(f"{BASE_URL}/api/coach/analytics")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
