"""Backend tests for: Admin Coach Verification, Public Stats, Google SSO endpoints"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"email": "admin@courtbound.com", "password": "admin123"})
    if r.status_code == 200:
        return r.json().get("token")
    pytest.skip(f"Admin login failed: {r.status_code} {r.text}")


@pytest.fixture
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": "testcoach@courtbound.edu", "password": "coach1234"})
    if r.status_code == 200:
        return r.json().get("token")
    pytest.skip(f"Coach login failed: {r.status_code} {r.text}")


# ─── Feature 2: Public Stats ─────────────────────────────────────────────────

class TestPublicStats:
    """GET /api/coach/public/stats — no auth required"""

    def test_public_stats_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/stats")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_public_stats_has_required_fields(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/stats")
        assert r.status_code == 200
        data = r.json()
        assert "verified_coaches" in data, f"Missing verified_coaches, got: {data}"
        assert "active_coaches_30d" in data, f"Missing active_coaches_30d, got: {data}"
        assert "total_programmes" in data, f"Missing total_programmes, got: {data}"

    def test_public_stats_values_are_non_negative(self):
        r = requests.get(f"{BASE_URL}/api/coach/public/stats")
        data = r.json()
        assert isinstance(data["verified_coaches"], int) and data["verified_coaches"] >= 0
        assert isinstance(data["active_coaches_30d"], int) and data["active_coaches_30d"] >= 0
        assert isinstance(data["total_programmes"], int) and data["total_programmes"] >= 0

    def test_public_stats_verified_coaches_at_least_1(self):
        """Test env has testcoach@courtbound.edu which is verified"""
        r = requests.get(f"{BASE_URL}/api/coach/public/stats")
        data = r.json()
        assert data["verified_coaches"] >= 1, f"Expected >=1 verified coach, got: {data['verified_coaches']}"


# ─── Feature 1: Admin Queue ───────────────────────────────────────────────────

class TestAdminCoachQueue:
    """GET /api/coach/admin/queue — requires admin Bearer token"""

    def test_queue_returns_200_with_token(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/coach/admin/queue",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_queue_returns_401_without_token(self):
        r = requests.get(f"{BASE_URL}/api/coach/admin/queue")
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_queue_structure(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/coach/admin/queue",
                         headers={"Authorization": f"Bearer {admin_token}"})
        data = r.json()
        assert "pending" in data, f"Missing 'pending' key: {data}"
        assert "verified" in data, f"Missing 'verified' key: {data}"
        assert "stats" in data, f"Missing 'stats' key: {data}"

    def test_queue_stats_fields(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/coach/admin/queue",
                         headers={"Authorization": f"Bearer {admin_token}"})
        stats = r.json()["stats"]
        assert "total_pending" in stats
        assert "overdue" in stats
        assert "approved_week" in stats
        assert "rejected_week" in stats

    def test_verified_tab_has_test_coach(self, admin_token):
        """testcoach@courtbound.edu should appear in verified list"""
        r = requests.get(f"{BASE_URL}/api/coach/admin/queue",
                         headers={"Authorization": f"Bearer {admin_token}"})
        verified = r.json()["verified"]
        emails = [c.get("email", "").lower() for c in verified]
        assert "testcoach@courtbound.edu" in emails, f"Test coach not in verified list: {emails}"


# ─── Feature 1: Admin Verify PATCH ───────────────────────────────────────────

class TestAdminVerifyCoach:
    """PATCH /api/coach/admin/verify/{id}"""

    def test_invalid_action_returns_400(self, admin_token):
        r = requests.patch(f"{BASE_URL}/api/coach/admin/verify/fake-id",
                           json={"action": "invalid_action"},
                           headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_requires_auth(self):
        r = requests.patch(f"{BASE_URL}/api/coach/admin/verify/fake-id",
                           json={"action": "approve"})
        assert r.status_code in [401, 403]


# ─── Feature 3: Google SSO ────────────────────────────────────────────────────

class TestCoachGoogleAuth:
    """POST /api/coach/auth/google"""

    def test_missing_email_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/coach/auth/google", json={})
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_unknown_email_returns_404_with_needs_registration(self):
        r = requests.post(f"{BASE_URL}/api/coach/auth/google",
                          json={"google_email": "unknown_nobody_xyz@gmail.com", "google_name": "Test"})
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        # detail is a JSON string
        try:
            parsed = json.loads(detail)
            assert parsed.get("needs_registration") is True, f"needs_registration not True: {parsed}"
        except Exception:
            assert "needs_registration" in str(detail), f"needs_registration not in detail: {detail}"

    def test_known_coach_email_returns_token(self):
        """testcoach@courtbound.edu is a verified coach — should return token"""
        r = requests.post(f"{BASE_URL}/api/coach/auth/google",
                          json={"google_email": "testcoach@courtbound.edu", "google_name": "Test Coach"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "token" in data, f"Missing token: {data}"
        assert "coach" in data, f"Missing coach: {data}"
