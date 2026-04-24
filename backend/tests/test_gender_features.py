"""Tests for gender/division features: colleges, profile with basketball_gender"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = "test_session_ai_99999"

@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {SESSION_TOKEN}"}

class TestCollegesAPI:
    def test_colleges_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/colleges")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_colleges_have_expected_fields(self):
        r = requests.get(f"{BASE_URL}/api/colleges")
        assert r.status_code == 200
        college = r.json()[0]
        assert "name" in college or "college_name" in college

class TestProfileAPI:
    def test_get_profile(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/profile", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)

    def test_put_profile_basketball_gender_men(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/profile",
            headers=auth_headers,
            json={"basketball_gender": "men"})
        assert r.status_code == 200

    def test_put_profile_basketball_gender_women(self, auth_headers):
        r = requests.put(f"{BASE_URL}/api/profile",
            headers=auth_headers,
            json={"basketball_gender": "women"})
        assert r.status_code == 200

    def test_put_profile_no_error_on_pre_migration(self, auth_headers):
        """basketball_gender column may not exist yet - should not 500"""
        r = requests.put(f"{BASE_URL}/api/profile",
            headers=auth_headers,
            json={"full_name": "Test Player", "basketball_gender": "men"})
        assert r.status_code in [200, 201]
