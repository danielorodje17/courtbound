from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from supabase_db import supa
from auth_utils import UserModel, get_current_user

router = APIRouter(tags=["dashboard"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/dashboard/stats")
async def get_stats(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id

    tracked_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("id", count="exact").eq("user_id", uid).execute()
    )
    sent_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact").eq("user_id", uid).eq("direction", "sent").execute()
    )
    recv_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact").eq("user_id", uid).eq("direction", "received").execute()
    )
    recent_r = await run_in_threadpool(
        lambda: supa.table("emails").select("*").eq("user_id", uid).order("created_at", desc=True).limit(5).execute()
    )

    return {
        "tracked_colleges": tracked_r.count or 0,
        "emails_sent": sent_r.count or 0,
        "emails_received": recv_r.count or 0,
        "recent_emails": recent_r.data or [],
    }


@router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    today = datetime.now(timezone.utc).date().isoformat()
    seven_days = (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()
    thirty_days = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()

    tracked_result = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("*, colleges(name)")
        .eq("user_id", uid)
        .execute()
    )
    if not tracked_result.data:
        return {"overdue_followups": [], "upcoming_followups": [], "upcoming_deadlines": []}

    overdue_followups, upcoming_followups, upcoming_deadlines = [], [], []
    for t in tracked_result.data:
        college = t.get("colleges") or {}
        name = college.get("name", "")
        cid = t["college_id"]

        fu = (t.get("follow_up_date") or "")[:10]
        if fu:
            if fu < today:
                overdue_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})
            elif fu <= seven_days:
                upcoming_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})

        for dkey, dtype in [("application_deadline", "Application"), ("signing_day", "Signing Day")]:
            dl = (t.get(dkey) or "")[:10]
            if dl and today <= dl <= thirty_days:
                upcoming_deadlines.append({"college_id": cid, "name": name, "deadline": dl, "type": dtype})

    return {
        "overdue_followups": sorted(overdue_followups, key=lambda x: x["date"]),
        "upcoming_followups": sorted(upcoming_followups, key=lambda x: x["date"]),
        "upcoming_deadlines": sorted(upcoming_deadlines, key=lambda x: x["deadline"]),
    }


@router.get("/dashboard/analytics")
async def get_analytics(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    emails_result = await run_in_threadpool(
        lambda: supa.table("emails")
        .select("direction,created_at")
        .eq("user_id", uid)
        .gte("created_at", thirty_days_ago)
        .execute()
    )
    emails = emails_result.data or []

    daily_sent: dict = defaultdict(int)
    daily_received: dict = defaultdict(int)
    for e in emails:
        ds = str(e.get("created_at", ""))[:10]
        if e["direction"] == "sent":
            daily_sent[ds] += 1
        else:
            daily_received[ds] += 1

    activity = []
    for i in range(29, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        activity.append({"date": d, "sent": daily_sent.get(d, 0), "received": daily_received.get(d, 0)})

    tracked_result = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("status,colleges(division)")
        .eq("user_id", uid)
        .execute()
    )
    tracked = tracked_result.data or []

    total_tracked = len(tracked)
    contacted = sum(1 for t in tracked if t.get("status") in ("contacted", "replied", "rejected"))
    replied = sum(1 for t in tracked if t.get("status") == "replied")

    div_counts: dict = defaultdict(int)
    for t in tracked:
        div = (t.get("colleges") or {}).get("division") or "Unknown"
        div_counts[div] += 1
    division_breakdown = sorted(
        [{"division": d, "count": c} for d, c in div_counts.items()],
        key=lambda x: -x["count"]
    )

    return {
        "activity": activity,
        "funnel": {"tracked": total_tracked, "contacted": contacted, "replied": replied},
        "division_breakdown": division_breakdown,
    }


@router.get("/dashboard/heatmap")
async def get_activity_heatmap(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()

    result = await run_in_threadpool(
        lambda: supa.table("emails")
        .select("created_at")
        .eq("user_id", uid)
        .eq("direction", "sent")
        .gte("created_at", one_year_ago)
        .execute()
    )
    emails = result.data or []

    daily_counts: dict = defaultdict(int)
    for e in emails:
        ds = str(e.get("created_at", ""))[:10]
        if ds:
            daily_counts[ds] += 1

    today = datetime.now(timezone.utc).date()
    days_since_monday = today.weekday()
    start_of_current_week = today - timedelta(days=days_since_monday)
    start_date = start_of_current_week - timedelta(weeks=51)

    weeks = []
    current_date = start_date
    while current_date <= today:
        week_data = []
        for dow in range(7):
            d = current_date + timedelta(days=dow)
            date_str = d.isoformat() if d <= today else None
            week_data.append({
                "date": date_str,
                "count": daily_counts.get(date_str, 0) if date_str else 0,
                "day_of_week": dow,
            })
        weeks.append({"week_start": current_date.isoformat(), "days": week_data})
        current_date += timedelta(weeks=1)

    all_counts = [d["count"] for w in weeks for d in w["days"] if d["date"]]
    max_count = max(all_counts) if all_counts else 1
    total_emails = sum(daily_counts.values())
    active_days = sum(1 for v in daily_counts.values() if v > 0)

    streak = 0
    check_date = today
    while daily_counts.get(check_date.isoformat(), 0) > 0:
        streak += 1
        check_date -= timedelta(days=1)

    return {
        "weeks": weeks,
        "max_count": max(max_count, 1),
        "total_emails": total_emails,
        "active_days": active_days,
        "streak": streak,
    }


@router.get("/dashboard/weekly-digest")
async def get_weekly_digest(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=7)).isoformat()
    prev_week_start = (now - timedelta(days=14)).isoformat()

    emails_this_week_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact")
        .eq("user_id", uid).eq("direction", "sent").gte("created_at", week_start).execute()
    )
    emails_last_week_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact")
        .eq("user_id", uid).eq("direction", "sent")
        .gte("created_at", prev_week_start).lt("created_at", week_start).execute()
    )
    responses_r = await run_in_threadpool(
        lambda: supa.table("emails").select("id", count="exact")
        .eq("user_id", uid).eq("direction", "received").gte("created_at", week_start).execute()
    )
    new_tracked_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("id", count="exact")
        .eq("user_id", uid).gte("created_at", week_start).execute()
    )
    today_str = now.date().isoformat()
    overdue_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("college_id")
        .eq("user_id", uid)
        .lt("follow_up_date", today_str)
        .not_.is_("follow_up_date", "null")
        .execute()
    )

    emails_this_week = emails_this_week_r.count or 0
    emails_last_week = emails_last_week_r.count or 0
    responses_this_week = responses_r.count or 0
    new_tracked = new_tracked_r.count or 0
    overdue_count = len(overdue_r.data or [])

    # Top college by progress (rough: most emails sent)
    tracked_all_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("college_id,colleges(name)")
        .eq("user_id", uid)
        .execute()
    )
    tracked_all = tracked_all_r.data or []
    tracked_ids = [t["college_id"] for t in tracked_all]

    emailed_ids: set = set()
    if tracked_ids:
        emailed_r = await run_in_threadpool(
            lambda: supa.table("emails")
            .select("college_id")
            .eq("user_id", uid)
            .eq("direction", "sent")
            .in_("college_id", tracked_ids)
            .execute()
        )
        emailed_ids = {e["college_id"] for e in (emailed_r.data or [])}

    not_contacted_count = len([cid for cid in tracked_ids if cid not in emailed_ids])
    top_college = None

    if overdue_count > 0:
        recommended_action = f"You have {overdue_count} overdue follow-up{'s' if overdue_count > 1 else ''} — send a check-in email to stay top of mind."
        recommended_link = "/responses"
    elif not_contacted_count > 0:
        recommended_action = f"{not_contacted_count} tracked college{'s' if not_contacted_count > 1 else ''} still {'have' if not_contacted_count > 1 else 'has'} no email sent — start your outreach."
        recommended_link = "/compose"
    elif emails_this_week == 0:
        recommended_action = "No emails sent this week — maintain your outreach momentum."
        recommended_link = "/compose"
    else:
        recommended_action = "Great week! Keep the momentum going and log any coach replies."
        recommended_link = "/responses"

    week_label = f"Week of {(now - timedelta(days=7)).strftime('%-d %b')} – {now.strftime('%-d %b %Y')}"
    return {
        "week_label": week_label,
        "emails_sent_this_week": emails_this_week,
        "emails_sent_last_week": emails_last_week,
        "responses_this_week": responses_this_week,
        "new_colleges_tracked": new_tracked,
        "overdue_followups": overdue_count,
        "not_contacted_count": not_contacted_count,
        "top_college": top_college,
        "recommended_action": recommended_action,
        "recommended_link": recommended_link,
    }
