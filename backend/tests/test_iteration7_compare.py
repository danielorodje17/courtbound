"""Iteration 7: College Comparison Feature Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = "test_session_iter7"
COLLEGE_IDS = "69d01b37c173431d960c3838,69d01b37c173431d960c3839,69d01b37c173431d960c383a"


class TestCompareEndpoint:
    """GET /api/colleges/compare endpoint tests"""

    def test_compare_returns_401_without_auth(self):
        """Endpoint must be auth-protected"""
        r = requests.get(f"{BASE_URL}/api/colleges/compare?ids={COLLEGE_IDS}")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("PASS: /api/colleges/compare returns 401 without auth")

    def test_compare_returns_200_with_auth(self):
        """Endpoint returns colleges with valid auth"""
        r = requests.get(
            f"{BASE_URL}/api/colleges/compare?ids={COLLEGE_IDS}",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 3, "Max 3 colleges"
        print(f"PASS: /api/colleges/compare returns {len(data)} colleges")

    def test_compare_response_has_required_fields(self):
        """Each college has required fields"""
        r = requests.get(
            f"{BASE_URL}/api/colleges/compare?ids={COLLEGE_IDS}",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        assert r.status_code == 200
        colleges = r.json()
        assert len(colleges) > 0
        required_fields = ["id", "name", "division", "location", "conference"]
        for college in colleges:
            for field in required_fields:
                assert field in college, f"Missing field '{field}' in college"
        print(f"PASS: All required fields present in compare response")

    def test_compare_no_mongodb_id_in_response(self):
        """_id should not be in response"""
        r = requests.get(
            f"{BASE_URL}/api/colleges/compare?ids={COLLEGE_IDS}",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        assert r.status_code == 200
        for college in r.json():
            assert "_id" not in college, "_id exposed in response"
        print("PASS: No _id in compare response")

    def test_compare_max_3_colleges(self):
        """Only up to 3 colleges returned"""
        four_ids = COLLEGE_IDS + ",69d01b37c173431d960c383b"
        r = requests.get(
            f"{BASE_URL}/api/colleges/compare?ids={four_ids}",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        assert r.status_code == 200
        assert len(r.json()) <= 3, "Should not return more than 3 colleges"
        print("PASS: Max 3 colleges enforced")

    def test_compare_tracking_field_present(self):
        """Each college has tracking field (may be null)"""
        r = requests.get(
            f"{BASE_URL}/api/colleges/compare?ids={COLLEGE_IDS}",
            headers={"Authorization": f"Bearer {TOKEN}"}
        )
        assert r.status_code == 200
        for college in r.json():
            assert "tracking" in college, "tracking field missing"
        print("PASS: tracking field present in all colleges")
