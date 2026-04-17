"""
Admin system tests: login, stats, users, subscription tier change
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
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminLogin:
    def test_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert resp.status_code == 401
        assert "Invalid credentials" in resp.json().get("detail", "")

    def test_login_wrong_email(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": "notadmin@example.com", "password": ADMIN_PASSWORD})
        assert resp.status_code == 401

    def test_login_missing_fields(self):
        resp = requests.post(f"{BASE_URL}/api/admin/login", json={"email": "", "password": ""})
        assert resp.status_code == 400


class TestAdminStats:
    def test_stats_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 401

    def test_stats_returns_data(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "subscriptions" in data
        assert "emails" in data
        assert "colleges_tracked" in data
        assert "top_colleges" in data
        assert "signup_trend" in data
        assert "email_trend" in data

    def test_stats_user_fields(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        data = resp.json()
        users = data["users"]
        assert "total" in users
        assert "active_7d" in users
        assert isinstance(users["total"], int)


class TestAdminUsers:
    def test_users_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 401

    def test_users_returns_list(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_users_fields(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        data = resp.json()
        if len(data) > 0:
            user = data[0]
            assert "user_id" in user
            assert "email" in user
            assert "subscription_tier" in user
            assert "emails_sent" in user
            assert "colleges_tracked" in user


class TestAdminSubscription:
    def test_invalid_token(self):
        resp = requests.patch(f"{BASE_URL}/api/admin/users/someuser/subscription",
                              json={"subscription_tier": "pro"},
                              headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401

    def test_invalid_tier(self, auth_headers):
        resp = requests.patch(f"{BASE_URL}/api/admin/users/testuser/subscription",
                              json={"subscription_tier": "premium"},
                              headers=auth_headers)
        assert resp.status_code == 400

    def test_verify_endpoint(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/verify", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["authenticated"] is True
        assert data["email"] == ADMIN_EMAIL
