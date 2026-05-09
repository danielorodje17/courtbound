"""Phase D P0 + P1 tests: advanced search filters (nationality, commitment_status),
   board inline notes (PATCH /save), board reorder endpoint."""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def coach_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": "testcoach@courtbound.edu",
        "password": "coach1234"
    })
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    token = r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s

class TestAdvancedSearchFilters:
    """Phase D P1 — nationality and commitment_status filters"""

    def test_search_no_filters_returns_players(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/players")
        assert r.status_code == 200
        data = r.json()
        assert "players" in data
        assert data["total"] >= 0
        print(f"Total players: {data['total']}")

    def test_filter_by_nationality_british(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/players?nationality=British")
        assert r.status_code == 200
        data = r.json()
        players = data.get("players", [])
        print(f"British players count: {len(players)}")
        # All returned players should have British in nationality
        for p in players:
            assert "british" in (p.get("nationality") or "").lower(), \
                f"Player {p.get('full_name')} has nationality: {p.get('nationality')}"

    def test_filter_by_commitment_status_uncommitted(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/players?commitment_status=uncommitted")
        assert r.status_code == 200
        data = r.json()
        players = data.get("players", [])
        print(f"Uncommitted players: {len(players)}")
        for p in players:
            assert p.get("commitment_status") == "uncommitted", \
                f"Player {p.get('full_name')} has status: {p.get('commitment_status')}"

    def test_filter_by_commitment_status_committed(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/players?commitment_status=committed")
        assert r.status_code == 200
        data = r.json()
        players = data.get("players", [])
        print(f"Committed players: {len(players)}")
        for p in players:
            assert p.get("commitment_status") == "committed", \
                f"Player {p.get('full_name')} has status: {p.get('commitment_status')}"

    def test_commitment_status_field_in_response(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/players?limit=5")
        assert r.status_code == 200
        players = r.json().get("players", [])
        for p in players:
            assert "commitment_status" in p, f"commitment_status missing from player card: {p.get('full_name')}"

class TestBoardInlineNotes:
    """Phase D P0 — inline notes on board cards"""

    def test_get_saved_players(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/saved")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"Saved players on board: {len(data)}")

    def test_patch_note_on_saved_player(self, coach_session):
        # Get a saved player first
        r = coach_session.get(f"{BASE_URL}/api/coach/saved")
        assert r.status_code == 200
        saved = r.json()
        if not saved:
            pytest.skip("No saved players on board — cannot test inline notes")
        
        uid = saved[0]["player_user_id"]
        note_text = "TEST_note_phase_d_testing"
        
        # Patch note
        r2 = coach_session.patch(f"{BASE_URL}/api/coach/players/{uid}/save", json={"notes": note_text})
        assert r2.status_code == 200, f"PATCH notes failed: {r2.text}"
        
        # Verify persistence
        r3 = coach_session.get(f"{BASE_URL}/api/coach/saved")
        assert r3.status_code == 200
        saved_after = r3.json()
        found = next((s for s in saved_after if s["player_user_id"] == uid), None)
        assert found is not None
        assert found.get("notes") == note_text, f"Note not persisted: {found.get('notes')}"
        print(f"Note persisted: '{found.get('notes')}'")
        
        # Cleanup — clear the note
        coach_session.patch(f"{BASE_URL}/api/coach/players/{uid}/save", json={"notes": None})

class TestBoardReorder:
    """Phase D P0 — within-column reorder endpoint"""

    def test_board_reorder_endpoint(self, coach_session):
        r = coach_session.get(f"{BASE_URL}/api/coach/saved")
        assert r.status_code == 200
        saved = r.json()
        if len(saved) < 2:
            pytest.skip("Need ≥2 saved players for reorder test")
        
        # Build reorder payload with swapped sort_orders
        items = [{"id": s["id"], "sort_order": i} for i, s in enumerate(saved[:2])]
        # Swap
        items[0]["sort_order"], items[1]["sort_order"] = 1, 0
        
        r2 = coach_session.patch(f"{BASE_URL}/api/coach/board/reorder", json={"items": items})
        assert r2.status_code == 200, f"Board reorder failed: {r2.text}"
        print(f"Board reorder response: {r2.json()}")
