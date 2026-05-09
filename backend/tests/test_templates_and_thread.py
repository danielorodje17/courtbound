"""Tests for Gap 1 (Thread Panel) and Gap 2 (Message Templates) features"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

COACH_EMAIL = "testcoach@courtbound.edu"
COACH_PASSWORD = "coach1234"


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD})
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}


# ── Backend: Template endpoints ────────────────────────────────────────────────

class TestTemplateEndpoints:
    """GET/POST/DELETE /api/coach/messages/templates"""

    def test_get_templates_returns_3_defaults(self, coach_headers):
        """After v23 migration, coach should have 3 default templates"""
        r = requests.get(f"{BASE_URL}/api/coach/messages/templates", headers=coach_headers)
        assert r.status_code == 200, f"GET templates failed: {r.text}"
        data = r.json()
        assert "templates" in data
        templates = data["templates"]
        defaults = [t for t in templates if t.get("is_default")]
        assert len(defaults) >= 3, f"Expected >=3 default templates, got {len(defaults)}: {templates}"
        print(f"PASS: Found {len(defaults)} default templates")

    def test_get_templates_structure(self, coach_headers):
        """Templates have required fields"""
        r = requests.get(f"{BASE_URL}/api/coach/messages/templates", headers=coach_headers)
        templates = r.json()["templates"]
        for t in templates:
            assert "id" in t
            assert "name" in t
            assert "body" in t
            assert "is_default" in t
        print("PASS: Template structure correct")

    def test_create_custom_template(self, coach_headers):
        """POST /api/coach/messages/templates creates a custom template"""
        payload = {
            "name": "TEST_Custom Template",
            "subject": "Test Subject",
            "body": "This is a test template body for automated testing."
        }
        r = requests.post(f"{BASE_URL}/api/coach/messages/templates", json=payload, headers=coach_headers)
        assert r.status_code == 200, f"POST templates failed: {r.text}"
        data = r.json()
        assert "template" in data
        t = data["template"]
        assert t["name"] == "TEST_Custom Template"
        assert t["is_default"] is False
        assert "id" in t
        print(f"PASS: Created custom template id={t['id']}")
        return t["id"]

    def test_create_and_delete_template(self, coach_headers):
        """Create then delete a custom template"""
        # Create
        r = requests.post(f"{BASE_URL}/api/coach/messages/templates", json={
            "name": "TEST_Delete Me",
            "body": "Template to be deleted."
        }, headers=coach_headers)
        assert r.status_code == 200
        tid = r.json()["template"]["id"]

        # Verify it appears in list
        r2 = requests.get(f"{BASE_URL}/api/coach/messages/templates", headers=coach_headers)
        ids = [t["id"] for t in r2.json()["templates"]]
        assert tid in ids, "Template not found after creation"

        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/coach/messages/templates/{tid}", headers=coach_headers)
        assert r3.status_code == 200, f"DELETE failed: {r3.text}"

        # Verify removed
        r4 = requests.get(f"{BASE_URL}/api/coach/messages/templates", headers=coach_headers)
        ids_after = [t["id"] for t in r4.json()["templates"]]
        assert tid not in ids_after, "Template still present after deletion"
        print(f"PASS: Template {tid} created and deleted successfully")

    def test_create_template_missing_name(self, coach_headers):
        """POST without name returns 400"""
        r = requests.post(f"{BASE_URL}/api/coach/messages/templates", json={"body": "Some body"}, headers=coach_headers)
        assert r.status_code == 400
        print("PASS: Missing name returns 400")

    def test_create_template_missing_body(self, coach_headers):
        """POST without body returns 400"""
        r = requests.post(f"{BASE_URL}/api/coach/messages/templates", json={"name": "Test"}, headers=coach_headers)
        assert r.status_code == 400
        print("PASS: Missing body returns 400")


# ── Backend: Sent Messages endpoint ───────────────────────────────────────────

class TestSentMessages:
    """GET /api/coach/messages/sent — needed for Thread Panel"""

    def test_get_sent_messages(self, coach_headers):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent", headers=coach_headers)
        assert r.status_code == 200, f"GET sent messages failed: {r.text}"
        data = r.json()
        assert "messages" in data
        assert "total" in data
        print(f"PASS: Got sent messages, total={data['total']}")

    def test_sent_messages_enriched_with_player_name(self, coach_headers):
        r = requests.get(f"{BASE_URL}/api/coach/messages/sent", headers=coach_headers)
        messages = r.json()["messages"]
        if messages:
            m = messages[0]
            assert "player_name" in m
            assert "body" in m
            assert "sent_at" in m
            print(f"PASS: Messages enriched, first message player={m['player_name']}")
        else:
            print("SKIP: No sent messages to verify enrichment")

    def test_cleanup_test_templates(self, coach_headers):
        """Remove TEST_ prefixed templates"""
        r = requests.get(f"{BASE_URL}/api/coach/messages/templates", headers=coach_headers)
        for t in r.json()["templates"]:
            if t["name"].startswith("TEST_") and not t["is_default"]:
                requests.delete(f"{BASE_URL}/api/coach/messages/templates/{t['id']}", headers=coach_headers)
        print("PASS: Cleaned up test templates")
