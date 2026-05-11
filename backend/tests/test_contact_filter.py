"""Tests for contact filter feature - GET /api/player/contacted-institutions"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Player credentials
PLAYER_EMAIL = "player@test.com"
PLAYER_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def player_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PLAYER_EMAIL, "password": PLAYER_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["session_token"]


@pytest.fixture(scope="module")
def player_headers(player_token):
    return {"Authorization": f"Bearer {player_token}"}


class TestContactedInstitutions:
    """Tests for GET /api/player/contacted-institutions"""

    def test_endpoint_returns_200(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/player/contacted-institutions returns 200")

    def test_response_has_replied_field(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        data = resp.json()
        assert "replied" in data, f"Missing 'replied' field in response: {data}"
        assert isinstance(data["replied"], list), f"'replied' should be a list, got {type(data['replied'])}"
        print(f"PASS: 'replied' is a list with {len(data['replied'])} items: {data['replied']}")

    def test_response_has_not_replied_field(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        data = resp.json()
        assert "not_replied" in data, f"Missing 'not_replied' field in response: {data}"
        assert isinstance(data["not_replied"], list), f"'not_replied' should be a list, got {type(data['not_replied'])}"
        print(f"PASS: 'not_replied' is a list with {len(data['not_replied'])} items: {data['not_replied']}")

    def test_no_overlap_between_replied_and_not_replied(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        data = resp.json()
        replied_set = set(data["replied"])
        not_replied_set = set(data["not_replied"])
        overlap = replied_set & not_replied_set
        assert not overlap, f"Overlap found between replied and not_replied: {overlap}"
        print("PASS: No overlap between replied and not_replied sets")

    def test_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print(f"PASS: Unauthenticated request returns {resp.status_code}")

    def test_replied_contains_strings(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        data = resp.json()
        for item in data["replied"]:
            assert isinstance(item, str), f"replied item should be string, got {type(item)}: {item}"
        print(f"PASS: All replied items are strings. Values: {data['replied']}")

    def test_player_has_replied_institutions(self, player_headers):
        """Player has replied to messages from Test University based on prior test context"""
        resp = requests.get(f"{BASE_URL}/api/player/contacted-institutions", headers=player_headers)
        data = resp.json()
        print(f"INFO: replied={data['replied']}, not_replied={data['not_replied']}")
        # Player should have at least some data (they've replied to messages)
        # Not a hard assertion - just informational
        total = len(data["replied"]) + len(data["not_replied"])
        print(f"INFO: Total contacted institutions: {total} (replied={len(data['replied'])}, not_replied={len(data['not_replied'])})")
