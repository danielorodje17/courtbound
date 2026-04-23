from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone, timedelta
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import WeeklyGoalsUpdate

router = APIRouter(tags=["goals"])


def _current_week_start():
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _compute_progress(uid: str, ws, we):
    ws_str, we_str = ws.isoformat(), we.isoformat()

    e_sent_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact")
        .eq("user_id", uid).eq("direction", "sent")
        .gte("created_at", ws_str).lt("created_at", we_str).execute()
    )
    e_fup_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact")
        .eq("user_id", uid).eq("direction", "sent").eq("message_type", "follow_up")
        .gte("created_at", ws_str).lt("created_at", we_str).execute()
    )
    track_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("id", count="exact")
        .eq("user_id", uid)
        .gte("created_at", ws_str).lt("created_at", we_str).execute()
    )
    # Count calls from call_notes within this week
    notes_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("call_notes")
        .eq("user_id", uid)
        .not_.is_("call_notes", "null")
        .execute()
    )
    calls = sum(
        1 for t in (notes_r.data or [])
        for cn in (t.get("call_notes") or [])
        if cn.get("created_at") and ws_str <= cn["created_at"][:10] < we_str
    )
    return {
        "emails_sent": e_sent_r.count or 0,
        "follow_ups": e_fup_r.count or 0,
        "new_tracks": track_r.count or 0,
        "calls": calls,
    }


@router.get("/goals/current")
async def get_current_goals(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    ws = _current_week_start()
    we = ws + timedelta(days=7)
    week_label = f"{ws.strftime('%-d %b')} – {(we - timedelta(days=1)).strftime('%-d %b %Y')}"

    goals_r = await run_in_threadpool(
        lambda: supa.table("weekly_goals").select("goals")
        .eq("user_id", uid).eq("week_start", ws.isoformat()).execute()
    )
    goals = goals_r.data[0]["goals"] if goals_r.data else {"emails_sent": 0, "follow_ups": 0, "new_tracks": 0, "calls": 0}
    progress = await _compute_progress(uid, ws, we)

    four_weeks_ago = ws - timedelta(weeks=4)
    past_emails_r = await run_in_threadpool(
        lambda: supa.table("emails").select("created_at,message_type")
        .eq("user_id", uid).eq("direction", "sent")
        .gte("created_at", four_weeks_ago.isoformat()).lt("created_at", ws.isoformat()).execute()
    )
    past_tracked_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("created_at")
        .eq("user_id", uid)
        .gte("created_at", four_weeks_ago.isoformat()).lt("created_at", ws.isoformat()).execute()
    )
    past_calls_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("call_notes")
        .eq("user_id", uid).not_.is_("call_notes", "null").execute()
    )

    past_emails = past_emails_r.data or []
    past_tracked = past_tracked_r.data or []
    past_calls_docs = past_calls_r.data or []

    past_weeks = [(ws - timedelta(weeks=i), ws - timedelta(weeks=i - 1)) for i in range(4, 0, -1)]
    totals = {"emails_sent": 0, "follow_ups": 0, "new_tracks": 0, "calls": 0}
    active_weeks = 0
    for pw, pwe in past_weeks:
        ws_s, we_s = pw.isoformat(), pwe.isoformat()
        e = sum(1 for x in past_emails if ws_s <= x.get("created_at", "")[:10] < we_s)
        f = sum(1 for x in past_emails if ws_s <= x.get("created_at", "")[:10] < we_s and x.get("message_type") == "follow_up")
        n = sum(1 for t in past_tracked if t.get("created_at") and ws_s <= t["created_at"][:10] < we_s)
        c = sum(1 for t in past_calls_docs for cn in (t.get("call_notes") or []) if cn.get("created_at") and ws_s <= cn["created_at"][:10] < we_s)
        totals["emails_sent"] += e
        totals["follow_ups"] += f
        totals["new_tracks"] += n
        totals["calls"] += c
        if any([e, f, n, c]):
            active_weeks += 1

    suggestions = {}
    for k in ["emails_sent", "follow_ups", "new_tracks", "calls"]:
        avg = totals[k] / 4
        if avg > 0:
            suggestions[k] = max(1, round(avg) + 1)
        else:
            suggestions[k] = 3 if k == "emails_sent" else (2 if k == "follow_ups" else 1)

    return {
        "week_start": ws.isoformat(),
        "week_label": week_label,
        "goals": goals,
        "progress": progress,
        "suggestions": suggestions,
        "has_history": active_weeks > 0,
    }


@router.put("/goals/current")
async def set_current_goals(data: WeeklyGoalsUpdate, current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    ws = _current_week_start()
    goals = {
        "emails_sent": data.emails_sent,
        "follow_ups": data.follow_ups,
        "new_tracks": data.new_tracks,
        "calls": data.calls,
    }
    await run_in_threadpool(
        lambda: supa.table("weekly_goals").upsert(
            {
                "user_id": uid,
                "week_start": ws.isoformat(),
                "goals": goals,
                "updated_at": _now(),
            },
            on_conflict="user_id,week_start",
        ).execute()
    )
    return {"week_start": ws.isoformat(), "goals": goals}


@router.get("/goals/history")
async def get_goals_history(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    today = datetime.now(timezone.utc).date()
    current_ws = today - timedelta(days=today.weekday())
    weeks = [(current_ws - timedelta(weeks=i), current_ws - timedelta(weeks=i) + timedelta(days=7)) for i in range(8)]
    eight_weeks_ago = (current_ws - timedelta(weeks=7)).isoformat()

    emails_all_r = await run_in_threadpool(
        lambda: supa.table("emails").select("created_at,message_type")
        .eq("user_id", uid).eq("direction", "sent").gte("created_at", eight_weeks_ago).execute()
    )
    tracked_all_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("created_at,call_notes").eq("user_id", uid).execute()
    )
    week_starts = [ws.isoformat() for ws, _ in weeks]
    goals_r = await run_in_threadpool(
        lambda: supa.table("weekly_goals").select("week_start,goals")
        .eq("user_id", uid).in_("week_start", week_starts).execute()
    )

    emails_all = emails_all_r.data or []
    tracked_all = tracked_all_r.data or []
    goals_map = {g["week_start"]: g.get("goals", {}) for g in (goals_r.data or [])}

    history = []
    for ws, we in weeks:
        ws_str, we_str = ws.isoformat(), we.isoformat()
        emails_sent = sum(1 for e in emails_all if ws_str <= e.get("created_at", "")[:10] < we_str)
        follow_ups = sum(1 for e in emails_all if ws_str <= e.get("created_at", "")[:10] < we_str and e.get("message_type") == "follow_up")
        new_tracks = sum(1 for t in tracked_all if t.get("created_at") and ws_str <= t["created_at"][:10] < we_str)
        calls = sum(1 for t in tracked_all for cn in (t.get("call_notes") or []) if cn.get("created_at") and ws_str <= cn["created_at"][:10] < we_str)
        goals = goals_map.get(ws_str, {})
        set_goals = {k: v for k, v in goals.items() if v > 0}
        if set_goals:
            actual = {"emails_sent": emails_sent, "follow_ups": follow_ups, "new_tracks": new_tracks, "calls": calls}
            met = sum(1 for k, v in set_goals.items() if actual.get(k, 0) >= v)
            achievement_pct = round((met / len(set_goals)) * 100)
        else:
            achievement_pct = None
        history.append({
            "week_start": ws_str,
            "week_label": f"{ws.strftime('%-d %b')} – {(we - timedelta(days=1)).strftime('%-d %b')}",
            "is_current": ws_str == current_ws.isoformat(),
            "goals": goals,
            "progress": {"emails_sent": emails_sent, "follow_ups": follow_ups, "new_tracks": new_tracks, "calls": calls},
            "achievement_pct": achievement_pct,
        })
    return history
