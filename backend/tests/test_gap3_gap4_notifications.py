"""
Tests for Gap 3 (notification backend triggers) and Gap 4 (contact period countdown).
Gap 3: notifications fire when player updates highlight reel or commits,
       and when a player views a coach programme page (throttled).
Gap 4: daily scheduler job notifies D1 coaches 7/1 day before a contact period.
"""

import os
import sys
import time
import pytest
import requests
import asyncio
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch, MagicMock

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ---------------------------------------------------------------------------
# Supabase direct client (service role) for verifying DB state
# ---------------------------------------------------------------------------
from supabase import create_client

SUPA_URL = os.environ.get("SUPABASE_URL", "")
SUPA_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
supa = create_client(SUPA_URL, SUPA_KEY)


# ---------------------------------------------------------------------------
# Fixtures / Helpers
# ---------------------------------------------------------------------------

def login_player():
    """Login as test player, return session_token."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "player@test.com",
        "password": "test1234"
    })
    assert r.status_code == 200, f"Player login failed: {r.text}"
    return r.json()["session_token"]


def login_coach():
    """Login as test coach, return (token, coach_id)."""
    r = requests.post(f"{BASE_URL}/api/coach/auth/login", json={
        "email": "testcoach@courtbound.edu",
        "password": "coach1234"
    })
    assert r.status_code == 200, f"Coach login failed: {r.text}"
    token = r.json()["token"]
    coach_id = r.json().get("coach", {}).get("id")
    return token, coach_id


def get_player_user_id():
    """Return the user_id for player@test.com from the users table."""
    res = supa.table("users").select("id").eq("email", "player@test.com").execute()
    assert res.data, "Player not found in users table"
    return str(res.data[0]["id"])


def get_coach_account_id(coach_user_id=None):
    """Return the coach_accounts.id for testcoach@courtbound.edu."""
    res = supa.table("coach_accounts").select("id").eq("email", "testcoach@courtbound.edu").limit(1).execute()
    if not res.data:
        return None
    return str(res.data[0]["id"])


def cleanup_notifications(coach_id: str, notif_types: list):
    """Remove test-created notifications for cleanup."""
    for t in notif_types:
        try:
            supa.table("coach_notifications").delete().eq("coach_id", coach_id).eq("type", t).execute()
        except Exception:
            pass


def ensure_player_saved_by_coach(coach_token: str, player_user_id: str):
    """Ensure the coach has saved the player to their board."""
    r = requests.post(
        f"{BASE_URL}/api/coach/players/{player_user_id}/save",
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    # 200 or 409 (already saved) both acceptable
    assert r.status_code in (200, 201, 409), f"Save player failed: {r.status_code} {r.text}"


def ensure_player_not_saved_by_coach(coach_token: str, player_user_id: str):
    """Ensure the coach does NOT have the player saved (unsave if needed)."""
    r = requests.delete(
        f"{BASE_URL}/api/coach/players/{player_user_id}/save",
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    # 200, 204 or 404 all acceptable
    assert r.status_code in (200, 204, 404), f"Unsave player failed: {r.status_code} {r.text}"


# ---------------------------------------------------------------------------
# Gap 3 — Profile regression test
# ---------------------------------------------------------------------------

class TestProfileRegression:
    """Regression: PUT /api/profile still works after notification pre-fetch."""

    def test_put_profile_returns_200(self):
        """PUT /api/profile must return 200 with existing fields."""
        token = login_player()
        r = requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Test Player",
                "graduation_year": "2026",
            }
        )
        assert r.status_code == 200, f"PUT /api/profile returned {r.status_code}: {r.text}"
        data = r.json()
        assert "message" in data or "profile" in data, f"Unexpected response: {data}"
        print("PASS: PUT /api/profile returns 200")


# ---------------------------------------------------------------------------
# Gap 3 — Highlight Reel Notification
# ---------------------------------------------------------------------------

class TestHighlightReelNotification:
    """Gap 3: notify coaches when a player updates their highlight tape URL."""

    def test_highlight_reel_notifies_coaches(self):
        coach_token, coach_user_id = login_coach()
        player_token = login_player()
        player_user_id = get_player_user_id()
        coach_id = get_coach_account_id()
        assert coach_id, "Could not find coach_accounts row"

        # Ensure coach has player saved
        ensure_player_saved_by_coach(coach_token, player_user_id)

        # Clean up any prior highlight_reel notifications
        cleanup_notifications(coach_id, ["highlight_reel"])

        # First set a known old reel URL
        unique_old = f"https://youtube.com/old-reel-{int(time.time())}"
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": unique_old}
        )
        time.sleep(1)  # let asyncio.ensure_future settle

        # Now update with a NEW reel URL
        unique_new = f"https://youtube.com/new-reel-{int(time.time())}"
        r = requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": unique_new}
        )
        assert r.status_code == 200
        time.sleep(2)  # let async fire-and-forget complete

        # Verify notification in DB
        res = supa.table("coach_notifications") \
            .select("*") \
            .eq("coach_id", coach_id) \
            .eq("type", "highlight_reel") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        assert res.data, "Expected a highlight_reel notification but found none"
        notif = res.data[0]
        print(f"PASS: highlight_reel notification created: {notif['title']}")

        # Verify title contains player name
        assert "highlight" in notif["title"].lower() or "footage" in notif["title"].lower(), \
            f"Title unexpected: {notif['title']}"

        # Verify link is /coach/players/{user_id}
        assert notif["link"] == f"/coach/players/{player_user_id}", \
            f"Link mismatch: {notif['link']}"

        # Cleanup
        cleanup_notifications(coach_id, ["highlight_reel"])

    def test_no_highlight_notification_if_url_unchanged(self):
        """No notification if URL is the same."""
        coach_token, _ = login_coach()
        player_token = login_player()
        player_user_id = get_player_user_id()
        coach_id = get_coach_account_id()
        ensure_player_saved_by_coach(coach_token, player_user_id)
        cleanup_notifications(coach_id, ["highlight_reel"])

        # Set URL
        same_url = "https://youtube.com/same-reel-stable"
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": same_url}
        )
        time.sleep(1)
        cleanup_notifications(coach_id, ["highlight_reel"])

        # PUT again with the SAME url
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": same_url}
        )
        time.sleep(2)

        res = supa.table("coach_notifications") \
            .select("id") \
            .eq("coach_id", coach_id) \
            .eq("type", "highlight_reel") \
            .execute()
        assert not res.data, "Should NOT create notification if URL unchanged"
        print("PASS: no highlight_reel notification when URL unchanged")


# ---------------------------------------------------------------------------
# Gap 3 — Commitment Notification
# ---------------------------------------------------------------------------

class TestCommitmentNotification:
    """Gap 3: notify coaches when player commits."""

    def test_commitment_notifies_coaches(self):
        coach_token, _ = login_coach()
        player_token = login_player()
        player_user_id = get_player_user_id()
        coach_id = get_coach_account_id()
        assert coach_id

        ensure_player_saved_by_coach(coach_token, player_user_id)
        cleanup_notifications(coach_id, ["commitment"])

        # Reset player commitment_status to uncommitted first
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"commitment_status": "uncommitted", "full_name": "Test Player"}
        )
        time.sleep(1)

        # Now commit
        r = requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={
                "commitment_status": "committed",
                "committed_to_institution": "State University",
                "full_name": "Test Player"
            }
        )
        assert r.status_code == 200
        time.sleep(2)

        res = supa.table("coach_notifications") \
            .select("*") \
            .eq("coach_id", coach_id) \
            .eq("type", "commitment") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        assert res.data, "Expected a commitment notification but found none"
        notif = res.data[0]
        print(f"PASS: commitment notification: {notif['title']}")

        assert "committed" in notif["title"].lower(), f"Title doesn't say committed: {notif['title']}"
        assert notif["link"] == f"/coach/players/{player_user_id}"

        # Cleanup
        cleanup_notifications(coach_id, ["commitment"])
        # Reset status
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"commitment_status": "uncommitted"}
        )


# ---------------------------------------------------------------------------
# Gap 3 — No notification if no coaches saved the player
# ---------------------------------------------------------------------------

class TestNoNotificationWithNoSavedCoaches:
    """Gap 3: no notification rows if no coach has saved the player."""

    def test_no_notifications_if_player_not_saved(self):
        """Create a fresh user (or ensure player is not saved) and update profile."""
        player_token = login_player()
        player_user_id = get_player_user_id()
        coach_token, _ = login_coach()

        # Unsave the player from the coach board
        ensure_player_not_saved_by_coach(coach_token, player_user_id)
        time.sleep(0.5)

        # Count notifications before
        before_res = supa.table("coach_notifications") \
            .select("id", count="exact") \
            .eq("type", "highlight_reel") \
            .execute()
        count_before = before_res.count or 0

        # Update profile with new reel URL
        unique_url = f"https://youtube.com/reel-nosave-{int(time.time())}"
        # First set a different old URL
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": f"https://youtube.com/old-{int(time.time())}"}
        )
        time.sleep(1)
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {player_token}"},
            json={"highlight_tape_url": unique_url}
        )
        time.sleep(2)

        after_res = supa.table("coach_notifications") \
            .select("id", count="exact") \
            .eq("type", "highlight_reel") \
            .execute()
        count_after = after_res.count or 0
        assert count_after == count_before, \
            f"Expected no new notifications but count changed from {count_before} to {count_after}"
        print("PASS: no notifications when player is not saved by any coach")

        # Re-save for subsequent tests
        ensure_player_saved_by_coach(coach_token, player_user_id)


# ---------------------------------------------------------------------------
# Gap 3 — Programme View Notification (throttled)
# ---------------------------------------------------------------------------

class TestProgrammeViewNotification:
    """Gap 3: programme view fires a throttled notification for the coach."""

    def _get_coach_slug(self):
        """Get a valid slug from the test coach's institution_name."""
        res = supa.table("coach_accounts").select("institution_name").eq("email", "testcoach@courtbound.edu").limit(1).execute()
        inst = res.data[0]["institution_name"] if res.data else None
        if not inst:
            return None
        import re
        slug = inst.lower()
        slug = re.sub(r"[^a-z0-9\s-]", "", slug)
        slug = re.sub(r"\s+", "-", slug.strip())
        slug = re.sub(r"-+", "-", slug)
        return slug.strip("-")

    def test_programme_view_creates_notification(self):
        coach_id = get_coach_account_id()
        assert coach_id

        # Clean up prior programme_view notifications
        cleanup_notifications(coach_id, ["programme_view"])

        slug = self._get_coach_slug()
        assert slug, "Could not determine coach slug"
        print(f"Using slug: {slug}")

        r = requests.get(f"{BASE_URL}/api/coach/public/{slug}")
        assert r.status_code == 200, f"GET /api/coach/public/{slug} failed: {r.text}"
        time.sleep(2)  # let asyncio fire-and-forget complete

        res = supa.table("coach_notifications") \
            .select("*") \
            .eq("coach_id", coach_id) \
            .eq("type", "programme_view") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        assert res.data, "Expected a programme_view notification but found none"
        notif = res.data[0]
        print(f"PASS: programme_view notification: {notif['title']}")
        assert "viewed" in notif["title"].lower() or "programme" in notif["title"].lower()

    def test_programme_view_throttled_no_duplicate(self):
        """Second call within 60 min should NOT create another notification."""
        coach_id = get_coach_account_id()
        slug = self._get_coach_slug()

        # Clean and fire first
        cleanup_notifications(coach_id, ["programme_view"])
        requests.get(f"{BASE_URL}/api/coach/public/{slug}")
        time.sleep(2)

        count_after_first = supa.table("coach_notifications") \
            .select("id", count="exact") \
            .eq("coach_id", coach_id) \
            .eq("type", "programme_view") \
            .execute().count or 0

        # Fire a second time immediately
        requests.get(f"{BASE_URL}/api/coach/public/{slug}")
        time.sleep(2)

        count_after_second = supa.table("coach_notifications") \
            .select("id", count="exact") \
            .eq("coach_id", coach_id) \
            .eq("type", "programme_view") \
            .execute().count or 0

        assert count_after_second == count_after_first, \
            f"Throttle failed: count went from {count_after_first} to {count_after_second}"
        print("PASS: programme_view throttle works — no duplicate within 60 min")

        # Cleanup
        cleanup_notifications(coach_id, ["programme_view"])


# ---------------------------------------------------------------------------
# Gap 4 — Scheduler job registration
# ---------------------------------------------------------------------------

class TestSchedulerJobs:
    """Gap 4: all 3 scheduler jobs must be registered."""

    def test_scheduler_has_contact_period_countdown_job(self):
        """Check backend logs confirm 'contact_period_countdown' job."""
        import subprocess
        logs = subprocess.run(
            ["tail", "-n", "2000", "/var/log/supervisor/backend.err.log"],
            capture_output=True, text=True
        ).stdout
        assert "_notify_contact_period_countdown" in logs or "contact_period_countdown" in logs, \
            "Did not find contact_period_countdown in backend logs"
        print("PASS: contact_period_countdown job found in logs")

    def test_scheduler_all_three_jobs_started(self):
        """Scheduler logs must mention all 3 jobs."""
        import subprocess
        logs = subprocess.run(
            ["tail", "-n", "2000", "/var/log/supervisor/backend.err.log"],
            capture_output=True, text=True
        ).stdout
        assert "_process_trial_reminders" in logs or "trial reminder" in logs.lower()
        assert "_dispatch_scheduled_messages" in logs or "scheduled message" in logs.lower()
        assert "_notify_contact_period_countdown" in logs or "contact_period_countdown" in logs
        print("PASS: all 3 scheduler jobs registered")


# ---------------------------------------------------------------------------
# Gap 4 — Countdown Logic (direct call with mocked date)
# ---------------------------------------------------------------------------

class TestContactPeriodCountdown:
    """Gap 4: countdown job inserts notifications for D1 coaches at 7/1 day mark."""

    def _get_d1_verified_coach_id(self):
        """Get a verified D1 coach id (update division if needed)."""
        ca_res = supa.table("coach_accounts").select("id,division,verification_status").eq("email", "testcoach@courtbound.edu").limit(1).execute()
        if not ca_res.data:
            return None
        coach = ca_res.data[0]
        coach_id = str(coach["id"])

        # Ensure verified + D1 for this test
        if coach["division"] != "NCAA D1" or coach["verification_status"] != "verified":
            supa.table("coach_accounts").update({
                "division": "NCAA D1",
                "verification_status": "verified"
            }).eq("id", coach_id).execute()
            print(f"Updated coach {coach_id} to NCAA D1 verified for countdown test")

        return coach_id

    def _restore_coach_division(self, coach_id):
        """Restore coach to NAIA after test."""
        supa.table("coach_accounts").update({"division": "NAIA"}).eq("id", coach_id).execute()

    def test_countdown_7_days_inserts_notification(self):
        """Call countdown func with mocked date 7 days before next D1 contact/evaluation period."""
        sys.path.insert(0, "/app/backend")
        from routers.coach_dashboard import RECRUITING_CALENDAR

        today_real = datetime.now(timezone.utc).date()
        d1_calendar = RECRUITING_CALENDAR.get("NCAA D1", [])

        # Find next period starting after today
        upcoming = [
            p for p in d1_calendar
            if p["type"] in ("contact", "evaluation")
            and datetime.strptime(p["start"], "%Y-%m-%d").date() > today_real
        ]
        if not upcoming:
            pytest.skip("No upcoming contact/evaluation periods in D1 calendar")

        upcoming.sort(key=lambda p: p["start"])
        next_period = upcoming[0]
        start_date = datetime.strptime(next_period["start"], "%Y-%m-%d").date()
        mock_today = start_date - timedelta(days=7)
        print(f"Mocking today={mock_today} → 7 days before {start_date} ({next_period['label']})")

        coach_id = self._get_d1_verified_coach_id()
        assert coach_id

        # Clean prior countdown notifications
        supa.table("coach_notifications").delete().eq("coach_id", coach_id).eq("type", "contact_countdown").execute()

        # Patch datetime.now inside the scheduler module
        mock_dt = datetime.combine(mock_today, datetime.min.time()).replace(tzinfo=timezone.utc)

        async def run_countdown():
            from scheduler import _notify_contact_period_countdown
            with patch("scheduler.datetime") as mock_datetime_cls:
                mock_datetime_cls.now.return_value = mock_dt
                mock_datetime_cls.strptime.side_effect = datetime.strptime
                mock_datetime_cls.combine = datetime.combine
                await _notify_contact_period_countdown()

        asyncio.run(run_countdown())
        time.sleep(1)

        res = supa.table("coach_notifications") \
            .select("*") \
            .eq("coach_id", coach_id) \
            .eq("type", "contact_countdown") \
            .execute()
        assert res.data, "Expected contact_countdown notification but found none"
        notif = res.data[0]
        assert "7 days" in notif["title"], f"Title should mention 7 days: {notif['title']}"
        print(f"PASS: countdown notification inserted: {notif['title']}")

        # Cleanup
        supa.table("coach_notifications").delete().eq("coach_id", coach_id).eq("type", "contact_countdown").execute()
        self._restore_coach_division(coach_id)

    def test_countdown_dedup_no_double_insert(self):
        """Calling countdown twice should only insert ONE notification per coach."""
        sys.path.insert(0, "/app/backend")
        from routers.coach_dashboard import RECRUITING_CALENDAR

        today_real = datetime.now(timezone.utc).date()
        d1_calendar = RECRUITING_CALENDAR.get("NCAA D1", [])
        upcoming = [
            p for p in d1_calendar
            if p["type"] in ("contact", "evaluation")
            and datetime.strptime(p["start"], "%Y-%m-%d").date() > today_real
        ]
        if not upcoming:
            pytest.skip("No upcoming contact/evaluation periods in D1 calendar")
        upcoming.sort(key=lambda p: p["start"])
        start_date = datetime.strptime(upcoming[0]["start"], "%Y-%m-%d").date()
        mock_today = start_date - timedelta(days=7)
        mock_dt = datetime.combine(mock_today, datetime.min.time()).replace(tzinfo=timezone.utc)

        coach_id = self._get_d1_verified_coach_id()
        supa.table("coach_notifications").delete().eq("coach_id", coach_id).eq("type", "contact_countdown").execute()

        async def run_countdown():
            from scheduler import _notify_contact_period_countdown
            with patch("scheduler.datetime") as mock_datetime_cls:
                mock_datetime_cls.now.return_value = mock_dt
                mock_datetime_cls.strptime.side_effect = datetime.strptime
                await _notify_contact_period_countdown()

        asyncio.run(run_countdown())
        time.sleep(0.5)
        asyncio.run(run_countdown())
        time.sleep(0.5)

        res = supa.table("coach_notifications") \
            .select("id", count="exact") \
            .eq("coach_id", coach_id) \
            .eq("type", "contact_countdown") \
            .execute()
        count = res.count or 0
        assert count == 1, f"Dedup failed: expected 1 notification but got {count}"
        print("PASS: countdown dedup — only 1 notification inserted on double call")

        # Cleanup
        supa.table("coach_notifications").delete().eq("coach_id", coach_id).eq("type", "contact_countdown").execute()
        self._restore_coach_division(coach_id)


# ---------------------------------------------------------------------------
# Import sanity check
# ---------------------------------------------------------------------------

class TestImports:
    """Verify imports cleanly with no circular imports."""

    def test_notifications_utils_import(self):
        sys.path.insert(0, "/app/backend")
        import importlib
        mod = importlib.import_module("notifications_utils")
        assert hasattr(mod, "_notify_coaches_about_player")
        assert hasattr(mod, "_notify_coach_direct")
        print("PASS: notifications_utils imports cleanly")

    def test_scheduler_import(self):
        sys.path.insert(0, "/app/backend")
        import importlib
        mod = importlib.import_module("scheduler")
        assert hasattr(mod, "_notify_contact_period_countdown")
        assert hasattr(mod, "start_scheduler")
        print("PASS: scheduler imports cleanly")
