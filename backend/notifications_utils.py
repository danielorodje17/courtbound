"""
Shared notification helpers for CourtBound Coach Portal.
Imported by profile.py, coach_public.py, and scheduler.py to
fire in-app notifications into the coach_notifications table.
"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


async def _notify_coaches_about_player(
    player_user_id: str,
    notif_type: str,
    title: str,
    message: str,
    link: str = None,
):
    """
    Insert a notification for every coach who has this player saved on their board.
    Safe to call fire-and-forget — swallows all exceptions.
    """
    try:
        from supabase_db import supa
        saved = await run_in_threadpool(
            lambda: supa.table("coach_saved_players")
            .select("coach_id")
            .eq("player_user_id", player_user_id)
            .execute()
        )
        coach_ids = list({str(s["coach_id"]) for s in (saved.data or [])})
        if not coach_ids:
            return
        now = datetime.now(timezone.utc).isoformat()
        rows = [
            {
                "coach_id": cid,
                "type": notif_type,
                "title": title,
                "message": message,
                "link": link,
                "is_read": False,
                "created_at": now,
            }
            for cid in coach_ids
        ]
        await run_in_threadpool(lambda: supa.table("coach_notifications").insert(rows).execute())
        logger.info(
            "Notification '%s' queued for %d coach(es) — player %s",
            notif_type, len(coach_ids), player_user_id,
        )
    except Exception as exc:
        logger.warning("_notify_coaches_about_player failed (%s): %s", notif_type, exc)


async def _notify_coach_direct(
    coach_id: str,
    notif_type: str,
    title: str,
    message: str,
    link: str = None,
    throttle_minutes: int = 60,
):
    """
    Insert a notification for a single coach.
    If throttle_minutes > 0, skips if a notification of the same type was already
    inserted for this coach within that window (prevents spam on high-traffic pages).
    """
    try:
        from supabase_db import supa
        if throttle_minutes > 0:
            cutoff = (datetime.now(timezone.utc) - timedelta(minutes=throttle_minutes)).isoformat()
            recent = await run_in_threadpool(
                lambda: supa.table("coach_notifications")
                .select("id", count="exact")
                .eq("coach_id", coach_id)
                .eq("type", notif_type)
                .gte("created_at", cutoff)
                .execute()
            )
            if (recent.count or 0) > 0:
                return  # Already notified recently — skip

        await run_in_threadpool(
            lambda: supa.table("coach_notifications").insert({
                "coach_id": coach_id,
                "type": notif_type,
                "title": title,
                "message": message,
                "link": link,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        )
        logger.info("Direct notification '%s' sent to coach %s", notif_type, coach_id)
    except Exception as exc:
        logger.warning("_notify_coach_direct failed (%s): %s", notif_type, exc)
