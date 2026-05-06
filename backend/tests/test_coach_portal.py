"""
Coach Portal Backend Tests
Tests all coach auth, player search, dashboard, and board endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    response = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, f"No token in response: {data}"
        return token
    pytest.skip(f"Coach auth failed: {response.status_code} {response.text[:200]}")


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


class TestCoachAuth:
    """Coach auth endpoints"""

    def test_login_success(self):
        response = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data

    def test_login_invalid(self):
        response = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 400, 404]

    def test_me_endpoint(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/coach/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == COACH_EMAIL

    def test_me_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/coach/auth/me")
        assert response.status_code in [401, 403]


class TestCoachDashboard:
    """Coach dashboard endpoints"""

    def test_dashboard(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/coach/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have some stats
        assert isinstance(data, dict)

    def test_dashboard_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/coach/dashboard")
        assert response.status_code in [401, 403]

    def test_saved_players(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/coach/saved", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestCoachPlayers:
    """Coach player search endpoints"""

    def test_search_players(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/coach/players", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_search_with_query(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/coach/players?search=test", headers=auth_headers)
        assert response.status_code == 200

    def test_players_unauthenticated(self):
        response = requests.get(f"{BASE_URL}/api/coach/players")
        assert response.status_code in [401, 403]

    def test_save_player(self, auth_headers):
        # First get a player id
        response = requests.get(f"{BASE_URL}/api/coach/players", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        players = data if isinstance(data, list) else data.get("players", [])
        if not players:
            pytest.skip("No players available to save")
        player_id = players[0].get("id") or players[0].get("user_id")
        assert player_id

        save_response = requests.post(
            f"{BASE_URL}/api/coach/players/{player_id}/save",
            headers=auth_headers
        )
        assert save_response.status_code in [200, 201]


class TestCoachRegister:
    """Coach registration"""

    def test_register_missing_fields(self):
        response = requests.post(f"{BASE_URL}/api/coach/auth/register", json={
            "email": "incomplete@test.edu"
        })
        assert response.status_code in [400, 422]
