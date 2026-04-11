from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from database import db
from auth_utils import UserModel, get_current_user
from models import WeeklyGoalsUpdate

router = APIRouter(tags=["goals"])


def _current_week_start():
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())


async def _compute_progress(uid: str, ws, we):
    ws_str, we_str = ws.isoformat(), we.isoformat()
    emails_sent = await db.emails.count_documents({
        "user_id": uid, "direction": "sent",
        "created_at": {"$gte": ws_str, "$lt": we_str},
    })
    follow_ups = await db.emails.count_documents({
        "user_id": uid, "direction": "sent", "message_type": "follow_up",
        "created_at": {"$gte": ws_str, "$lt": we_str},
    })
    new_tracks = await db.tracked_colleges.count_documents({
        "user_id": uid, "created_at": {"$gte": ws_str, "$lt": we_str},
    })
    all_tracked = await db.tracked_colleges.find(
        {"user_id": uid, "call_notes": {"$exists": True, "$ne": []}},
        {"_id": 0, "call_notes": 1}
    ).to_list(500)
    calls = sum(
        1 for t in all_tracked
        for cn in (t.get("call_notes") or [])
        if cn.get("created_at") and ws_str <= cn["created_at"][:10] < we_str
    )
    return {"emails_sent": emails_sent, "follow_ups": follow_ups, "new_tracks": new_tracks, "calls": calls}


@router.get("/goals/current")
async def get_current_goals(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    ws = _current_week_start()
    we = ws + timedelta(days=7)
    week_label = f"{ws.strftime('%-d %b')} – {(we - timedelta(days=1)).strftime('%-d %b %Y')}"
    goals_doc = await db.weekly_goals.find_one({"user_id": uid, "week_start": ws.isoformat()}, {"_id": 0})
    goals = goals_doc["goals"] if goals_doc else {"emails_sent": 0, "follow_ups": 0, "new_tracks": 0, "calls": 0}
    progress = await _compute_progress(uid, ws, we)

    four_weeks_ago = ws - timedelta(weeks=4)
    past_emails = await db.emails.find(
        {"user_id": uid, "direction": "sent", "created_at": {"$gte": four_weeks_ago.isoformat(), "$lt": ws.isoformat()}},
        {"_id": 0, "created_at": 1, "message_type": 1}
    ).to_list(1000)
    past_tracked = await db.tracked_colleges.find(
        {"user_id": uid, "created_at": {"$gte": four_weeks_ago.isoformat(), "$lt": ws.isoformat()}},
        {"_id": 0, "created_at": 1}
    ).to_list(500)
    past_calls_docs = await db.tracked_colleges.find(
        {"user_id": uid, "call_notes": {"$exists": True, "$ne": []}},
        {"_id": 0, "call_notes": 1}
    ).to_list(500)
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
        "week_start": ws.isoformat(), "week_label": week_label,
        "goals": goals, "progress": progress,
        "suggestions": suggestions, "has_history": active_weeks > 0,
    }


@router.put("/goals/current")
async def set_current_goals(data: WeeklyGoalsUpdate, current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    ws = _current_week_start()
    goals = {"emails_sent": data.emails_sent, "follow_ups": data.follow_ups, "new_tracks": data.new_tracks, "calls": data.calls}
    await db.weekly_goals.update_one(
        {"user_id": uid, "week_start": ws.isoformat()},
        {"$set": {"goals": goals, "updated_at": datetime.now(timezone.utc).isoformat()},
         "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"week_start": ws.isoformat(), "goals": goals}


@router.get("/goals/history")
async def get_goals_history(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    today = datetime.now(timezone.utc).date()
    current_ws = today - timedelta(days=today.weekday())
    weeks = [(current_ws - timedelta(weeks=i), current_ws - timedelta(weeks=i) + timedelta(days=7)) for i in range(8)]
    eight_weeks_ago = (current_ws - timedelta(weeks=7)).isoformat()
    emails_all = await db.emails.find(
        {"user_id": uid, "direction": "sent", "created_at": {"$gte": eight_weeks_ago}},
        {"_id": 0, "created_at": 1, "message_type": 1}
    ).to_list(2000)
    tracked_all = await db.tracked_colleges.find(
        {"user_id": uid}, {"_id": 0, "created_at": 1, "call_notes": 1}
    ).to_list(500)
    week_starts = [ws.isoformat() for ws, _ in weeks]
    goals_docs = await db.weekly_goals.find(
        {"user_id": uid, "week_start": {"$in": week_starts}}, {"_id": 0}
    ).to_list(8)
    goals_map = {g["week_start"]: g.get("goals", {}) for g in goals_docs}
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
            met = sum(1 for k, v in set_goals.items() if {"emails_sent": emails_sent, "follow_ups": follow_ups, "new_tracks": new_tracks, "calls": calls}.get(k, 0) >= v)
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
