import os
import logging
from fastapi import APIRouter, Depends, Path, HTTPException
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone, timedelta
from typing import Optional
from supabase_db import supa
from routers.coach_auth import get_current_coach, require_verified_coach
from routers.coach_players import calculate_match_score, _player_card
from routers.admin import require_admin_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coach", tags=["coach-dashboard"])


# ── Recruiting Calendar (hard-coded 2025-26) ─────────────────────────────────

RECRUITING_CALENDAR = {
    "NCAA D1": [
        {"start": "2025-04-16", "end": "2025-05-31", "type": "dead", "label": "Dead Period",
         "description": "No in-person recruiting contact or evaluations. No official/unofficial visits."},
        {"start": "2025-06-01", "end": "2025-07-31", "type": "evaluation", "label": "Evaluation Period",
         "description": "Coaches may observe athletes at their institution. No off-campus evaluation or contact."},
        {"start": "2025-08-01", "end": "2025-11-09", "type": "contact", "label": "Contact Period",
         "description": "In-person, off-campus recruiting contact and evaluations permitted."},
        {"start": "2025-11-10", "end": "2025-11-12", "type": "dead", "label": "Dead Period",
         "description": "No in-person recruiting contact or evaluations."},
        {"start": "2025-11-12", "end": "2025-11-19", "type": "contact", "label": "Early Signing Period",
         "description": "Early National Letter of Intent signing period opens. Contact permitted."},
        {"start": "2025-11-20", "end": "2026-01-11", "type": "quiet", "label": "Quiet Period",
         "description": "No in-person, off-campus recruiting. On-campus visits permitted."},
        {"start": "2026-01-12", "end": "2026-03-07", "type": "contact", "label": "Contact Period",
         "description": "In-person, off-campus recruiting contact and evaluations permitted."},
        {"start": "2026-03-08", "end": "2026-04-15", "type": "evaluation", "label": "Evaluation Period",
         "description": "Coaches may observe athletes at their institution."},
        {"start": "2026-04-16", "end": "2026-05-21", "type": "contact", "label": "Regular Signing Period",
         "description": "Regular National Letter of Intent signing period."},
        {"start": "2026-05-22", "end": "2026-07-31", "type": "dead", "label": "Dead Period",
         "description": "No in-person recruiting contact or evaluations."},
    ],
    "NCAA D2": [
        {"start": "2025-04-16", "end": "2026-07-31", "type": "contact", "label": "Contact Year-Round",
         "description": "D2 coaches may contact prospective student-athletes year-round."},
        {"start": "2025-11-10", "end": "2025-11-12", "type": "dead", "label": "Dead Period",
         "description": "No in-person recruiting contact or evaluations (Nov 10-12 only)."},
    ],
    "NAIA": [
        {"start": "2025-04-16", "end": "2026-07-31", "type": "contact", "label": "Open Recruiting",
         "description": "NAIA has open recruiting — coaches can contact prospective athletes year-round with no calendar restrictions."},
    ],
    "JUCO": [
        {"start": "2025-04-16", "end": "2026-07-31", "type": "contact", "label": "Open Recruiting",
         "description": "NJCAA has open recruiting — coaches can contact prospective athletes year-round."},
    ],
}


def _get_current_period(division: str) -> Optional[dict]:
    today = datetime.now(timezone.utc).date().isoformat()
    calendar = RECRUITING_CALENDAR.get(division, RECRUITING_CALENDAR["NAIA"])
    for period in reversed(calendar):
        if period["start"] <= today <= period["end"]:
            return period
    return None


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def coach_dashboard(coach=Depends(require_verified_coach)):
    coach_id = coach["id"]
    sport = coach.get("primary_sport", "").lower()
    gender = "men" if "men's" in sport or "men" in sport else "women"
    prefs = coach.get("recruiting_prefs") or {}

    # ── Stats ──
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players").select("player_user_id", count="exact").eq("coach_id", coach_id).execute()
    )
    saved_count = saved_res.count or 0
    saved_ids = {str(s["player_user_id"]) for s in (saved_res.data or [])}

    notif_res = await run_in_threadpool(
        lambda: supa.table("coach_notifications").select("id", count="exact")
        .eq("coach_id", coach_id).eq("is_read", False).execute()
    )
    unread_count = notif_res.count or 0

    # New profiles this week
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_players_res = await run_in_threadpool(
        lambda: supa.table("profiles").select("user_id", count="exact")
        .eq("basketball_gender", gender).gte("created_at", week_ago).execute()
    )
    new_this_week = new_players_res.count or 0

    # Views of coach's programme by players (simplified — count profile views)
    views_res = await run_in_threadpool(
        lambda: supa.table("coach_player_views").select("id", count="exact")
        .eq("coach_id", coach_id).gte("viewed_at", week_ago).execute()
    )
    profiles_viewed = views_res.count or 0

    # ── Recommended Players ──
    all_profiles = await run_in_threadpool(
        lambda: supa.table("profiles")
        .select("*")
        .eq("basketball_gender", gender)
        .not_.is_("full_name", "null")
        .limit(100)
        .execute()
    )
    players = all_profiles.data or []
    cards = [_player_card(p, prefs, saved_ids) for p in players]
    cards.sort(key=lambda c: c["match_score"], reverse=True)
    recommended = cards[:12]

    # ── Activity Feed ──
    activity = []
    notifs_res = await run_in_threadpool(
        lambda: supa.table("coach_notifications").select("*")
        .eq("coach_id", coach_id)
        .order("created_at", desc=True)
        .limit(15)
        .execute()
    )
    for n in (notifs_res.data or []):
        activity.append({
            "id": n["id"],
            "title": n["title"],
            "message": n.get("message"),
            "link": n.get("link"),
            "is_read": n.get("is_read", False),
            "created_at": n.get("created_at"),
            "type": n.get("type"),
        })

    # ── Current recruiting period for coach's division ──
    div_map = {"NCAA D1": "NCAA D1", "NCAA D2": "NCAA D2", "NAIA": "NAIA", "JUCO": "JUCO"}
    cal_key = div_map.get(coach.get("division", ""), "NAIA")
    current_period = _get_current_period(cal_key)

    return {
        "stats": {
            "saved_count": saved_count,
            "new_this_week": new_this_week,
            "unread_notifications": unread_count,
            "profiles_viewed_this_week": profiles_viewed,
        },
        "recommended": recommended,
        "activity": activity,
        "current_period": current_period,
        "recruiting_calendar": RECRUITING_CALENDAR.get(cal_key, []),
        "onboarding_completed": coach.get("onboarding_completed", False),
        "onboarding_steps": coach.get("onboarding_steps") or {},
    }


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
async def get_notifications(coach=Depends(get_current_coach)):
    res = await run_in_threadpool(
        lambda: supa.table("coach_notifications").select("*")
        .eq("coach_id", coach["id"])
        .order("created_at", desc=True)
        .limit(30)
        .execute()
    )
    return res.data or []


@router.patch("/notifications/read-all")
async def mark_all_read(coach=Depends(get_current_coach)):
    await run_in_threadpool(
        lambda: supa.table("coach_notifications")
        .update({"is_read": True})
        .eq("coach_id", coach["id"])
        .execute()
    )
    return {"message": "All notifications marked as read"}


@router.patch("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, coach=Depends(get_current_coach)):
    await run_in_threadpool(
        lambda: supa.table("coach_notifications")
        .update({"is_read": True})
        .eq("id", notif_id)
        .eq("coach_id", coach["id"])
        .execute()
    )
    return {"message": "Marked read"}


# ── Public coach counter (no auth) ────────────────────────────────────────────

@router.get("/public/stats")
async def public_coach_stats():
    """Used on landing pages: live coach counts."""
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    active_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("id", count="exact")
        .eq("verification_status", "verified")
        .gte("last_active", thirty_days_ago)
        .execute()
    )
    total_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("id", count="exact")
        .eq("verification_status", "verified")
        .execute()
    )
    inst_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("institution_name")
        .eq("verification_status", "verified")
        .execute()
    )
    institutions = {r["institution_name"] for r in (inst_res.data or []) if r.get("institution_name")}
    return {
        "active_coaches": active_res.count or 0,
        "active_coaches_30d": active_res.count or 0,
        "total_verified": total_res.count or 0,
        "verified_coaches": total_res.count or 0,
        "total_programmes": len(institutions),
    }


# ── Admin: Coach Verification Queue ──────────────────────────────────────────

@router.get("/admin/queue")
async def admin_coach_queue(_=Depends(require_admin_token)):
    """Returns pending coach verification queue. Requires admin token."""
    pending_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("*")
        .eq("verification_status", "pending")
        .order("created_at")
        .execute()
    )
    verified_res = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("*")
        .eq("verification_status", "verified")
        .order("verified_at", desc=True)
        .execute()
    )
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    approved_week = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("id", count="exact")
        .eq("verification_status", "verified")
        .gte("verified_at", week_ago)
        .execute()
    )
    rejected_week = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("id", count="exact")
        .eq("verification_status", "rejected")
        .execute()
    )
    overdue_cutoff = (now - timedelta(hours=48)).isoformat()
    overdue = [c for c in (pending_res.data or []) if c.get("created_at", "") < overdue_cutoff]
    return {
        "pending": pending_res.data or [],
        "verified": verified_res.data or [],
        "stats": {
            "total_pending": len(pending_res.data or []),
            "overdue": len(overdue),
            "approved_week": approved_week.count or 0,
            "rejected_week": rejected_week.count or 0,
        }
    }


@router.patch("/admin/verify/{coach_id}")
async def admin_verify_coach(
    coach_id: str,
    body: dict,
    _=Depends(require_admin_token),
):
    action = body.get("action")  # "approve" | "reject" | "request_info"
    message = body.get("message", "")

    if action == "approve":
        status = "verified"
        updates = {
            "verification_status": "verified",
            "verification_notes": message,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
    elif action == "reject":
        status = "rejected"
        updates = {
            "verification_status": "rejected",
            "verification_notes": message,
        }
    elif action == "request_info":
        updates = {
            "verification_notes": f"INFO REQUESTED: {message}",
        }
        status = "pending"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await run_in_threadpool(
        lambda: supa.table("coach_accounts").update(updates).eq("id", coach_id).execute()
    )
    return {"message": f"Coach {status if action != 'request_info' else 'info requested'}"}



# ── Coach Analytics ───────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_coach_analytics(coach=Depends(require_verified_coach)):
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    views_all = await run_in_threadpool(
        lambda: supa.table("coach_player_views").select("id", count="exact").eq("coach_id", coach["id"]).execute()
    )
    views_7d = await run_in_threadpool(
        lambda: supa.table("coach_player_views").select("id", count="exact").eq("coach_id", coach["id"]).gte("viewed_at", seven_days_ago).execute()
    )
    views_30d = await run_in_threadpool(
        lambda: supa.table("coach_player_views").select("id", count="exact").eq("coach_id", coach["id"]).gte("viewed_at", thirty_days_ago).execute()
    )
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players").select("list_name,player_user_id").eq("coach_id", coach["id"]).execute()
    )
    msgs_res = await run_in_threadpool(
        lambda: supa.table("coach_messages").select("id", count="exact").eq("coach_id", coach["id"]).execute()
    )
    views_14d_res = await run_in_threadpool(
        lambda: supa.table("coach_player_views").select("viewed_at").eq("coach_id", coach["id"]).gte("viewed_at", fourteen_days_ago).execute()
    )

    saved = saved_res.data or []
    saves_by_list = {}
    for s in saved:
        lst = s.get("list_name") or "Watch List"
        saves_by_list[lst] = saves_by_list.get(lst, 0) + 1

    top_positions, top_grad_years = [], []
    if saved:
        user_ids = [s["player_user_id"] for s in saved]
        profiles_res = await run_in_threadpool(
            lambda: supa.table("profiles").select("position,expected_graduation").in_("user_id", user_ids).execute()
        )
        positions, grad_years = {}, {}
        for p in (profiles_res.data or []):
            pos = p.get("position") or ""
            yr = str(p.get("expected_graduation") or "")
            if pos:
                positions[pos] = positions.get(pos, 0) + 1
            if yr and yr not in ("", "None", "null"):
                grad_years[yr] = grad_years.get(yr, 0) + 1
        top_positions = [{"position": k, "count": v} for k, v in sorted(positions.items(), key=lambda x: x[1], reverse=True)[:5]]
        top_grad_years = [{"year": k, "count": v} for k, v in sorted(grad_years.items(), key=lambda x: x[0])[:6]]

    daily_map = {(now - timedelta(days=13 - i)).strftime("%Y-%m-%d"): 0 for i in range(14)}
    for v in (views_14d_res.data or []):
        day = (v.get("viewed_at") or "")[:10]
        if day in daily_map:
            daily_map[day] += 1
    daily_views = [{"date": k[5:], "views": v} for k, v in daily_map.items()]

    return {
        "views": {
            "all_time": views_all.count or 0,
            "last_7d": views_7d.count or 0,
            "last_30d": views_30d.count or 0,
        },
        "saves": {
            "total": len(saved),
            "by_list": [{"list": k, "count": v} for k, v in saves_by_list.items()],
        },
        "top_positions": top_positions,
        "top_grad_years": top_grad_years,
        "messages_sent": msgs_res.count or 0,
        "daily_views": daily_views,
    }
