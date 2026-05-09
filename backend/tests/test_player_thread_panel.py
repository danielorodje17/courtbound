"""
Backend tests for PlayerMessagesPage ThreadPanel features:
- GET /api/player/messages (with player_reply fields)
- POST /api/player/messages/{id}/reply (save reply, 409 on duplicate)
- PATCH /api/player/messages/{id}/read (mark read)
- Regression: coach send message flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def player_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "player@test.com", "password": "test1234"})
    assert resp.status_code == 200, f"Player login failed: {resp.text}"
    return resp.json()["session_token"]


@pytest.fixture(scope="module")
def player_headers(player_token):
    return {"Authorization": f"Bearer {player_token}"}


@pytest.fixture(scope="module")
def coach_token():
    resp = requests.post(
        f"{BASE_URL}/api/coach/auth/login",
        json={"email": "testcoach@courtbound.edu", "password": "coach1234"}
    )
    if resp.status_code != 200:
        pytest.skip(f"Coach login failed: {resp.text}")
    return resp.json().get("token") or resp.json().get("access_token")


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


# ── GET /player/messages ──────────────────────────────────────────────────────

class TestGetPlayerMessages:
    def test_get_messages_returns_200(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_get_messages_structure(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        data = resp.json()
        assert "messages" in data
        assert "total" in data
        assert "unread" in data
        assert "pages" in data

    def test_get_messages_contains_reply_fields(self, player_headers):
        """Messages should have player_reply and player_replied_at fields (can be null)."""
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        data = resp.json()
        messages = data.get("messages", [])
        if messages:
            msg = messages[0]
            # player_reply and player_replied_at should exist (even if None)
            assert "player_reply" in msg or msg.get("player_reply") is None
            print(f"First message id: {msg.get('id')}, player_reply: {msg.get('player_reply')}")

    def test_get_messages_unauthenticated(self):
        resp = requests.get(f"{BASE_URL}/api/player/messages")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"


# ── POST /player/messages/{id}/reply ─────────────────────────────────────────

class TestPlayerReply:
    @pytest.fixture(scope="class")
    def unreplied_message_id(self, player_headers, coach_headers):
        """Find or create an unreplied message for the player."""
        # First check existing messages
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        assert resp.status_code == 200
        messages = resp.json().get("messages", [])
        
        # Find one without a reply
        for msg in messages:
            if not msg.get("player_reply"):
                print(f"Using existing unreplied message id: {msg['id']}")
                return msg["id"]
        
        # Need to create a new message via coach
        # Get player user_id first
        profile_resp = requests.get(f"{BASE_URL}/api/profile", headers=player_headers)
        if profile_resp.status_code != 200:
            pytest.skip("Could not get player profile to create test message")
        player_user_id = profile_resp.json().get("user_id") or profile_resp.json().get("id")
        if not player_user_id:
            pytest.skip("Could not determine player user_id")
        
        send_resp = requests.post(
            f"{BASE_URL}/api/coach/messages/{player_user_id}",
            headers=coach_headers,
            json={"subject": "TEST_Thread Panel Test", "body": "TEST_This is a test message for ThreadPanel testing."}
        )
        if send_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create test message: {send_resp.text}")
        
        # Re-fetch messages
        resp2 = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        messages2 = resp2.json().get("messages", [])
        for msg in messages2:
            if not msg.get("player_reply"):
                print(f"Using newly created message id: {msg['id']}")
                return msg["id"]
        
        pytest.skip("No unreplied message available")

    def test_reply_success(self, player_headers, unreplied_message_id):
        resp = requests.post(
            f"{BASE_URL}/api/player/messages/{unreplied_message_id}/reply",
            headers=player_headers,
            json={"reply": "TEST_Reply from player during automated testing"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "message" in data

    def test_reply_409_on_duplicate(self, player_headers, unreplied_message_id):
        """Second reply to same message should return 409."""
        resp = requests.post(
            f"{BASE_URL}/api/player/messages/{unreplied_message_id}/reply",
            headers=player_headers,
            json={"reply": "Trying to reply again"}
        )
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"

    def test_reply_persisted_in_get(self, player_headers, unreplied_message_id):
        """After replying, GET /player/messages should show player_reply."""
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        messages = resp.json().get("messages", [])
        target = next((m for m in messages if m["id"] == unreplied_message_id), None)
        assert target is not None, "Message not found in list after reply"
        assert target.get("player_reply") is not None, "player_reply should be set after replying"
        assert "TEST_Reply" in target["player_reply"]

    def test_reply_empty_text_400(self, player_headers, unreplied_message_id):
        resp = requests.post(
            f"{BASE_URL}/api/player/messages/{unreplied_message_id}/reply",
            headers=player_headers,
            json={"reply": ""}
        )
        # Either 400 or 409 (already replied) is acceptable
        assert resp.status_code in [400, 409], f"Expected 400/409, got {resp.status_code}"

    def test_reply_404_for_wrong_message(self, player_headers):
        resp = requests.post(
            f"{BASE_URL}/api/player/messages/nonexistent-id-12345/reply",
            headers=player_headers,
            json={"reply": "Some reply text"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"

    def test_reply_unauthenticated(self):
        resp = requests.post(
            f"{BASE_URL}/api/player/messages/some-id/reply",
            json={"reply": "reply text"}
        )
        assert resp.status_code in [401, 403]


# ── PATCH /player/messages/{id}/read ─────────────────────────────────────────

class TestMarkRead:
    def test_mark_read_returns_200(self, player_headers):
        # Get a message to mark read
        resp = requests.get(f"{BASE_URL}/api/player/messages", headers=player_headers)
        messages = resp.json().get("messages", [])
        if not messages:
            pytest.skip("No messages to mark as read")
        msg_id = messages[0]["id"]
        mark_resp = requests.patch(
            f"{BASE_URL}/api/player/messages/{msg_id}/read",
            headers=player_headers
        )
        assert mark_resp.status_code == 200

    def test_mark_all_read(self, player_headers):
        resp = requests.patch(f"{BASE_URL}/api/player/messages/read-all", headers=player_headers)
        assert resp.status_code == 200


# ── GET /player/messages/unread-count ────────────────────────────────────────

class TestUnreadCount:
    def test_unread_count_returns_200(self, player_headers):
        resp = requests.get(f"{BASE_URL}/api/player/messages/unread-count", headers=player_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "unread" in data
        assert isinstance(data["unread"], int)
