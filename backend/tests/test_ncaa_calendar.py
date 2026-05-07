"""NCAA Calendar endpoint tests - iteration 29"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Player auth
PLAYER_EMAIL = "player@test.com"
PLAYER_PASS = "test1234"


@pytest.fixture(scope="module")
def player_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": PLAYER_EMAIL, "password": PLAYER_PASS})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json().get("session_token") or resp.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(player_token):
    return {"Authorization": f"Bearer {player_token}"}


# ── Test 1: NCAA Calendar endpoint returns expected structure ──────────────
class TestNcaaCalendar:
    def test_ncaa_calendar_returns_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_ncaa_calendar_has_current_event(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        data = resp.json()
        assert "current_event" in data, "Response missing 'current_event' key"
        assert "upcoming" in data, "Response missing 'upcoming' key"

    def test_ncaa_calendar_current_event_is_transfer_portal(self, auth_headers):
        """Transfer Portal Spring Window (May 1-15) should be active on May 7, 2026"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        data = resp.json()
        ce = data.get("current_event")
        assert ce is not None, "No current_event — Transfer Portal Spring Window should be active"
        assert "Transfer Portal" in ce["title"], f"Expected Transfer Portal event, got: {ce['title']}"
        assert ce["is_current"] is True
        assert ce["days_remaining"] >= 0

    def test_ncaa_calendar_current_event_fields(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        ce = resp.json()["current_event"]
        for field in ["title", "category", "date", "days_remaining", "is_current", "urgency"]:
            assert field in ce, f"current_event missing field: {field}"
        assert ce["category"] == "portal"

    def test_ncaa_calendar_upcoming_is_list(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        data = resp.json()
        assert isinstance(data["upcoming"], list)
        assert len(data["upcoming"]) > 0, "Should have upcoming events"

    def test_ncaa_calendar_upcoming_has_dead_period(self, auth_headers):
        """Dead Period (May 22) should be in upcoming"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        upcoming = resp.json()["upcoming"]
        titles = [e["title"] for e in upcoming]
        assert any("Dead Period" in t for t in titles), f"Dead Period not in upcoming: {titles}"

    def test_ncaa_calendar_upcoming_cards_have_required_fields(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        upcoming = resp.json()["upcoming"]
        for event in upcoming:
            for field in ["title", "category", "date", "days_until", "urgency", "short_desc"]:
                assert field in event, f"Upcoming event missing field: {field}"

    def test_ncaa_calendar_upcoming_max_6(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        upcoming = resp.json()["upcoming"]
        assert len(upcoming) <= 6, f"Expected max 6 upcoming events, got {len(upcoming)}"

    def test_ncaa_calendar_upcoming_sorted_by_date(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/ncaa-calendar", headers=auth_headers)
        upcoming = resp.json()["upcoming"]
        dates = [e["date"] for e in upcoming]
        assert dates == sorted(dates), "Upcoming events should be sorted by date"


# ── Test 2: Existing endpoints still work ────────────────────────────────
class TestExistingDashboardEndpoints:
    def test_dashboard_stats_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert resp.status_code == 200

    def test_dashboard_alerts_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=auth_headers)
        assert resp.status_code == 200

    def test_dashboard_weekly_digest_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/dashboard/weekly-digest", headers=auth_headers)
        assert resp.status_code == 200
