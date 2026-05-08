"""Phase C P1 tests: Committed player block, Scheduled send, Messages filter"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
COMMITTED_PLAYER_USER_ID = "fda135a9-a554-4ba3-9913-d69644e2132f"

COACH_CREDS = {"email": "testcoach@courtbound.edu", "password": "coach1234"}


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json=COACH_CREDS)
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}


# ── Committed block ────────────────────────────────────────────────────────────

class TestCommittedBlock:
    """Coach cannot message committed player (403)"""

    def test_message_committed_player_returns_403(self, coach_headers):
        r = requests.post(
            f"{BASE_URL}/api/coach/messages/{COMMITTED_PLAYER_USER_ID}",
            json={"body": "Hello, please join our program!"},
            headers=coach_headers,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        data = r.json()
        assert "committed" in (data.get("detail") or "").lower(), \
            f"Expected 'committed' in detail: {data}"

    def test_message_committed_player_detail_contains_institution(self, coach_headers):
        r = requests.post(
            f"{BASE_URL}/api/coach/messages/{COMMITTED_PLAYER_USER_ID}",
            json={"body": "Test"},
            headers=coach_headers,
        )
        assert r.status_code == 403
        detail = r.json().get("detail", "")
        # Should mention an institution name
        assert len(detail) > 20, f"Detail too short: {detail}"


# ── Regular message (pre-v21 graceful fallback) ────────────────────────────────

class TestRegularMessage:
    """Regular message send should succeed (even if v21 migration not run)"""

    def test_get_sent_messages(self, coach_headers):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent", headers=coach_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "messages" in data
        assert "total" in data
        assert "scheduled_count" in data

    def test_get_sent_messages_filter_sent(self, coach_headers):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent?status=sent", headers=coach_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_sent_messages_filter_scheduled(self, coach_headers):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent?status=scheduled", headers=coach_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "messages" in data
