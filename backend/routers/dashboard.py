from fastapi import APIRouter, Depends
from collections import defaultdict
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from database import db
from auth_utils import UserModel, get_current_user

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
async def get_stats(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.count_documents({"user_id": current_user.user_id})
    emails_sent = await db.emails.count_documents({"user_id": current_user.user_id, "direction": "sent"})
    emails_received = await db.emails.count_documents({"user_id": current_user.user_id, "direction": "received"})
    recent_emails = await db.emails.find({"user_id": current_user.user_id}).sort("created_at", -1).to_list(5)
    for e in recent_emails:
        e["id"] = str(e.pop("_id"))
    return {"tracked_colleges": tracked, "emails_sent": emails_sent, "emails_received": emails_received, "recent_emails": recent_emails}


@router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: UserModel = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    seven_days = (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()
    thirty_days = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return {"overdue_followups": [], "upcoming_followups": [], "upcoming_deadlines": []}
    college_ids_obj = []
    for t in tracked:
        try:
            college_ids_obj.append(ObjectId(t["college_id"]))
        except Exception:
            pass
    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids_obj}}).to_list(500)
    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    overdue_followups, upcoming_followups, upcoming_deadlines = [], [], []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if not college:
            continue
        name = college.get("name", "")
        cid = t["college_id"]
        fu = t.get("follow_up_date", "")
        if fu:
            if fu < today:
                overdue_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})
            elif fu <= seven_days:
                upcoming_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})
        for dkey, dtype in [("application_deadline", "Application"), ("signing_day", "Signing Day")]:
            dl = t.get(dkey, "")
            if dl and today <= dl <= thirty_days:
                upcoming_deadlines.append({"college_id": cid, "name": name, "deadline": dl, "type": dtype})
    return {
        "overdue_followups": sorted(overdue_followups, key=lambda x: x["date"]),
        "upcoming_followups": sorted(upcoming_followups, key=lambda x: x["date"]),
        "upcoming_deadlines": sorted(upcoming_deadlines, key=lambda x: x["deadline"]),
    }


@router.get("/dashboard/analytics")
async def get_analytics(current_user: UserModel = Depends(get_current_user)):
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    emails = await db.emails.find(
        {"user_id": current_user.user_id, "created_at": {"$gte": thirty_days_ago}},
        {"_id": 0, "direction": 1, "created_at": 1}
    ).to_list(1000)
    daily_sent = defaultdict(int)
    daily_received = defaultdict(int)
    for email in emails:
        date_str = str(email.get("created_at", ""))[:10]
        if email["direction"] == "sent":
            daily_sent[date_str] += 1
        else:
            daily_received[date_str] += 1
    activity = []
    for i in range(29, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        activity.append({"date": d, "sent": daily_sent.get(d, 0), "received": daily_received.get(d, 0)})
    tracked = await db.tracked_colleges.count_documents({"user_id": current_user.user_id})
    contacted = await db.tracked_colleges.count_documents(
        {"user_id": current_user.user_id, "status": {"$in": ["contacted", "replied", "rejected"]}}
    )
    replied = await db.tracked_colleges.count_documents({"user_id": current_user.user_id, "status": "replied"})
    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$addFields": {"college_oid": {"$toObjectId": "$college_id"}}},
        {"$lookup": {"from": "colleges", "localField": "college_oid", "foreignField": "_id", "as": "college"}},
        {"$unwind": {"path": "$college", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$college.division", "count": {"$sum": 1}}},
    ]
    div_raw = await db.tracked_colleges.aggregate(pipeline).to_list(20)
    division_breakdown = [{"division": d["_id"] or "Unknown", "count": d["count"]} for d in div_raw if d["_id"]]
    return {
        "activity": activity,
        "funnel": {"tracked": tracked, "contacted": contacted, "replied": replied},
        "division_breakdown": sorted(division_breakdown, key=lambda x: -x["count"]),
    }


@router.get("/dashboard/heatmap")
async def get_activity_heatmap(current_user: UserModel = Depends(get_current_user)):
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
    emails = await db.emails.find(
        {"user_id": current_user.user_id, "direction": "sent", "created_at": {"$gte": one_year_ago}},
        {"_id": 0, "created_at": 1}
    ).to_list(5000)

    daily_counts = defaultdict(int)
    for email in emails:
        date_str = str(email.get("created_at", ""))[:10]
        if date_str:
            daily_counts[date_str] += 1

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
                "day_of_week": dow
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
    emails_this_week = await db.emails.count_documents({"user_id": uid, "direction": "sent", "created_at": {"$gte": week_start}})
    emails_last_week = await db.emails.count_documents({"user_id": uid, "direction": "sent", "created_at": {"$gte": prev_week_start, "$lt": week_start}})
    responses_this_week = await db.emails.count_documents({"user_id": uid, "direction": "received", "created_at": {"$gte": week_start}})
    new_tracked = await db.tracked_colleges.count_documents({"user_id": uid, "created_at": {"$gte": week_start}})
    today_str = now.date().isoformat()
    overdue_docs = await db.tracked_colleges.find(
        {"user_id": uid, "follow_up_date": {"$lt": today_str, "$exists": True, "$ne": ""}},
        {"_id": 0, "college_id": 1}
    ).to_list(100)
    overdue_count = len(overdue_docs)
    top_tracked = await db.tracked_colleges.find(
        {"user_id": uid}, {"_id": 0, "college_id": 1, "progress_score": 1}
    ).sort("progress_score", -1).to_list(1)
    top_college = None
    if top_tracked:
        try:
            c = await db.colleges.find_one({"_id": ObjectId(top_tracked[0]["college_id"])}, {"_id": 0, "name": 1})
            if c:
                top_college = {"name": c["name"], "progress_score": top_tracked[0].get("progress_score", 0)}
        except Exception:
            pass
    tracked_all = await db.tracked_colleges.find({"user_id": uid}, {"_id": 0, "college_id": 1}).to_list(500)
    tracked_ids = [t["college_id"] for t in tracked_all]
    emailed_ids = set()
    if tracked_ids:
        emailed = await db.emails.find(
            {"user_id": uid, "college_id": {"$in": tracked_ids}, "direction": "sent"},
            {"_id": 0, "college_id": 1}
        ).to_list(500)
        emailed_ids = {e["college_id"] for e in emailed}
    not_contacted_count = len([cid for cid in tracked_ids if cid not in emailed_ids])
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
