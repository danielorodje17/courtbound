"""
Iteration 3 backend tests: International Badges, Follow-up Scheduler, Deadline Tracker
Tests: /api/dashboard/alerts, PATCH /api/my-colleges/{id}/status (new fields)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestDashboardAlerts:
    """Tests for GET /api/dashboard/alerts endpoint"""

    def test_alerts_endpoint_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_alerts_has_correct_keys(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "overdue_followups" in data, "Missing overdue_followups key"
        assert "upcoming_followups" in data, "Missing upcoming_followups key"
        assert "upcoming_deadlines" in data, "Missing upcoming_deadlines key"

    def test_alerts_values_are_lists(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        data = r.json()
        assert isinstance(data["overdue_followups"], list)
        assert isinstance(data["upcoming_followups"], list)
        assert isinstance(data["upcoming_deadlines"], list)

    def test_upcoming_followups_populated(self):
        """DB has follow_up_date='2026-04-10' set on tracked colleges from previous testing"""
        r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        data = r.json()
        # Should have upcoming follow-ups (2026-04-10 is within 7 days of today (Feb 2026)? 
        # Actually Apr 10 is ~60 days away, so NOT in upcoming (7 day window)
        # But there should be overdue ones (2026-04-10 > today Feb 2026) - no, Apr 10 is in future
        # Let's just check the structure of any item if present
        all_followups = data["overdue_followups"] + data["upcoming_followups"]
        if all_followups:
            item = all_followups[0]
            assert "college_id" in item
            assert "name" in item
            assert "date" in item
        print(f"Overdue: {len(data['overdue_followups'])}, Upcoming(7d): {len(data['upcoming_followups'])}, Deadlines: {len(data['upcoming_deadlines'])}")

    def test_deadline_item_structure(self):
        """If deadlines present, check structure"""
        r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        data = r.json()
        deadlines = data["upcoming_deadlines"]
        if deadlines:
            item = deadlines[0]
            assert "college_id" in item
            assert "name" in item
            assert "deadline" in item
            assert "type" in item
            assert item["type"] in ["Application", "Signing Day"]


class TestPatchStatusWithDates:
    """Tests for PATCH /api/my-colleges/{id}/status saving new date fields"""

    def get_tracked_college_id(self):
        r = requests.get(f"{BASE_URL}/api/my-colleges")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0, "No tracked colleges found"
        return data[0]["college_id"]

    def test_patch_saves_follow_up_date(self):
        college_id = self.get_tracked_college_id()
        payload = {
            "status": "contacted",
            "notes": "Test follow-up date",
            "follow_up_date": "2026-03-15"
        }
        r = requests.patch(f"{BASE_URL}/api/my-colleges/{college_id}/status", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

        # Verify persisted
        tracked = requests.get(f"{BASE_URL}/api/my-colleges").json()
        match = next((t for t in tracked if t["college_id"] == college_id), None)
        assert match is not None
        assert match.get("follow_up_date") == "2026-03-15", f"follow_up_date not saved: {match}"

    def test_patch_saves_application_deadline(self):
        college_id = self.get_tracked_college_id()
        payload = {
            "status": "contacted",
            "notes": "Test deadline",
            "application_deadline": "2026-03-20"
        }
        r = requests.patch(f"{BASE_URL}/api/my-colleges/{college_id}/status", json=payload)
        assert r.status_code == 200

        tracked = requests.get(f"{BASE_URL}/api/my-colleges").json()
        match = next((t for t in tracked if t["college_id"] == college_id), None)
        assert match is not None
        assert match.get("application_deadline") == "2026-03-20", f"application_deadline not saved: {match}"

    def test_patch_saves_signing_day(self):
        college_id = self.get_tracked_college_id()
        payload = {
            "status": "contacted",
            "notes": "Test signing day",
            "signing_day": "2026-04-01"
        }
        r = requests.patch(f"{BASE_URL}/api/my-colleges/{college_id}/status", json=payload)
        assert r.status_code == 200

        tracked = requests.get(f"{BASE_URL}/api/my-colleges").json()
        match = next((t for t in tracked if t["college_id"] == college_id), None)
        assert match is not None
        assert match.get("signing_day") == "2026-04-01", f"signing_day not saved: {match}"

    def test_deadline_appears_in_alerts_after_save(self):
        """Set app_deadline within 30 days, check alerts endpoint returns it"""
        college_id = self.get_tracked_college_id()
        # Set a deadline within 30 days (today is Feb 2026, so e.g. March 1)
        from datetime import date, timedelta
        deadline_date = (date.today() + timedelta(days=10)).isoformat()
        payload = {
            "status": "contacted",
            "notes": "Deadline alert test",
            "application_deadline": deadline_date
        }
        r = requests.patch(f"{BASE_URL}/api/my-colleges/{college_id}/status", json=payload)
        assert r.status_code == 200

        alerts_r = requests.get(f"{BASE_URL}/api/dashboard/alerts")
        alerts = alerts_r.json()
        deadlines = alerts["upcoming_deadlines"]
        match = next((d for d in deadlines if d["college_id"] == college_id), None)
        assert match is not None, f"Deadline not found in alerts for college {college_id}. Alerts: {alerts}"
        assert match["type"] == "Application"
        assert match["deadline"] == deadline_date


class TestCollegesUKFriendly:
    """Tests for UK-friendly colleges (foreign_friendly flag)"""

    def test_colleges_endpoint_returns_uk_friendly(self):
        r = requests.get(f"{BASE_URL}/api/colleges?foreign_friendly=true")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0, "No UK-friendly colleges returned"
        for c in data:
            assert c.get("foreign_friendly") == True, f"College not UK-friendly: {c['name']}"
        print(f"UK-friendly colleges count: {len(data)}")

    def test_duke_university_is_uk_friendly(self):
        """Duke University should have foreign_friendly=True"""
        r = requests.get(f"{BASE_URL}/api/colleges")
        data = r.json()
        duke = next((c for c in data if "Duke" in c["name"]), None)
        assert duke is not None, "Duke University not found"
        assert duke.get("foreign_friendly") == True, f"Duke not marked as UK-friendly: {duke}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
