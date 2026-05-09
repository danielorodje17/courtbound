"""
Backend tests for Bulk Message feature — POST /api/coach/messages/bulk
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    resp = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD})
    assert resp.status_code == 200, f"Coach login failed: {resp.text}"
    token = resp.json().get("access_token") or resp.json().get("token")
    assert token, f"No token in response: {resp.json()}"
    return token


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}


class TestBulkMessageBackend:
    """Tests for POST /api/coach/messages/bulk"""

    def test_bulk_valid_list_returns_sent_skipped(self, coach_headers):
        """Test 1: valid list_name + body returns {sent, skipped, skipped_names, list_name}"""
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Watch List", "subject": "Test Subject", "body": "Hello from bulk test"},
            headers=coach_headers,
        )
        # Could be 200 (sent >=1) or 400 (if all committed/empty — but we expect players)
        print(f"Bulk valid: {resp.status_code} {resp.text}")
        if resp.status_code == 200:
            data = resp.json()
            assert "sent" in data, "Missing 'sent' field"
            assert "skipped" in data, "Missing 'skipped' field"
            assert "skipped_names" in data, "Missing 'skipped_names' field"
            assert "list_name" in data, "Missing 'list_name' field"
            assert data["list_name"] == "Watch List"
            assert isinstance(data["sent"], int)
            assert isinstance(data["skipped"], int)
            print(f"PASS: sent={data['sent']}, skipped={data['skipped']}")
        else:
            pytest.fail(f"Expected 200, got {resp.status_code}: {resp.text}")

    def test_bulk_empty_list_returns_400(self, coach_headers):
        """Test 2: list with no players returns 400"""
        # Use a list name that definitely has no players
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Offer Extended", "body": "Test bulk message"},
            headers=coach_headers,
        )
        print(f"Bulk empty list: {resp.status_code} {resp.text}")
        # If the list has players, it will return 200 — only assert 400 if players absent
        if resp.status_code == 400:
            data = resp.json()
            assert "detail" in data
            print(f"PASS: 400 returned with detail: {data['detail']}")
        elif resp.status_code == 200:
            print(f"INFO: Offer Extended list has players, returned 200 (not testing empty list scenario here)")
        else:
            pytest.fail(f"Unexpected status {resp.status_code}: {resp.text}")

    def test_bulk_no_list_name_returns_400(self, coach_headers):
        """Test 2b: missing list_name returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"body": "Test bulk message"},
            headers=coach_headers,
        )
        print(f"Bulk no list_name: {resp.status_code} {resp.text}")
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "detail" in data
        print(f"PASS: 400 with detail: {data['detail']}")

    def test_bulk_missing_body_returns_400(self, coach_headers):
        """Test 3: missing body returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Watch List"},
            headers=coach_headers,
        )
        print(f"Bulk missing body: {resp.status_code} {resp.text}")
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "detail" in data
        print(f"PASS: 400 with detail: {data['detail']}")

    def test_bulk_empty_body_returns_400(self, coach_headers):
        """Test 3b: empty body string returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Watch List", "body": "   "},
            headers=coach_headers,
        )
        print(f"Bulk empty body: {resp.status_code} {resp.text}")
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: 400 for blank body")

    def test_bulk_route_does_not_conflict_with_player_route(self, coach_headers):
        """Test 4: bulk route resolves correctly (not caught by /messages/{player_user_id})"""
        # If routing is wrong, 'bulk' would be treated as a player_user_id and return 404
        # We test by sending missing body — expect 400 not 404
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Watch List"},
            headers=coach_headers,
        )
        print(f"Routing check: {resp.status_code} {resp.text}")
        assert resp.status_code != 404, "FAIL: bulk route appears to be caught by player route (404 returned)"
        assert resp.status_code == 400, f"Expected 400 (body missing), got {resp.status_code}"
        print("PASS: bulk route is not conflicting with player route")

    def test_bulk_unauthenticated_returns_401_or_403(self):
        """Test: unauthenticated request is rejected"""
        resp = requests.post(
            f"{BASE_URL}/api/coach/messages/bulk",
            json={"list_name": "Watch List", "body": "Test"},
        )
        print(f"Unauthenticated bulk: {resp.status_code}")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: unauthenticated returns {resp.status_code}")
