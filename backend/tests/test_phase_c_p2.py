"""Phase C P2 - Custom Lists on Recruiting Board"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": "testcoach@courtbound.edu",
        "password": "coach1234"
    })
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    return r.json().get("token") or r.json().get("access_token") or r.cookies.get("session_token")

@pytest.fixture(scope="module")
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}

@pytest.fixture(autouse=True)
def cleanup_test_lists(coach_headers):
    """Delete any TEST_ lists before each test"""
    yield
    for name in ["2026 Guards", "TEST_List", "Elite Prospects", "Renamed List"]:
        requests.delete(f"{BASE_URL}/api/coach/custom-lists/{name}", headers=coach_headers)

# GET custom lists
def test_get_custom_lists(coach_headers):
    r = requests.get(f"{BASE_URL}/api/coach/custom-lists", headers=coach_headers)
    assert r.status_code == 200
    data = r.json()
    assert "custom_lists" in data
    assert isinstance(data["custom_lists"], list)
    print(f"PASS: GET custom-lists returns {data['custom_lists']}")

# POST create custom list
def test_create_custom_list(coach_headers):
    r = requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "2026 Guards"}, headers=coach_headers)
    assert r.status_code == 200
    data = r.json()
    assert "custom_lists" in data
    assert "2026 Guards" in data["custom_lists"]
    print("PASS: Created '2026 Guards' custom list")

# Validate duplicate name
def test_create_duplicate_list(coach_headers):
    requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "Elite Prospects"}, headers=coach_headers)
    r = requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "Elite Prospects"}, headers=coach_headers)
    assert r.status_code in (400, 409)
    print(f"PASS: Duplicate list name rejected: {r.json()}")

# Validate default list name
def test_create_list_with_default_name(coach_headers):
    r = requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "Watch List"}, headers=coach_headers)
    assert r.status_code in (400, 409)
    print(f"PASS: Default list name rejected: {r.json()}")

def test_create_list_committed_name(coach_headers):
    r = requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "Committed"}, headers=coach_headers)
    assert r.status_code in (400, 409)
    print(f"PASS: 'Committed' default name rejected")

# PATCH rename
def test_rename_custom_list(coach_headers):
    requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "TEST_List"}, headers=coach_headers)
    r = requests.patch(f"{BASE_URL}/api/coach/custom-lists/TEST_List", json={"name": "Renamed List"}, headers=coach_headers)
    assert r.status_code == 200
    data = r.json()
    assert "Renamed List" in data["custom_lists"]
    assert "TEST_List" not in data["custom_lists"]
    print("PASS: Renamed 'TEST_List' to 'Renamed List'")

# DELETE
def test_delete_custom_list(coach_headers):
    requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "2026 Guards"}, headers=coach_headers)
    r = requests.delete(f"{BASE_URL}/api/coach/custom-lists/2026 Guards", headers=coach_headers)
    assert r.status_code == 200
    data = r.json()
    assert "2026 Guards" not in data["custom_lists"]
    print("PASS: Deleted '2026 Guards' custom list")

# Persistence check
def test_persistence_after_create(coach_headers):
    requests.post(f"{BASE_URL}/api/coach/custom-lists", json={"name": "2026 Guards"}, headers=coach_headers)
    r = requests.get(f"{BASE_URL}/api/coach/custom-lists", headers=coach_headers)
    assert r.status_code == 200
    assert "2026 Guards" in r.json()["custom_lists"]
    print("PASS: Custom list persists after creation")
