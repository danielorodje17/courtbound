"""
Iteration 8: Recruitment Progress Score tests
Tests GET /api/my-colleges progress_score field and score algorithm
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = "test_session_iter8"
AUTH_HEADERS = {"Authorization": f"Bearer {TOKEN}"}

class TestProgressScore:
    """Test progress_score in GET /api/my-colleges"""

    def test_unauthenticated_returns_401(self):
        """GET /api/my-colleges without auth returns 401"""
        r = requests.get(f"{BASE_URL}/api/my-colleges")
        assert r.status_code == 401

    def test_authenticated_returns_list(self):
        """GET /api/my-colleges with valid token returns a list"""
        r = requests.get(f"{BASE_URL}/api/my-colleges", headers=AUTH_HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_progress_score_field_present(self):
        """Each tracked college has a progress_score field"""
        r = requests.get(f"{BASE_URL}/api/my-colleges", headers=AUTH_HEADERS)
        assert r.status_code == 200
        data = r.json()
        for item in data:
            assert "progress_score" in item, f"Missing progress_score in {item}"

    def test_progress_score_range(self):
        """progress_score is between 0 and 100"""
        r = requests.get(f"{BASE_URL}/api/my-colleges", headers=AUTH_HEADERS)
        data = r.json()
        for item in data:
            score = item["progress_score"]
            assert 0 <= score <= 100, f"Score out of range: {score}"

    def test_progress_score_value_for_seeded_college(self):
        """Duke university (replied + email + follow-up + deadline + call notes) should score 75"""
        r = requests.get(f"{BASE_URL}/api/my-colleges", headers=AUTH_HEADERS)
        data = r.json()
        duke = next((d for d in data if d.get("college", {}).get("name") == "Duke University"), None)
        assert duke is not None, "Duke University not found in tracked colleges"
        # 10(base)+15(email)+10(status)+20(replied)+5(follow-up)+5(deadline)+10(call_notes) = 75
        assert duke["progress_score"] == 75, f"Expected 75, got {duke['progress_score']}"
