"""
Backend tests for CourtBound Supabase rewrite - Phase 3
Tests all critical endpoints as specified in the review request
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_EMAIL = "admin@courtbound.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    token = resp.json().get("token")
    assert token, "No token in response"
    return token


@pytest.fixture(scope="module")
def college_ids():
    resp = requests.get(f"{BASE_URL}/api/colleges")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    return [data[0]["id"], data[1]["id"]]


# 1. GET /api/colleges
class TestColleges:
    def test_get_colleges_returns_list(self):
        resp = requests.get(f"{BASE_URL}/api/colleges")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: GET /api/colleges returned {len(data)} colleges")

    def test_colleges_have_coaches_array(self):
        resp = requests.get(f"{BASE_URL}/api/colleges")
        assert resp.status_code == 200
        data = resp.json()
        college = data[0]
        assert "coaches" in college, "colleges should have embedded coaches array"
        assert isinstance(college["coaches"], list)
        print(f"PASS: colleges have embedded coaches array")

    def test_colleges_division_filter(self):
        resp = requests.get(f"{BASE_URL}/api/colleges", params={"division": "Division I"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        for c in data:
            assert c.get("division") == "Division I", f"Expected Division I, got {c.get('division')}"
        print(f"PASS: division filter returned {len(data)} colleges all Division I")


# 2. Admin Login/Verify/Logout
class TestAdminAuth:
    def test_admin_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"PASS: Admin login returned token")

    def test_admin_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": "wrongpassword"})
        assert resp.status_code == 401
        print("PASS: Admin login with wrong password returns 401")

    def test_admin_verify_with_token(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/verify", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("valid") == True
        print(f"PASS: Admin verify returned valid=True")

    def test_admin_verify_no_token(self):
        resp = requests.get(f"{BASE_URL}/api/admin/verify")
        assert resp.status_code == 401
        print("PASS: Admin verify without token returns 401")

    def test_admin_logout(self, admin_token):
        # Login fresh to get a separate token for logout test
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        logout_token = resp.json()["token"]

        # Logout
        resp2 = requests.post(f"{BASE_URL}/api/admin/logout", headers={"Authorization": f"Bearer {logout_token}"})
        assert resp2.status_code == 200

        # Verify the token is now invalid
        resp3 = requests.get(f"{BASE_URL}/api/admin/verify", headers={"Authorization": f"Bearer {logout_token}"})
        assert resp3.status_code == 401
        print("PASS: Admin logout invalidates token, subsequent verify returns 401")


# 3. Admin Stats
class TestAdminStats:
    def test_admin_stats(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "total_users" in data
        assert "total_emails" in data
        assert "total_tracked" in data
        assert isinstance(data["total_users"], int)
        assert isinstance(data["total_emails"], int)
        assert isinstance(data["total_tracked"], int)
        print(f"PASS: Admin stats: users={data['total_users']}, emails={data['total_emails']}, tracked={data['total_tracked']}")


# 4. Admin Users
class TestAdminUsers:
    def test_admin_users_list(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: Admin users returned {len(data)} users")


# 5. Colleges Compare (requires auth)
class TestCollegesCompare:
    def test_compare_requires_auth(self, college_ids):
        resp = requests.get(f"{BASE_URL}/api/colleges/compare", params={"ids": ",".join(college_ids)})
        assert resp.status_code == 401
        print("PASS: /api/colleges/compare requires auth, returns 401")


# 6. Dashboard Stats - requires user auth
class TestDashboard:
    def test_dashboard_stats_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert resp.status_code == 401
        print("PASS: /api/dashboard/stats requires auth, returns 401")


# 7. Admin Settings
class TestAdminSettings:
    def test_admin_settings(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/settings", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "key" in data or "show_european" in data
        print(f"PASS: Admin settings: {data}")
