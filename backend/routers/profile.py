import logging
import asyncio
from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import PlayerProfile

router = APIRouter(tags=["profile"])
logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/profile")
async def get_profile(current_user: UserModel = Depends(get_current_user)):
    result = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", current_user.user_id).execute()
    )
    if not result.data:
        return {}
    doc = result.data[0]
    doc.pop("user_id", None)
    doc.pop("id", None)
    return doc


@router.put("/profile")
async def save_profile(data: PlayerProfile, current_user: UserModel = Depends(get_current_user)):
    user_id = str(current_user.user_id)

    # Fetch current profile BEFORE save — needed to detect changes for notifications
    current_res = await run_in_threadpool(
        lambda: supa.table("profiles")
        .select("highlight_tape_url, commitment_status, full_name")
        .eq("user_id", user_id)
        .limit(1).execute()
    )
    old = current_res.data[0] if current_res.data else {}

    payload = {k: v for k, v in data.dict().items() if v is not None and v != ""}
    # Map primary_position → position (Supabase column name is 'position')
    if "primary_position" in payload:
        if not payload.get("position"):
            payload["position"] = payload["primary_position"]
        del payload["primary_position"]
    # Convert empty date string to None for PostgreSQL DATE type
    if payload.get("date_of_birth") == "":
        payload["date_of_birth"] = None
    payload["user_id"] = user_id
    payload["updated_at"] = _now()

    try:
        await run_in_threadpool(
            lambda: supa.table("profiles").upsert(payload, on_conflict="user_id").execute()
        )
    except Exception:
        # Graceful pre-migration fallback: remove columns that may not exist yet
        for col in ("basketball_gender", "lead_source", "target_division_2",
                    "commitment_status", "committed_to_institution"):
            payload.pop(col, None)
        await run_in_threadpool(
            lambda: supa.table("profiles").upsert(payload, on_conflict="user_id").execute()
        )

    # Fire notifications asynchronously (don't block the response)
    asyncio.ensure_future(_fire_profile_notifications(user_id, data.dict(), old))

    return {"message": "Profile saved"}


async def _fire_profile_notifications(user_id: str, new_data: dict, old: dict):
    """Fire coach notifications when a player updates key profile fields."""
    try:
        from notifications_utils import _notify_coaches_about_player
        player_name = (new_data.get("full_name") or old.get("full_name") or "A saved player").strip()
        player_link = f"/coach/players/{user_id}"

        # 1. Highlight reel updated
        old_reel = (old.get("highlight_tape_url") or "").strip()
        new_reel = (new_data.get("highlight_tape_url") or "").strip()
        if new_reel and new_reel != old_reel:
            await _notify_coaches_about_player(
                user_id,
                "highlight_reel",
                f"{player_name} added new highlight footage",
                "They've updated their highlight reel — check it out on their profile.",
                player_link,
            )

        # 2. Player committed
        old_status = (old.get("commitment_status") or "uncommitted").strip()
        new_status = (new_data.get("commitment_status") or "").strip()
        if new_status and new_status != old_status and new_status == "committed":
            institution = (new_data.get("committed_to_institution") or "another programme").strip()
            await _notify_coaches_about_player(
                user_id,
                "commitment",
                f"{player_name} has committed",
                f"They have committed to {institution}. Their profile is now locked for messaging.",
                player_link,
            )
    except Exception as exc:
        logger.warning("Profile notification trigger failed: %s", exc)
