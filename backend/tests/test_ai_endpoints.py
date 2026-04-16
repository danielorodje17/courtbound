"""Tests for new AI endpoints: profile-review and reply-next-steps"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
SESSION_TOKEN = "test_session_ai_99999"

HEADERS = {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}


class TestProfileReview:
    """GET /api/ai/profile-review"""

    def test_profile_review_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review")
        assert r.status_code == 401

    def test_profile_review_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"

    def test_profile_review_has_score(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "score" in data, "Missing 'score'"
        assert isinstance(data["score"], int), "score must be int"
        assert 0 <= data["score"] <= 100, f"Score out of range: {data['score']}"

    def test_profile_review_has_grade(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "grade" in data
        assert data["grade"] in ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D"], f"Unexpected grade: {data['grade']}"

    def test_profile_review_has_strengths_array(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "strengths" in data
        assert isinstance(data["strengths"], list)
        assert len(data["strengths"]) > 0

    def test_profile_review_has_improvements_array(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "improvements" in data
        assert isinstance(data["improvements"], list)

    def test_profile_review_has_coach_checklist_10_items(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "coach_checklist" in data
        assert isinstance(data["coach_checklist"], list)
        assert len(data["coach_checklist"]) == 10, f"Expected 10, got {len(data['coach_checklist'])}"

    def test_profile_review_has_response_insights(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "response_insights" in data
        assert isinstance(data["response_insights"], str)

    def test_profile_review_has_top_actions(self):
        r = requests.get(f"{BASE_URL}/api/ai/profile-review", headers=HEADERS, timeout=60)
        data = r.json()
        assert "top_actions" in data
        assert isinstance(data["top_actions"], list)
        assert len(data["top_actions"]) > 0

    def test_profile_review_400_no_profile(self):
        """Create session for user with no profile and expect 400"""
        import pymongo, datetime
        client = pymongo.MongoClient("mongodb://localhost:27017")
        db = client["courtbound_db"]
        no_profile_user = "test-noprofile-user-88888"
        no_profile_token = "test_session_noprofile_88888"
        db.users.update_one({"user_id": no_profile_user}, {"$set": {
            "user_id": no_profile_user, "email": "noprofile@test.com", "name": "No Profile",
        }}, upsert=True)
        db.user_sessions.update_one({"session_token": no_profile_token}, {"$set": {
            "session_token": no_profile_token, "user_id": no_profile_user,
            "email": "noprofile@test.com", "name": "No Profile",
            "created_at": datetime.datetime.utcnow(), "expires_at": datetime.datetime(2030, 1, 1)
        }}, upsert=True)
        db.profiles.delete_many({"user_id": no_profile_user})

        r = requests.get(f"{BASE_URL}/api/ai/profile-review",
                         headers={"Authorization": f"Bearer {no_profile_token}"},
                         timeout=30)
        assert r.status_code == 400


class TestReplyNextSteps:
    """POST /api/ai/reply-next-steps"""

    PAYLOAD = {
        "college_name": "University of Kansas",
        "division": "Division I",
        "coach_name": "Coach Smith",
        "reply_body": "Thanks for reaching out. We're interested in learning more about you.",
        "outcome": "interested",
    }

    def test_reply_next_steps_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD)
        assert r.status_code == 401

    def test_reply_next_steps_returns_200(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text[:300]}"

    def test_reply_next_steps_has_urgency(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "urgency" in data
        assert data["urgency"] in ["immediate", "soon", "low"]

    def test_reply_next_steps_has_urgency_label(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "urgency_label" in data
        assert isinstance(data["urgency_label"], str)

    def test_reply_next_steps_has_urgency_colour(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "urgency_colour" in data
        assert data["urgency_colour"] in ["red", "orange", "green"]

    def test_reply_next_steps_has_headline(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "headline" in data
        assert isinstance(data["headline"], str)

    def test_reply_next_steps_has_next_steps_array(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "next_steps" in data
        assert isinstance(data["next_steps"], list)
        assert len(data["next_steps"]) > 0
        for step in data["next_steps"]:
            assert "action" in step
            assert "detail" in step

    def test_reply_next_steps_has_what_to_avoid(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "what_to_avoid" in data
        assert isinstance(data["what_to_avoid"], list)

    def test_reply_next_steps_has_uk_player_tip(self):
        r = requests.post(f"{BASE_URL}/api/ai/reply-next-steps", json=self.PAYLOAD, headers=HEADERS, timeout=60)
        data = r.json()
        assert "uk_player_tip" in data
        assert isinstance(data["uk_player_tip"], str)
