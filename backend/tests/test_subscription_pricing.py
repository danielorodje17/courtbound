"""
Tests for subscription/trial/pricing system and auth upsert fix (iteration 21)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

TEST_SESSION_TOKEN = "test_session_ai_99999"
TEST_USER_ID = "2df1d69f-2abd-5cb5-97e8-c2c3326ea241"

ADMIN_EMAIL = "admin@courtbound.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_headers():
    return {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}


class TestAuthMe:
    """Test /api/auth/me returns subscription_tier and trial_end_date"""

    def test_auth_me_returns_subscription_tier(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=user_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "subscription_tier" in data, "subscription_tier missing from /auth/me"
        assert data["subscription_tier"] in ("free", "trial", "basic", "premium"), \
            f"Unexpected tier: {data['subscription_tier']}"

    def test_auth_me_has_trial_end_date_field(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        # trial_end_date may be None (migration not run yet) but key should be present
        assert "trial_end_date" in data, "trial_end_date field missing from /auth/me"


class TestSubscriptionPlans:
    """Test /api/subscription/plans - graceful fallback when table missing"""

    def test_plans_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_plans_returns_dict_not_500(self):
        r = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"


class TestSubscriptionStatus:
    """Test /api/subscription/status"""

    def test_status_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/subscription/status")
        assert r.status_code == 401

    def test_status_returns_subscription_info(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/subscription/status", headers=user_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "subscription_tier" in data
        assert "trial_end_date" in data
        assert "trial_days_remaining" in data
        assert "is_trial_active" in data
        assert "effective_tier" in data

    def test_status_subscription_tier_valid(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/subscription/status", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["subscription_tier"] in ("free", "trial", "basic", "premium")


class TestSubscriptionCheckout:
    """Test /api/subscription/checkout returns coming_soon"""

    def test_checkout_basic_returns_coming_soon(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/subscription/checkout", json={"tier": "basic"}, headers=user_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "coming_soon"
        assert data.get("tier") == "basic"

    def test_checkout_premium_returns_coming_soon(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/subscription/checkout", json={"tier": "premium"}, headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "coming_soon"
        assert data.get("tier") == "premium"

    def test_checkout_invalid_tier_returns_400(self, user_headers):
        r = requests.post(f"{BASE_URL}/api/subscription/checkout", json={"tier": "enterprise"}, headers=user_headers)
        assert r.status_code == 400


class TestAdminPricing:
    """Test /api/admin/pricing returns [] gracefully when table missing"""

    def test_admin_pricing_returns_200(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/pricing", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_admin_pricing_returns_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/pricing", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_admin_update_subscription_accepts_trial_tier(self, admin_token):
        """Admin tier update endpoint should accept free/trial/basic/premium"""
        # Use test user_id
        r = requests.patch(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/subscription",
            json={"tier": "trial"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_admin_update_subscription_accepts_free_tier(self, admin_token):
        r = requests.patch(
            f"{BASE_URL}/api/admin/users/{TEST_USER_ID}/subscription",
            json={"tier": "free"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert r.status_code == 200
