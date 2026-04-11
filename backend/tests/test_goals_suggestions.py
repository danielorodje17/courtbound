"""
Tests for Weekly Goals suggestions feature (Iteration 12)
Tests: GET /api/goals/current returns suggestions + has_history, 
       suggestion defaults, PUT /api/goals/current saves goals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TOKEN = "test_session_iter10"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def test_get_goals_has_suggestions_field():
    """GET /api/goals/current must include 'suggestions' object"""
    r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "suggestions" in data, "Missing 'suggestions' field"
    s = data["suggestions"]
    for key in ["emails_sent", "follow_ups", "new_tracks", "calls"]:
        assert key in s, f"Missing suggestions key: {key}"
    print(f"PASS: suggestions present: {s}")


def test_get_goals_has_history_field():
    """GET /api/goals/current must include 'has_history' boolean"""
    r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "has_history" in data, "Missing 'has_history' field"
    assert isinstance(data["has_history"], bool), "has_history must be boolean"
    print(f"PASS: has_history = {data['has_history']}")


def test_suggestions_are_non_negative_integers():
    """Suggestions must be integers >= 0"""
    r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
    assert r.status_code == 200
    s = r.json()["suggestions"]
    for key, val in s.items():
        assert isinstance(val, int), f"{key} suggestion is not int: {val}"
        assert val >= 0, f"{key} suggestion is negative: {val}"
    print(f"PASS: all suggestions are non-negative integers: {s}")


def test_default_suggestions_when_no_history():
    """When has_history=False, defaults should be emails_sent=3, follow_ups=2, new_tracks=1, calls=1"""
    r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    if not data["has_history"]:
        s = data["suggestions"]
        assert s["emails_sent"] == 3, f"Expected 3 for emails_sent, got {s['emails_sent']}"
        assert s["follow_ups"] == 2, f"Expected 2 for follow_ups, got {s['follow_ups']}"
        assert s["new_tracks"] == 1, f"Expected 1 for new_tracks, got {s['new_tracks']}"
        assert s["calls"] == 1, f"Expected 1 for calls, got {s['calls']}"
        print(f"PASS: defaults verified: {s}")
    else:
        print(f"SKIP: has_history=True, skipping default check. suggestions={data['suggestions']}")


def test_clear_goals_and_verify_empty_state():
    """PUT goals with all zeros creates empty state"""
    zero_goals = {"emails_sent": 0, "follow_ups": 0, "new_tracks": 0, "calls": 0}
    r = requests.put(f"{BASE_URL}/api/goals/current", json=zero_goals, headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    goals = data.get("goals", {})
    for key in ["emails_sent", "follow_ups", "new_tracks", "calls"]:
        assert goals.get(key) == 0, f"Expected 0 for {key}, got {goals.get(key)}"
    print(f"PASS: goals cleared to zeros")


def test_use_suggestions_sets_goals():
    """PUT goals with suggestion values saves them"""
    # First get suggestions
    r = requests.get(f"{BASE_URL}/api/goals/current", headers=HEADERS)
    assert r.status_code == 200
    suggestions = r.json()["suggestions"]
    
    # Save suggestions as goals
    r2 = requests.put(f"{BASE_URL}/api/goals/current", json=suggestions, headers=HEADERS)
    assert r2.status_code == 200
    saved = r2.json()["goals"]
    for key in suggestions:
        assert saved[key] == suggestions[key], f"Mismatch for {key}: expected {suggestions[key]}, got {saved[key]}"
    print(f"PASS: suggestions saved as goals successfully: {saved}")


def test_goals_require_auth():
    """Goals endpoint must return 401 without token"""
    r = requests.get(f"{BASE_URL}/api/goals/current")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    print("PASS: 401 returned without auth")


def test_restore_original_goals():
    """Restore goals to iter11 values: emails_sent=8, follow_ups=4, new_tracks=3, calls=2"""
    original = {"emails_sent": 8, "follow_ups": 4, "new_tracks": 3, "calls": 2}
    r = requests.put(f"{BASE_URL}/api/goals/current", json=original, headers=HEADERS)
    assert r.status_code == 200
    saved = r.json()["goals"]
    assert saved == original, f"Restore failed: {saved}"
    print(f"PASS: goals restored to {original}")
