import logging
import re
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


def _slug(name: str) -> str:
    s = (name or "").lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    return re.sub(r"-+", "-", s).strip("-")


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


# ── Message Templates ─────────────────────────────────────────────────────────

DEFAULT_TEMPLATES = [
    {
        "name": "Initial Interest Introduction",
        "subject": "Recruiting Interest",
        "body": (
            "Hi, I'm Coach [Name] from [Institution]. We've been following your development "
            "closely and believe you could be a great fit for our programme. We'd love to "
            "connect and tell you more about what we offer. Please feel free to reply with any questions."
        ),
        "is_default": True,
    },
    {
        "name": "Highlight Reel Request",
        "subject": "Film Request",
        "body": (
            "Thank you for your interest in our programme. To continue our evaluation, we'd "
            "love to review your most recent highlight reel and any available game film. "
            "Could you please share a link to your current footage? Any recent competition "
            "film would be very helpful for our process."
        ),
        "is_default": True,
    },
    {
        "name": "Official Visit Invitation",
        "subject": "Official Visit Invitation",
        "body": (
            "We'd like to formally invite you for an official visit to our campus. This would "
            "be a wonderful opportunity to meet our coaching staff, see our facilities, and "
            "experience campus life first-hand. Please let us know your availability and "
            "we'll arrange a date that works for both of us."
        ),
        "is_default": True,
    },
]


async def _seed_default_templates(coach_id: str):
    """Insert default templates for a coach. Safe to call multiple times (checks first)."""
    try:
        existing = await run_in_threadpool(
            lambda: supa.table("coach_message_templates")
            .select("id", count="exact").eq("coach_id", coach_id).execute()
        )
        if (existing.count or 0) > 0:
            return
        rows = [{"coach_id": coach_id, **t} for t in DEFAULT_TEMPLATES]
        await run_in_threadpool(
            lambda: supa.table("coach_message_templates").insert(rows).execute()
        )
    except Exception as e:
        logger.warning(f"Template seeding failed for coach {coach_id}: {e}")


@router.get("/messages/templates")
async def list_templates(coach=Depends(get_current_coach)):
    await _seed_default_templates(str(coach["id"]))
    res = await run_in_threadpool(
        lambda: supa.table("coach_message_templates")
        .select("id, name, subject, body, is_default, created_at")
        .eq("coach_id", coach["id"])
        .order("created_at")
        .execute()
    )
    return {"templates": res.data or []}


@router.post("/messages/templates")
async def save_template(body: dict, coach=Depends(get_current_coach)):
    name = (body.get("name") or "").strip()
    tmpl_body = (body.get("body") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required")
    if not tmpl_body:
        raise HTTPException(status_code=400, detail="Template body is required")
    row = {
        "coach_id": coach["id"],
        "name": name,
        "subject": (body.get("subject") or "").strip() or None,
        "body": tmpl_body,
        "is_default": False,
    }
    res = await run_in_threadpool(lambda: supa.table("coach_message_templates").insert(row).execute())
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to save template")
    t = res.data[0]
    return {"template": {k: t[k] for k in ("id", "name", "subject", "body", "is_default", "created_at")}}


@router.delete("/messages/templates/{template_id}")
async def delete_template(template_id: str, coach=Depends(get_current_coach)):
    await run_in_threadpool(
        lambda: supa.table("coach_message_templates")
        .delete()
        .eq("id", template_id)
        .eq("coach_id", coach["id"])
        .execute()
    )
    return {"message": "Template deleted"}


# ── Send Message (Coach → Player) ─────────────────────────────────────────────

# NOTE: /messages/bulk must be defined BEFORE /messages/{player_user_id} to avoid routing conflict

@router.post("/messages/bulk")
async def send_bulk_message(body: dict, coach=Depends(require_verified_coach)):
    """Send the same message to all non-committed players in a board list."""
    list_name = (body.get("list_name") or "").strip()
    subject = (body.get("subject") or "").strip()
    text = (body.get("body") or "").strip()

    if not list_name:
        raise HTTPException(status_code=400, detail="list_name is required")
    if not text:
        raise HTTPException(status_code=400, detail="Message body is required")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    # Fetch all saved player IDs in this list for this coach
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .select("player_user_id")
        .eq("coach_id", coach["id"])
        .eq("list_name", list_name)
        .execute()
    )
    player_ids = [s["player_user_id"] for s in (saved_res.data or [])]
    if not player_ids:
        raise HTTPException(status_code=400, detail="No players in this list")

    # Fetch commitment status for all players
    profiles_res = await run_in_threadpool(
        lambda: supa.table("profiles")
        .select("user_id, full_name, commitment_status")
        .in_("user_id", player_ids)
        .execute()
    )
    profile_map = {str(p["user_id"]): p for p in (profiles_res.data or [])}

    ncaa_period = _ncaa_period_type(coach)
    sent = 0
    skipped = 0
    skipped_names = []

    for pid in player_ids:
        profile = profile_map.get(str(pid), {})
        if (profile.get("commitment_status") or "uncommitted") == "committed":
            skipped += 1
            skipped_names.append(profile.get("full_name") or "Unknown")
            continue

        row = {
            "coach_id": coach["id"],
            "player_user_id": pid,
            "coach_name": coach["full_name"],
            "coach_institution": coach["institution_name"],
            "coach_division": coach.get("division"),
            "subject": subject or None,
            "body": text,
            "ncaa_period_type": ncaa_period,
            "sent_at": _now(),
            "status": "sent",
        }
        try:
            await run_in_threadpool(lambda r=row: supa.table("coach_messages").insert(r).execute())
            sent += 1
        except Exception as e:
            logger.warning(f"Bulk message insert failed for player {pid}: {e}")

    if sent == 0 and skipped > 0:
        raise HTTPException(
            status_code=400,
            detail=f"All {skipped} player(s) in this list are committed — no messages sent."
        )

    return {
        "sent": sent,
        "skipped": skipped,
        "skipped_names": skipped_names,
        "list_name": list_name,
    }


@router.post("/messages/{player_user_id}")
async def send_message(player_user_id: str, body: dict, coach=Depends(require_verified_coach)):
    subject = (body.get("subject") or "").strip()
    text = (body.get("body") or "").strip()
    scheduled_at_raw = body.get("scheduled_at")
    if not text:
        raise HTTPException(status_code=400, detail="Message body is required")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    # Check player exists and get commitment status
    player_res = await run_in_threadpool(
        lambda: supa.table("profiles")
        .select("user_id, full_name, basketball_gender, commitment_status, committed_to_institution")
        .eq("user_id", player_user_id).limit(1).execute()
    )
    if not player_res.data:
        raise HTTPException(status_code=404, detail="Player not found")

    player = player_res.data[0]
    if (player.get("commitment_status") or "uncommitted") == "committed":
        institution = player.get("committed_to_institution") or "another programme"
        raise HTTPException(
            status_code=403,
            detail=f"This player is committed to {institution}. Messaging committed players is not permitted."
        )

    # Validate scheduled_at if provided
    scheduled_at = None
    status = "sent"
    if scheduled_at_raw:
        try:
            scheduled_at = datetime.fromisoformat(scheduled_at_raw.replace("Z", "+00:00"))
            if scheduled_at <= datetime.now(timezone.utc):
                # Past/now → send immediately
                scheduled_at = None
                status = "sent"
            else:
                status = "scheduled"
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid scheduled_at format")

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
        "status": status,
    }
    if scheduled_at:
        row["scheduled_at"] = scheduled_at.isoformat()

    try:
        result = await run_in_threadpool(lambda: supa.table("coach_messages").insert(row).execute())
    except Exception:
        # Graceful pre-v21 fallback: remove columns that may not exist yet
        row.pop("status", None)
        row.pop("scheduled_at", None)
        result = await run_in_threadpool(lambda: supa.table("coach_messages").insert(row).execute())
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    resp = {
        "message": "Message scheduled" if status == "scheduled" else "Message sent",
        "id": result.data[0]["id"],
        "ncaa_period_type": ncaa_period,
        "status": status,
    }
    if scheduled_at:
        resp["scheduled_at"] = scheduled_at.isoformat()
    return resp


# ── Coach: Sent Messages ───────────────────────────────────────────────────────

@router.get("/messages/sent")
async def get_sent_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    status_filter: str = Query("all", alias="status"),
    coach=Depends(get_current_coach),
):
    offset = (page - 1) * limit
    coach_id = coach["id"]
    try:
        query = supa.table("coach_messages").select("*").eq("coach_id", coach_id)
        if status_filter == "scheduled":
            query = query.eq("status", "scheduled")
        elif status_filter == "sent":
            query = query.eq("status", "sent")
        result = await run_in_threadpool(
            lambda: query.order("sent_at", desc=True).range(offset, offset + limit - 1).execute()
        )
    except Exception:
        # Pre-v21 fallback: status column may not exist yet, ignore filter
        fallback_query = supa.table("coach_messages").select("*").eq("coach_id", coach_id)
        result = await run_in_threadpool(
            lambda: fallback_query.order("sent_at", desc=True).range(offset, offset + limit - 1).execute()
        )
    count_res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("coach_id", coach["id"]).execute()
    )
    try:
        scheduled_count_res = await run_in_threadpool(
            lambda: supa.table("coach_messages").select("id", count="exact")
            .eq("coach_id", coach["id"]).eq("status", "scheduled").execute()
        )
        scheduled_count = scheduled_count_res.count or 0
    except Exception:
        scheduled_count = 0
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
    return {
        "messages": enriched,
        "total": total,
        "scheduled_count": scheduled_count,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


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


@player_router.post("/messages/{message_id}/reply")
async def player_reply_message(message_id: str, body: dict, current_user=Depends(get_current_user)):
    user_id = str(current_user.user_id)
    reply_text = (body.get("reply") or "").strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="Reply text is required")
    if len(reply_text) > 1000:
        raise HTTPException(status_code=400, detail="Reply too long (max 1000 characters)")

    # Ensure message belongs to this player
    msg_res = await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .select("id, player_reply")
        .eq("id", message_id)
        .eq("player_user_id", user_id)
        .limit(1)
        .execute()
    )
    if not msg_res.data:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg_res.data[0].get("player_reply"):
        raise HTTPException(status_code=409, detail="You have already replied to this message")

    await run_in_threadpool(
        lambda: supa.table("coach_messages")
        .update({"player_reply": reply_text, "player_replied_at": _now(), "is_read": True})
        .eq("id", message_id)
        .execute()
    )
    return {"message": "Reply sent"}


@player_router.get("/messages/unread-count")
async def player_unread_count(current_user=Depends(get_current_user)):
    user_id = str(current_user.user_id)
    res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact")
        .eq("player_user_id", user_id).eq("is_read", False).execute()
    )
    return {"unread": res.count or 0}


@player_router.get("/profile-views")
async def get_profile_views(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    """Return paginated list of coaches who viewed this player's profile (deduplicated)."""
    user_id = str(current_user.user_id)

    # All views for this player, newest first
    views_res = await run_in_threadpool(
        lambda: supa.table("coach_player_views")
        .select("coach_id, viewed_at")
        .eq("player_user_id", user_id)
        .order("viewed_at", desc=True)
        .execute()
    )
    views = views_res.data or []

    # Deduplicate: keep most-recent viewed_at per coach + count total views per coach
    seen: dict = {}
    for v in views:
        cid = str(v["coach_id"])
        if cid not in seen:
            seen[cid] = {"coach_id": cid, "last_viewed_at": v["viewed_at"], "view_count": 0}
        seen[cid]["view_count"] += 1

    unique = sorted(seen.values(), key=lambda x: x["last_viewed_at"], reverse=True)
    total = len(unique)
    offset = (page - 1) * limit
    page_items = unique[offset: offset + limit]

    if not page_items:
        return {"views": [], "total": total, "page": page, "pages": max(1, -(-total // limit))}

    coach_ids = [item["coach_id"] for item in page_items]
    coaches_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("id, full_name, institution_name, division, verification_status")
        .in_("id", coach_ids)
        .execute()
    )
    coach_map = {str(c["id"]): c for c in (coaches_res.data or [])}

    result = []
    for item in page_items:
        c = coach_map.get(item["coach_id"], {})
        inst = c.get("institution_name") or ""
        result.append({
            "coach_id": item["coach_id"],
            "coach_name": c.get("full_name") or "Unknown Coach",
            "institution_name": inst,
            "division": c.get("division"),
            "is_verified": c.get("verification_status") == "verified",
            "view_count": item["view_count"],
            "last_viewed_at": item["last_viewed_at"],
            "programme_slug": _slug(inst) if inst else None,
        })

    return {
        "views": result,
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }
