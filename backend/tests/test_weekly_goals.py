"""Backend tests for Weekly Goals feature - iteration 11"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TOKEN = "test_session_iter10"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


class TestGoalsCurrent:
    """Tests for GET/PUT /api/goals/current"""

    def test_get_current_goals_status(self):
        r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"

    def test_get_current_goals_fields(self):
        r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
        data = r.json()
        assert "week_start" in data
        assert "week_label" in data
        assert "goals" in data
        assert "progress" in data

    def test_get_current_goals_structure(self):
        r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
        data = r.json()
        for key in ("emails_sent", "follow_ups", "new_tracks", "calls"):
            assert key in data["goals"], f"Missing key {key} in goals"
            assert key in data["progress"], f"Missing key {key} in progress"

    def test_put_current_goals(self):
        payload = {"emails_sent": 5, "follow_ups": 3, "new_tracks": 2, "calls": 1}
        r = requests.put(f"{BASE_URL}/api/goals/current", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"

    def test_put_current_goals_persists(self):
        payload = {"emails_sent": 7, "follow_ups": 4, "new_tracks": 3, "calls": 2}
        requests.put(f"{BASE_URL}/api/goals/current", json=payload, headers=HEADERS)
        r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
        data = r.json()
        assert data["goals"]["emails_sent"] == 7
        assert data["goals"]["follow_ups"] == 4
        assert data["goals"]["new_tracks"] == 3
        assert data["goals"]["calls"] == 2

    def test_put_returns_goals(self):
        payload = {"emails_sent": 5, "follow_ups": 3, "new_tracks": 2, "calls": 1}
        r = requests.put(f"{BASE_URL}/api/goals/current", json=payload, headers=HEADERS)
        data = r.json()
        assert "goals" in data
        assert data["goals"]["emails_sent"] == 5

    def test_goals_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/goals/current")
        assert r.status_code == 401


class TestGoalsHistory:
    """Tests for GET /api/goals/history"""

    def test_get_history_status(self):
        r = requests.get(f"{BASE_URL}/api/goals/history", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"

    def test_get_history_is_list(self):
        r = requests.get(f"{BASE_URL}/api/goals/history", headers=HEADERS)
        data = r.json()
        assert isinstance(data, list)

    def test_get_history_max_8_weeks(self):
        r = requests.get(f"{BASE_URL}/api/goals/history", headers=HEADERS)
        data = r.json()
        assert len(data) <= 8

    def test_get_history_week_fields(self):
        r = requests.get(f"{BASE_URL}/api/goals/history", headers=HEADERS)
        data = r.json()
        if data:
            week = data[0]
            for field in ("week_start", "week_label", "is_current", "goals", "progress", "achievement_pct"):
                assert field in week, f"Missing field {field} in history week"

    def test_history_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/goals/history")
        assert r.status_code == 401


class TestMessageType:
    """Tests for message_type field in emails"""

    def test_post_email_with_message_type_follow_up(self):
        # First need a college to send email to - use existing or skip
        # Get tracked colleges first
        r = requests.get(f"{BASE_URL}/api/my-colleges", headers=HEADERS)
        if r.status_code != 200 or not r.json():
            pytest.skip("No tracked colleges available")
        colleges = r.json()
        college_id = colleges[0].get("college_id") or colleges[0].get("id")
        if not college_id:
            pytest.skip("No college_id available")

        payload = {
            "college_id": college_id,
            "direction": "sent",
            "subject": "TEST Follow-up",
            "body": "TEST follow-up email body",
            "coach_name": "Test Coach",
            "coach_email": "coach@test.edu",
            "message_type": "follow_up"
        }
        r = requests.post(f"{BASE_URL}/api/emails", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text}"

    def test_email_message_type_stored(self):
        r = requests.get(f"{BASE_URL}/api/emails", headers=HEADERS)
        if r.status_code != 200:
            pytest.skip("Cannot retrieve emails")
        emails = r.json()
        # Check if any email has message_type field
        if emails:
            # message_type should be present in emails
            assert "message_type" in emails[0], "message_type field missing from email"
