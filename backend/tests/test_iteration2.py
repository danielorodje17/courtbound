"""
Iteration 2 tests: Player Profile, Response Tracker, Log Reply, AI Follow-up
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestProfile:
    """Player Profile endpoints"""

    def test_get_profile(self):
        r = requests.get(f"{BASE_URL}/api/profile")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        print(f"GET /api/profile OK: {list(data.keys())}")

    def test_put_profile(self):
        payload = {
            "full_name": "TEST_Player Name",
            "nationality": "British",
            "position": "Point Guard",
            "height": "6'2\"",
            "weight": "180lbs",
            "gpa": "3.8",
            "sat_score": "1200",
            "graduation_year": "2026"
        }
        r = requests.put(f"{BASE_URL}/api/profile", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data.get("message") == "Profile saved"
        print("PUT /api/profile OK")

    def test_profile_persists(self):
        # Save then retrieve
        payload = {"full_name": "TEST_Persistence Check", "position": "Shooting Guard"}
        requests.put(f"{BASE_URL}/api/profile", json=payload)
        r = requests.get(f"{BASE_URL}/api/profile")
        assert r.status_code == 200
        data = r.json()
        assert data.get("full_name") == "TEST_Persistence Check"
        print("Profile persists correctly")


class TestResponsesSummary:
    """GET /api/responses/summary"""

    def test_responses_summary_returns_list(self):
        r = requests.get(f"{BASE_URL}/api/responses/summary")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"GET /api/responses/summary OK: {len(data)} items")

    def test_responses_summary_structure(self):
        r = requests.get(f"{BASE_URL}/api/responses/summary")
        assert r.status_code == 200
        data = r.json()
        if data:
            item = data[0]
            assert "tracked_id" in item
            assert "college_id" in item
            assert "college" in item
            assert "status" in item
            college = item["college"]
            assert "name" in college
            print(f"Response summary structure OK. First college: {college['name']}")

    def test_responses_summary_count(self):
        r = requests.get(f"{BASE_URL}/api/responses/summary")
        assert r.status_code == 200
        data = r.json()
        # Should have tracked colleges seeded (49 per agent context)
        assert len(data) >= 1
        print(f"Tracked colleges in summary: {len(data)}")


class TestLogReply:
    """POST /api/emails/log-reply"""

    def test_log_reply_basic(self):
        # First get a college_id from responses summary
        r = requests.get(f"{BASE_URL}/api/responses/summary")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        college_id = data[0]["college_id"]
        college_name = data[0]["college"]["name"]

        payload = {
            "college_id": college_id,
            "coach_name": "TEST_Coach Johnson",
            "subject": "TEST_Re: Basketball Scholarship Inquiry",
            "body": "Thank you for reaching out! We are interested in your profile.",
            "coach_email": "coach@test.edu",
            "received_date": None
        }
        r2 = requests.post(f"{BASE_URL}/api/emails/log-reply", json=payload)
        assert r2.status_code == 200
        result = r2.json()
        assert "id" in result
        assert result.get("direction") == "received"
        assert result.get("college_id") == college_id
        print(f"Log reply for {college_name} OK, id={result['id']}")

    def test_log_reply_updates_status(self):
        # Get awaiting college
        r = requests.get(f"{BASE_URL}/api/responses/summary")
        data = r.json()
        # Find a college with status 'contacted' or 'interested'
        awaiting = [c for c in data if c["status"] in ("contacted", "interested")]
        if not awaiting:
            pytest.skip("No awaiting colleges found")
        college_id = awaiting[0]["college_id"]

        payload = {
            "college_id": college_id,
            "coach_name": "TEST_Coach Status",
            "subject": "TEST_Status Update",
            "body": "We have reviewed your profile.",
        }
        r2 = requests.post(f"{BASE_URL}/api/emails/log-reply", json=payload)
        assert r2.status_code == 200

        # Verify status changed
        r3 = requests.get(f"{BASE_URL}/api/responses/summary")
        updated = [c for c in r3.json() if c["college_id"] == college_id]
        assert updated[0]["status"] == "replied"
        print("Status updated to 'replied' after log-reply OK")
