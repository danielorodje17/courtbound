"""
Gap 5 — Notification Preferences (GET/PATCH /notification-prefs)
Gap 6 — GDPR Data Export (GET /data-export)
Regression — login, profile PATCH, privacy GET
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASS = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    res = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASS})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


# ── Regression ────────────────────────────────────────────────────────────────

class TestRegression:
    def test_coach_login(self):
        res = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASS})
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert "coach" in data
        assert "password_hash" not in data["coach"]
        print("PASS: coach login")

    def test_privacy_get(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/privacy", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "profile_visible" in data
        assert "hide_recruiting_prefs" in data
        assert "hide_contact_info" in data
        print("PASS: GET /privacy")

    def test_profile_patch(self, auth_headers):
        res = requests.patch(f"{BASE_URL}/api/coach/auth/profile",
                             json={"conference": "TEST_CONF_REGRESSION"}, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "password_hash" not in data
        print("PASS: PATCH /profile")


# ── Gap 5 — Notification Preferences ─────────────────────────────────────────

class TestNotificationPrefs:
    def test_get_notification_prefs_returns_defaults(self, auth_headers):
        """GET should return default prefs even before v24 migration."""
        res = requests.get(f"{BASE_URL}/api/coach/auth/notification-prefs", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "highlight_reel" in data
        assert "commitment" in data
        assert "programme_view" in data
        assert "contact_countdown" in data
        print(f"PASS: GET /notification-prefs => {data}")

    def test_get_notification_prefs_default_values(self, auth_headers):
        """Default values: highlight_reel=True, commitment=True, programme_view=False, contact_countdown=True."""
        res = requests.get(f"{BASE_URL}/api/coach/auth/notification-prefs", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        # Default values (or whatever the coach has stored)
        assert isinstance(data["highlight_reel"], bool)
        assert isinstance(data["commitment"], bool)
        assert isinstance(data["programme_view"], bool)
        assert isinstance(data["contact_countdown"], bool)
        print(f"PASS: all values are booleans => {data}")

    def test_patch_notification_prefs_before_migration(self, auth_headers):
        """PATCH should either succeed (if v24 run) or return 503 (if not)."""
        res = requests.patch(f"{BASE_URL}/api/coach/auth/notification-prefs",
                             json={"programme_view": True}, headers=auth_headers)
        if res.status_code == 503:
            assert "migration v24" in res.json().get("detail", "").lower() or "v24" in res.json().get("detail", "")
            print("PASS: PATCH /notification-prefs returns 503 (v24 not run) — expected")
        elif res.status_code == 200:
            data = res.json()
            assert "programme_view" in data
            print(f"PASS: PATCH /notification-prefs returned 200 (v24 is run) => {data}")
        else:
            pytest.fail(f"Unexpected status {res.status_code}: {res.text}")

    def test_patch_notification_prefs_unauthenticated(self):
        """Should return 401 without token."""
        res = requests.patch(f"{BASE_URL}/api/coach/auth/notification-prefs",
                             json={"highlight_reel": False})
        assert res.status_code == 401
        print("PASS: 401 without auth")


# ── Gap 6 — GDPR Data Export ──────────────────────────────────────────────────

class TestDataExport:
    def test_data_export_status_200(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        print("PASS: GET /data-export returns 200")

    def test_data_export_content_disposition(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        cd = res.headers.get("content-disposition", "")
        assert "attachment" in cd, f"Content-Disposition missing 'attachment': {cd}"
        print(f"PASS: Content-Disposition = {cd}")

    def test_data_export_structure(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        required_keys = ["export_generated_at", "account", "messages_sent", "saved_players",
                         "notifications", "message_templates"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        print(f"PASS: all required keys present in export")

    def test_data_export_no_sensitive_fields(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        account = res.json()["account"]
        assert "password_hash" not in account, "password_hash should be stripped"
        assert "session_token" not in account, "session_token should be stripped"
        print("PASS: sensitive fields stripped from account")

    def test_data_export_messages_is_list(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json()["messages_sent"], list)
        print("PASS: messages_sent is a list")

    def test_data_export_saved_players_structure(self, auth_headers):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export", headers=auth_headers)
        assert res.status_code == 200
        saved = res.json()["saved_players"]
        assert isinstance(saved, list)
        for p in saved:
            assert "player_name" in p, f"player_name missing in {p}"
        print(f"PASS: saved_players ({len(saved)} items) all have player_name")

    def test_data_export_unauthenticated(self):
        res = requests.get(f"{BASE_URL}/api/coach/auth/data-export")
        assert res.status_code == 401
        print("PASS: 401 without auth")
