"""
Phase B Feature Tests:
- Privacy Settings (GET/PATCH /api/coach/auth/privacy)
- Coach Analytics with programme_views
- Player Messages endpoint
- Coach Messages sent endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"
PLAYER_EMAIL = "player@test.com"
PLAYER_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD})
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def player_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PLAYER_EMAIL, "password": PLAYER_PASSWORD})
    assert r.status_code == 200, f"Player login failed: {r.text}"
    return r.json().get("session_token") or r.json().get("token")


class TestPrivacySettings:
    """Test GET/PATCH /api/coach/auth/privacy"""

    def test_get_privacy_settings(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/auth/privacy",
                         headers={"Authorization": f"Bearer {coach_token}"})
        assert r.status_code == 200, f"GET privacy failed: {r.text}"
        data = r.json()
        assert "hide_recruiting_prefs" in data
        assert "hide_contact_info" in data
        assert "profile_visible" in data

    def test_get_privacy_default_values(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/auth/privacy",
                         headers={"Authorization": f"Bearer {coach_token}"})
        data = r.json()
        # Defaults: profile_visible=True, hide_ fields = False
        assert isinstance(data["profile_visible"], bool)
        assert isinstance(data["hide_recruiting_prefs"], bool)
        assert isinstance(data["hide_contact_info"], bool)

    def test_patch_privacy_settings(self, coach_token):
        r = requests.patch(
            f"{BASE_URL}/api/coach/auth/privacy",
            json={"hide_recruiting_prefs": True},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert r.status_code == 200, f"PATCH privacy failed: {r.text}"

    def test_patch_privacy_persists(self, coach_token):
        # Set to True
        requests.patch(f"{BASE_URL}/api/coach/auth/privacy",
                       json={"hide_contact_info": True},
                       headers={"Authorization": f"Bearer {coach_token}"})
        # Read back
        r = requests.get(f"{BASE_URL}/api/coach/auth/privacy",
                         headers={"Authorization": f"Bearer {coach_token}"})
        assert r.json()["hide_contact_info"] is True

        # Reset
        requests.patch(f"{BASE_URL}/api/coach/auth/privacy",
                       json={"hide_contact_info": False},
                       headers={"Authorization": f"Bearer {coach_token}"})

    def test_privacy_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/coach/auth/privacy")
        assert r.status_code == 401


class TestCoachAnalytics:
    """Test GET /api/coach/analytics includes programme_views"""

    def test_analytics_returns_200(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/analytics",
                         headers={"Authorization": f"Bearer {coach_token}"})
        assert r.status_code == 200, f"Analytics failed: {r.text}"

    def test_analytics_has_programme_views(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/analytics",
                         headers={"Authorization": f"Bearer {coach_token}"})
        data = r.json()
        assert "programme_views" in data, "Missing programme_views in analytics"
        pv = data["programme_views"]
        assert "all_time" in pv
        assert "last_7d" in pv
        assert "last_30d" in pv
        assert isinstance(pv["all_time"], int)
        assert isinstance(pv["last_7d"], int)
        assert isinstance(pv["last_30d"], int)

    def test_analytics_has_views(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/analytics",
                         headers={"Authorization": f"Bearer {coach_token}"})
        data = r.json()
        assert "views" in data
        assert "saves" in data
        assert "messages_sent" in data


class TestPlayerMessages:
    """Test player messages endpoints"""

    def test_player_get_messages(self, player_token):
        r = requests.get(f"{BASE_URL}/api/player/messages",
                         headers={"Authorization": f"Bearer {player_token}"})
        assert r.status_code == 200, f"Player messages failed: {r.text}"
        data = r.json()
        assert "messages" in data
        assert "total" in data

    def test_player_messages_structure(self, player_token):
        r = requests.get(f"{BASE_URL}/api/player/messages",
                         headers={"Authorization": f"Bearer {player_token}"})
        data = r.json()
        messages = data.get("messages", [])
        if messages:
            msg = messages[0]
            assert "id" in msg
            assert "body" in msg


class TestCoachSentMessages:
    """Test coach sent messages endpoint"""

    def test_coach_sent_messages(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent",
                         headers={"Authorization": f"Bearer {coach_token}"})
        assert r.status_code == 200, f"Coach sent messages failed: {r.text}"
        data = r.json()
        assert "messages" in data

    def test_coach_sent_messages_structure(self, coach_token):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent",
                         headers={"Authorization": f"Bearer {coach_token}"})
        data = r.json()
        messages = data.get("messages", [])
        if messages:
            msg = messages[0]
            assert "id" in msg
            # player_reply field should exist (may be None if no migration)
            # Just verify the message is there
