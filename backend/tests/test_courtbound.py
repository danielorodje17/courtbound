"""CourtBound API test suite - Auth, Colleges, Tracking, Emails, AI"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@courtbound.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json().get("access_token")

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

# Auth tests
def test_register():
    import random
    email = f"testuser{random.randint(1000,9999)}@test.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Test User", "email": email, "password": "test1234"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["email"] == email

def test_register_duplicate():
    r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Admin", "email": "admin@courtbound.com", "password": "admin123"})
    assert r.status_code == 400

def test_login_admin():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@courtbound.com", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["email"] == "admin@courtbound.com"

def test_login_invalid():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@test.com", "password": "wrongpass"})
    assert r.status_code == 401

def test_me(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "admin@courtbound.com"

# College tests
def test_get_colleges():
    r = requests.get(f"{BASE_URL}/api/colleges")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 25
    assert all("id" in c for c in data)

def test_get_colleges_search():
    r = requests.get(f"{BASE_URL}/api/colleges?search=Duke")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert any("Duke" in c["name"] for c in data)

def test_get_colleges_filter_division():
    r = requests.get(f"{BASE_URL}/api/colleges?division=Division I")
    assert r.status_code == 200
    data = r.json()
    assert all(c["division"] == "Division I" for c in data)

def test_get_colleges_filter_foreign_friendly():
    r = requests.get(f"{BASE_URL}/api/colleges?foreign_friendly=true")
    assert r.status_code == 200
    data = r.json()
    assert all(c["foreign_friendly"] == True for c in data)

def test_get_college_detail():
    # Get duke's id first
    r = requests.get(f"{BASE_URL}/api/colleges?search=Duke")
    colleges = r.json()
    duke_id = colleges[0]["id"]
    r2 = requests.get(f"{BASE_URL}/api/colleges/{duke_id}")
    assert r2.status_code == 200
    data = r2.json()
    assert "coaches" in data
    assert len(data["coaches"]) > 0

def test_get_college_invalid_id():
    r = requests.get(f"{BASE_URL}/api/colleges/invalidid123")
    assert r.status_code == 400

# Dashboard stats
def test_dashboard_stats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "tracked_colleges" in data
    assert "emails_sent" in data
    assert "emails_received" in data

# Track/Untrack colleges
def test_track_and_untrack_college(auth_headers):
    colleges = requests.get(f"{BASE_URL}/api/colleges?search=Duke").json()
    duke_id = colleges[0]["id"]
    
    # Track
    r = requests.post(f"{BASE_URL}/api/my-colleges", json={"college_id": duke_id}, headers=auth_headers)
    assert r.status_code in [200, 400]  # 400 if already tracked
    
    # Get my colleges
    r2 = requests.get(f"{BASE_URL}/api/my-colleges", headers=auth_headers)
    assert r2.status_code == 200
    
    # Untrack
    r3 = requests.delete(f"{BASE_URL}/api/my-colleges/{duke_id}", headers=auth_headers)
    assert r3.status_code == 200

# Email log
def test_create_and_get_email(auth_headers):
    colleges = requests.get(f"{BASE_URL}/api/colleges?search=Duke").json()
    duke_id = colleges[0]["id"]
    
    r = requests.post(f"{BASE_URL}/api/emails", json={
        "college_id": duke_id,
        "direction": "sent",
        "subject": "TEST_ Basketball Scholarship Inquiry",
        "body": "Dear Coach, I am interested in your program.",
        "coach_name": "Jon Scheyer",
        "coach_email": "jscheyer@duke.edu"
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    email_id = data["id"]
    
    # Get emails
    r2 = requests.get(f"{BASE_URL}/api/emails", headers=auth_headers)
    assert r2.status_code == 200
    emails = r2.json()
    assert any(e["id"] == email_id for e in emails)
    
    # Delete
    r3 = requests.delete(f"{BASE_URL}/api/emails/{email_id}", headers=auth_headers)
    assert r3.status_code == 200

# AI endpoints
def test_ai_draft_message(auth_headers):
    r = requests.post(f"{BASE_URL}/api/ai/draft-message", json={
        "college_name": "Duke University",
        "coach_name": "Jon Scheyer",
        "division": "Division I",
        "user_name": "James Smith",
        "user_position": "point guard",
        "user_stats": "England U18, averaging 15 points per game",
        "message_type": "initial_outreach"
    }, headers=auth_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "draft" in data
    assert len(data["draft"]) > 50

def test_ai_strategy(auth_headers):
    r = requests.post(f"{BASE_URL}/api/ai/strategy", json={
        "college_name": "Duke University",
        "coach_name": "Jon Scheyer",
        "response_status": "no_response"
    }, headers=auth_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "strategy" in data
    assert len(data["strategy"]) > 50

def test_logout(auth_headers):
    r = requests.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
    assert r.status_code == 200
