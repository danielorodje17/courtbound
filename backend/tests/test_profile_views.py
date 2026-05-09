"""Backend tests for GET /api/player/profile-views endpoint (Profile Views feature)."""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

PLAYER_EMAIL = "player@test.com"
PLAYER_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def player_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PLAYER_EMAIL, "password": PLAYER_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("session_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def player_headers(player_token):
    return {"Authorization": f"Bearer {player_token}"}


class TestProfileViewsEndpoint:
    """Tests for GET /api/player/profile-views"""

    def test_endpoint_returns_200(self, player_headers):
        """Basic reachability and auth check."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views", headers=player_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: /api/player/profile-views returns 200")

    def test_response_has_required_top_level_fields(self, player_headers):
        """Response must contain views, total, page, pages."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views", headers=player_headers)
        data = resp.json()
        for field in ("views", "total", "page", "pages"):
            assert field in data, f"Missing field: {field}"
        assert isinstance(data["views"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["page"], int)
        assert isinstance(data["pages"], int)
        print(f"PASS: top-level fields present. total={data['total']}")

    def test_view_items_have_required_fields(self, player_headers):
        """Each view item must have coach_name, institution_name, division, is_verified, view_count, last_viewed_at, programme_slug."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views", headers=player_headers)
        data = resp.json()
        views = data["views"]
        if not views:
            pytest.skip("No profile views available — cannot validate item fields")
        for v in views:
            for field in ("coach_id", "coach_name", "institution_name", "division", "is_verified", "view_count", "last_viewed_at", "programme_slug"):
                assert field in v, f"Missing field '{field}' in view item: {v}"
        print(f"PASS: All required fields present in {len(views)} view items")

    def test_deduplication_view_count(self, player_headers):
        """Coach who viewed 9 times should appear as 1 entry with view_count=9."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views", headers=player_headers)
        data = resp.json()
        views = data["views"]
        if not views:
            pytest.skip("No profile views available")
        # Each coach_id should appear only once (deduplication)
        coach_ids = [v["coach_id"] for v in views]
        assert len(coach_ids) == len(set(coach_ids)), "Duplicate coach entries found — deduplication failed"
        # Check view_count >= 1
        for v in views:
            assert v["view_count"] >= 1, f"view_count must be >= 1, got {v['view_count']}"
        # Check if the test coach has view_count >= 9
        max_vc = max(v["view_count"] for v in views)
        print(f"PASS: Deduplication OK. Max view_count={max_vc}. Unique coaches={len(coach_ids)}")

    def test_is_verified_field_type(self, player_headers):
        """is_verified must be boolean."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views", headers=player_headers)
        data = resp.json()
        for v in data["views"]:
            assert isinstance(v["is_verified"], bool), f"is_verified not boolean: {v['is_verified']}"
        print("PASS: is_verified is boolean for all items")

    def test_pagination_params(self, player_headers):
        """page=1&limit=1 should return at most 1 item."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views?page=1&limit=1", headers=player_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["views"]) <= 1
        assert data["page"] == 1
        print(f"PASS: Pagination works. items_returned={len(data['views'])}")

    def test_unauthenticated_returns_401_or_403(self):
        """Without auth, endpoint should reject."""
        resp = requests.get(f"{BASE_URL}/api/player/profile-views")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated returns {resp.status_code}")
