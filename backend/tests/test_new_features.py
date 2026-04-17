"""
Tests for new features:
- Admin user activity detail
- College reports (submit, list)
- Admin reports (list, update/respond)
- Notifications
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin token fixture
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@courtbound.com",
        "password": "admin123"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="module")
def first_user_id(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    users = r.json()
    if not users:
        pytest.skip("No users in DB")
    return users[0]["user_id"]


# ── Admin Users Tab ──────────────────────────────────────────────────────────

class TestAdminUsersList:
    def test_list_users_returns_200(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_list_users_has_expected_fields(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        data = r.json()
        if data:
            u = data[0]
            for field in ["user_id", "name", "email", "emails_sent", "colleges_tracked", "subscription_tier"]:
                assert field in u, f"Missing field: {field}"


class TestAdminUserActivity:
    def test_activity_returns_200(self, admin_headers, first_user_id):
        r = requests.get(f"{BASE_URL}/api/admin/users/{first_user_id}/activity", headers=admin_headers)
        assert r.status_code == 200

    def test_activity_structure(self, admin_headers, first_user_id):
        r = requests.get(f"{BASE_URL}/api/admin/users/{first_user_id}/activity", headers=admin_headers)
        data = r.json()
        for key in ["user", "profile", "stats", "recent_emails", "tracked_colleges"]:
            assert key in data, f"Missing key: {key}"

    def test_activity_stats_fields(self, admin_headers, first_user_id):
        r = requests.get(f"{BASE_URL}/api/admin/users/{first_user_id}/activity", headers=admin_headers)
        stats = r.json()["stats"]
        for field in ["emails_sent", "emails_received", "reply_rate", "colleges_tracked", "positive_replies"]:
            assert field in stats, f"Missing stat: {field}"

    def test_activity_404_for_invalid_user(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/users/nonexistent_user_id_xyz/activity", headers=admin_headers)
        assert r.status_code == 404


# ── College Reports ──────────────────────────────────────────────────────────

# We need an authenticated user token for this.  Use the player app session approach.
@pytest.fixture(scope="module")
def user_auth_headers():
    """
    Try to get a user JWT token. Since the app uses Google OAuth we can't
    easily get a real token here. Skip these tests if no token available.
    """
    # Check if there is a test endpoint or stored token
    token = os.environ.get("TEST_USER_TOKEN", "")
    if not token:
        pytest.skip("No TEST_USER_TOKEN env var — skipping user-auth tests")
    return {"Authorization": f"Bearer {token}"}


class TestCollegeReports:
    def test_submit_report_without_auth_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/reports/college", json={
            "college_id": "test_id",
            "issue_type": "Wrong email address"
        })
        assert r.status_code in [401, 403]

    def test_get_my_reports_without_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/reports/my")
        assert r.status_code in [401, 403]


# ── Admin Reports ────────────────────────────────────────────────────────────

class TestAdminReports:
    def test_admin_get_reports_returns_200(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_admin_reports_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/reports")
        assert r.status_code == 401

    def test_admin_patch_report_invalid_status(self, admin_headers):
        """Patching with invalid status should return 400"""
        r = requests.patch(f"{BASE_URL}/api/admin/reports/nonexistent_report_id",
            json={"status": "bogus_status"}, headers=admin_headers)
        assert r.status_code == 400

    def test_admin_patch_valid_status_nonexistent(self, admin_headers):
        """Patching with valid status on non-existent report should return ok (upsert not needed)"""
        r = requests.patch(f"{BASE_URL}/api/admin/reports/nonexistent_report_id",
            json={"status": "fixed", "admin_response": ""}, headers=admin_headers)
        # MongoDB update_one on nonexistent doc returns ok=true even if no doc matched
        assert r.status_code == 200


# ── Notifications ────────────────────────────────────────────────────────────

class TestNotifications:
    def test_get_notifications_without_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/notifications")
        assert r.status_code in [401, 403]

    def test_read_all_notifications_without_auth_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/notifications/read-all")
        assert r.status_code in [401, 403]
