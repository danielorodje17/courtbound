"""
Backend tests for Coach Onboarding Sequence (Phase 3, Item #3)
Tests: coach login, profile reset, onboarding_steps tracking, PATCH /api/coach/auth/profile
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.text}"
    data = r.json()
    assert "token" in data
    assert "coach" in data
    return data["token"]


@pytest.fixture(scope="module")
def coach_id(coach_token):
    r = requests.get(f"{BASE_URL}/api/coach/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
    assert r.status_code == 200
    return r.json()["id"]


# ── Auth Tests ────────────────────────────────────────────────────────────────

class TestCoachAuth:
    """Coach login and profile endpoint tests"""

    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "coach" in data
        assert data["coach"]["email"] == COACH_EMAIL
        assert data["coach"]["verification_status"] == "verified"

    def test_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_get_me(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == COACH_EMAIL
        # Sensitive fields should not be exposed
        assert "password_hash" not in data
        assert "session_token" not in data

    def test_me_without_token(self):
        r = requests.get(f"{BASE_URL}/api/coach/auth/me")
        assert r.status_code == 401


# ── Onboarding Reset Tests ────────────────────────────────────────────────────

class TestOnboardingReset:
    """Tests for PATCH /api/coach/auth/profile to reset onboarding state"""

    def test_reset_onboarding_state(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"onboarding_completed": False, "onboarding_steps": {}},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("onboarding_completed") in (False, None, "")
        assert data.get("onboarding_steps") == {} or data.get("onboarding_steps") is None

    def test_set_onboarding_step_prefs_set(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"onboarding_steps": {"prefs_set": True}},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["onboarding_steps"]["prefs_set"] is True

    def test_set_onboarding_step_search_done(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"onboarding_steps": {"prefs_set": True, "search_done": True}},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["onboarding_steps"]["search_done"] is True

    def test_set_onboarding_completed(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"onboarding_completed": True},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("onboarding_completed") is True

    def test_patch_no_valid_fields(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"invalid_field": "value"},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 400

    def test_final_reset_for_ui_tests(self, coach_token):
        """Reset to clean state for UI testing"""
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"onboarding_completed": False, "onboarding_steps": {}},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        # Verify reset via GET
        r2 = requests.get(f"{BASE_URL}/api/coach/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
        assert r2.status_code == 200
        data = r2.json()
        assert data.get("onboarding_completed") in (False, None)
        print(f"Reset state: onboarding_completed={data.get('onboarding_completed')}, steps={data.get('onboarding_steps')}")


# ── Recruiting Preferences Tests ──────────────────────────────────────────────

class TestRecruitingPrefs:
    """Tests for updating recruiting preferences via PATCH /api/coach/auth/profile"""

    def test_update_recruiting_prefs(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/profile",
            json={"recruiting_prefs": {"positions": ["PG", "SG"], "grad_years": ["2026", "2027"]}},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        prefs = data.get("recruiting_prefs", {})
        assert "PG" in prefs.get("positions", [])


# ── Player Search Endpoint ────────────────────────────────────────────────────

class TestPlayerSearch:
    """Tests for GET /api/coach/players"""

    def test_players_list_returns_data(self, coach_token):
        r = requests.get(
            f"{BASE_URL}/api/coach/players?sort=match&limit=6",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "players" in data
        assert isinstance(data["players"], list)

    def test_player_search_by_query(self, coach_token):
        r = requests.get(
            f"{BASE_URL}/api/coach/players?search=player&sort=match&limit=6",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "players" in data
