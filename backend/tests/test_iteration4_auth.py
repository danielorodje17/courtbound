"""
Iteration 4: Google Auth / Multi-user feature tests
Tests: unauthenticated 401s, auth endpoint behaviors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestAuthEndpoints:
    """Auth endpoint tests - no session"""

    def test_auth_me_returns_401_without_session(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401
        data = resp.json()
        assert data.get("detail") == "Not authenticated"

    def test_auth_session_missing_session_id_returns_400(self):
        resp = requests.post(f"{BASE_URL}/api/auth/session", json={})
        assert resp.status_code == 400
        data = resp.json()
        assert "session_id" in data.get("detail", "").lower()

    def test_auth_logout_returns_200_without_session(self):
        resp = requests.post(f"{BASE_URL}/api/auth/logout")
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data


class TestProtectedEndpoints:
    """All user-data endpoints should return 401 without auth"""

    def test_dashboard_stats_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 401

    def test_my_colleges_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/my-colleges")
        assert resp.status_code == 401

    def test_profile_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 401

    def test_colleges_directory_is_public(self):
        """GET /api/colleges should be public (no auth needed)"""
        resp = requests.get(f"{BASE_URL}/api/colleges")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_dashboard_alerts_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        assert resp.status_code == 401

    def test_emails_returns_401(self):
        """GET /api/emails should require auth"""
        resp = requests.get(f"{BASE_URL}/api/emails")
        assert resp.status_code == 401
