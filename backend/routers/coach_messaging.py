import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from routers.coach_auth import get_current_coach, require_verified_coach
from auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coach", tags=["coach-messaging"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ncaa_period_type(coach: dict) -> str:
    """Returns current recruiting period type for compliance warning."""
    # For simplicity, NAIA/D2/JUCO are always "contact" (open recruiting)
    division = coach.get("division", "")
    if division in ("NAIA", "NCAA D2", "JUCO"):
        return "contact"
    # For D1, use today's date against a simplified calendar
    from datetime import date
    today = date.today().isoformat()
    D1_CALENDAR = [
        ("2025-08-01", "2025-11-09", "contact"),
        ("2025-11-10", "2025-11-12", "dead"),
        ("2025-11-12", "2025-11-19", "contact"),
        ("2025-11-20", "2026-01-11", "quiet"),
        ("2026-01-12", "2026-03-07", "contact"),
        ("2026-03-08", "2026-04-15", "evaluation"),
        ("2026-04-16", "2026-05-21", "contact"),
    ]
    for start, end, ptype in D1_CALENDAR:
        if start <= today <= end:
            return ptype
    return "dead"  # default safe fallback


# ── Send Message (Coach → Player) ─────────────────────────────────────────────

@router.post("/messages/{player_user_id}")
async def send_message(player_user_id: str, body: dict, coach=Depends(require_verified_coach)):
    subject = (body.get("subject") or "").strip()
    text = (body.get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message body is required")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    # Check player exists
    player_res = await run_in_threadpool(
        lambda: supa.table("profiles").select("user_id, full_name, basketball_gender")
        .eq("user_id", player_user_id).limit(1).execute()
    )
    if not player_res.data:
        raise HTTPException(status_code=404, detail="Player not found")

    ncaa_period = _ncaa_period_type(coach)

    row = {
        "coach_id": coach["id"],
        "player_user_id": player_user_id,
        "coach_name": coach["full_name"],
        "coach_institution": coach["institution_name"],
        "coach_division": coach.get("division"),
        "subject": subject or None,
        "body": text,
        "ncaa_period_type": ncaa_period,
        "sent_at": _now(),
    }

    result = await run_in_threadpool(lambda: supa.table("coach_messages").insert(row).execute())
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    # Create notification for player (stored in coach_notifications for now — future: player notifs)
    # For player-side unread badge we rely on is_read = false on the message itself
    return {
        "message": "Message sent",
        "id": result.data[0]["id"],
        "ncaa_period_type": ncaa_period,
    }


# ── Coach: Sent Messages ───────────────────────────────────────────────────────

@router.get("/messages/sent")
async def get_sent_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    coach=Depends(get_current_coach),
):
    offset = (page - 1) * limit
    result = await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .select("*")
        .eq("coach_id", coach["id"])
        .order("sent_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    count_res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("coach_id", coach["id"]).execute()
    )
    messages = result.data or []

    # Enrich with player names
    user_ids = list({m["player_user_id"] for m in messages})
    profiles = {}
    if user_ids:
        p_res = await run_in_threadpool(
            lambda: supa.table("profiles").select("user_id, full_name, position, club_team")
            .in_("user_id", user_ids).execute()
        )
        profiles = {str(p["user_id"]): p for p in (p_res.data or [])}

    enriched = []
    for m in messages:
        p = profiles.get(str(m["player_user_id"]), {})
        enriched.append({
            **{k: v for k, v in m.items() if k != "coach_id"},
            "player_name": p.get("full_name", "Unknown Player"),
            "player_position": p.get("position"),
            "player_club": p.get("club_team"),
        })

    total = count_res.count or 0
    return {"messages": enriched, "total": total, "page": page, "pages": max(1, -(-total // limit))}


# ── Player: Inbox (uses standard player auth) ────────────────────────────────

player_router = APIRouter(prefix="/player", tags=["player-messages"])


@player_router.get("/messages")
async def get_player_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    user_id = str(current_user.user_id)
    offset = (page - 1) * limit

    result = await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .select("*")
        .eq("player_user_id", user_id)
        .order("sent_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    count_res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("player_user_id", user_id).execute()
    )
    unread_res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("player_user_id", user_id).eq("is_read", False).execute()
    )

    total = count_res.count or 0
    return {
        "messages": result.data or [],
        "total": total,
        "unread": unread_res.count or 0,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


@player_router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user.user_id)
    await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .update({"is_read": True})
        .eq("id", message_id)
        .eq("player_user_id", user_id)
        .execute()
    )
    return {"message": "Marked as read"}


@player_router.patch("/messages/read-all")
async def mark_all_messages_read(current_user=Depends(get_current_user)):
    user_id = str(current_user.user_id)
    await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .update({"is_read": True})
        .eq("player_user_id", user_id)
        .execute()
    )
    return {"message": "All messages marked as read"}


@player_router.get("/messages/unread-count")
async def player_unread_count(current_user=Depends(get_current_user)):
    user_id = str(current_user.user_id)
    res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("player_user_id", user_id).eq("is_read", False).execute()
    )
    return {"unread": res.count or 0}
