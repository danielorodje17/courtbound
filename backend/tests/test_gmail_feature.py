"""
Iteration 13: Tests for the Open in Gmail feature
- POST /api/emails (email logging with direction=sent)
- POST /api/my-colleges (auto-track)
- PATCH /api/my-colleges/{college_id}/status (set contacted + follow_up_date)
- GET /api/dashboard/alerts (follow-up shows in priority actions)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
SESSION_TOKEN = "test_session_iter10"

@pytest.fixture
def auth_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}"
    })
    return session

@pytest.fixture
def college_id(auth_client):
    """Get first available college ID"""
    r = auth_client.get(f"{BASE_URL}/api/colleges")
    assert r.status_code == 200
    colleges = r.json()
    assert len(colleges) > 0
    return colleges[0]["id"], colleges[0]["name"]

class TestEmailLogging:
    """Tests for POST /api/emails"""

    def test_log_email_sent(self, auth_client, college_id):
        cid, cname = college_id
        payload = {
            "college_id": cid,
            "direction": "sent",
            "subject": "TEST_Gmail Feature - Basketball Scholarship",
            "body": "TEST email body for gmail feature",
            "coach_name": "Test Coach",
            "coach_email": "testcoach@example.com",
            "message_type": "initial_outreach"
        }
        r = auth_client.post(f"{BASE_URL}/api/emails", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("direction") == "sent"
        assert data.get("college_id") == cid
        assert "id" in data
        print(f"PASS: Email logged with id={data['id']}, direction=sent, college={cname}")
        return data["id"]

    def test_log_email_appears_in_list(self, auth_client, college_id):
        cid, cname = college_id
        # Log email
        payload = {
            "college_id": cid,
            "direction": "sent",
            "subject": "TEST_Gmail List Check",
            "body": "TEST body",
            "coach_name": "",
            "coach_email": ""
        }
        r = auth_client.post(f"{BASE_URL}/api/emails", json=payload)
        assert r.status_code == 200
        email_id = r.json()["id"]

        # GET emails and verify it appears
        r2 = auth_client.get(f"{BASE_URL}/api/emails")
        assert r2.status_code == 200
        emails = r2.json()
        ids = [e["id"] for e in emails]
        assert email_id in ids, f"Email {email_id} not found in emails list"
        print(f"PASS: Email appears in communications list. Total emails: {len(emails)}")


class TestAutoTrackAndStatus:
    """Tests for POST /api/my-colleges and PATCH /api/my-colleges/{id}/status"""

    def test_auto_track_college(self, auth_client, college_id):
        cid, cname = college_id
        # Try to track (may already be tracked)
        r = auth_client.post(f"{BASE_URL}/api/my-colleges", json={"college_id": cid, "notes": ""})
        assert r.status_code in [200, 201, 400], f"Unexpected status {r.status_code}: {r.text}"
        if r.status_code == 400:
            print(f"PASS: College {cname} already tracked (400 as expected)")
        else:
            print(f"PASS: Auto-tracked college {cname}")

    def test_patch_status_contacted_with_follow_up(self, auth_client, college_id):
        cid, cname = college_id
        # Ensure tracked first
        auth_client.post(f"{BASE_URL}/api/my-colleges", json={"college_id": cid, "notes": ""})

        follow_up = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        r = auth_client.patch(f"{BASE_URL}/api/my-colleges/{cid}/status", json={
            "status": "contacted",
            "follow_up_date": follow_up
        })
        assert r.status_code == 200, f"PATCH failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("message") == "Updated"
        print(f"PASS: Status patched to contacted, follow_up={follow_up}")

    def test_follow_up_appears_in_dashboard_alerts(self, auth_client, college_id):
        cid, cname = college_id
        # Ensure tracked and status set
        auth_client.post(f"{BASE_URL}/api/my-colleges", json={"college_id": cid, "notes": ""})
        follow_up = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        auth_client.patch(f"{BASE_URL}/api/my-colleges/{cid}/status", json={
            "status": "contacted",
            "follow_up_date": follow_up
        })

        # Check dashboard alerts
        r = auth_client.get(f"{BASE_URL}/api/dashboard/alerts")
        assert r.status_code == 200, f"Dashboard alerts failed: {r.status_code}"
        alerts = r.json()
        upcoming = alerts.get("upcoming_followups", [])
        overdue = alerts.get("overdue_followups", [])
        all_followups = upcoming + overdue
        cids = [f["college_id"] for f in all_followups]
        assert cid in cids, f"College {cname} (id={cid}) not found in dashboard alerts. Got: {all_followups}"
        print(f"PASS: College {cname} appears in dashboard follow-ups")

    def test_my_colleges_status_fields(self, auth_client, college_id):
        cid, cname = college_id
        auth_client.post(f"{BASE_URL}/api/my-colleges", json={"college_id": cid, "notes": ""})
        follow_up = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        auth_client.patch(f"{BASE_URL}/api/my-colleges/{cid}/status", json={
            "status": "contacted",
            "follow_up_date": follow_up
        })
        # GET my-colleges and verify
        r = auth_client.get(f"{BASE_URL}/api/my-colleges")
        assert r.status_code == 200
        my_colleges = r.json()
        entry = next((c for c in my_colleges if c.get("college_id") == cid), None)
        assert entry is not None, f"College {cid} not found in my-colleges"
        assert entry.get("status") == "contacted", f"Status should be contacted, got {entry.get('status')}"
        assert entry.get("follow_up_date") == follow_up, f"follow_up_date mismatch: {entry.get('follow_up_date')} vs {follow_up}"
        print(f"PASS: my-colleges entry has status=contacted, follow_up_date={follow_up}")
