import os
import secrets
from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional
from database import db
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Auth dependency ──────────────────────────────────────────────────────────

async def require_admin_token(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = authorization.replace("Bearer ", "").strip()
    session = await db.admin_sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    exp = session.get("expires_at", "")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if getattr(exp, "tzinfo", None) is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        await db.admin_sessions.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Admin session expired — please log in again")
    return {"email": session.get("email", ""), "token": token}


# ── Login / Logout / Verify ──────────────────────────────────────────────────

@router.post("/login")
async def admin_login(body: dict):
    email    = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    admin_email    = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    admin_password = (os.environ.get("ADMIN_PASSWORD") or "").strip()
    if email != admin_email or password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token      = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.admin_sessions.insert_one({
        "token":      token,
        "email":      email,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"token": token, "email": email, "expires_at": expires_at.isoformat()}


@router.post("/logout")
async def admin_logout(admin=Depends(require_admin_token)):
    await db.admin_sessions.delete_one({"token": admin["token"]})
    return {"message": "Logged out"}


@router.get("/verify")
async def admin_verify(admin=Depends(require_admin_token)):
    return {"email": admin["email"], "authenticated": True}


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(admin=Depends(require_admin_token)):
    from bson import ObjectId
    now   = datetime.now(timezone.utc)
    ago7  = (now - timedelta(days=7)).isoformat()
    ago14 = (now - timedelta(days=14)).isoformat()
    ago30 = (now - timedelta(days=30)).isoformat()

    total_users  = await db.users.count_documents({})
    new_7d       = await db.users.count_documents({"created_at": {"$gte": ago7}})
    new_30d      = await db.users.count_documents({"created_at": {"$gte": ago30}})
    active_7d    = await db.users.count_documents({"last_active": {"$gte": ago7}})
    active_30d   = await db.users.count_documents({"last_active": {"$gte": ago30}})

    sub_raw = await db.users.aggregate([
        {"$group": {"_id": {"$ifNull": ["$subscription_tier", "free"]}, "count": {"$sum": 1}}}
    ]).to_list(20)
    subscription_breakdown = {r["_id"]: r["count"] for r in sub_raw}

    total_sent     = await db.emails.count_documents({"direction": "sent"})
    total_received = await db.emails.count_documents({"direction": "received"})
    sent_7d        = await db.emails.count_documents({"direction": "sent", "created_at": {"$gte": ago7}})
    total_tracked  = await db.tracked_colleges.count_documents({})

    top_raw = await db.tracked_colleges.aggregate([
        {"$group": {"_id": "$college_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}, {"$limit": 10},
    ]).to_list(10)
    top_colleges = []
    for r in top_raw:
        try:
            c = await db.colleges.find_one(
                {"_id": ObjectId(r["_id"])}, {"_id": 0, "name": 1, "division": 1}
            )
            if c:
                top_colleges.append({"name": c["name"], "division": c.get("division", ""), "count": r["count"]})
        except Exception:
            pass

    signup_trend_raw = await db.users.aggregate([
        {"$match": {"created_at": {"$gte": ago30}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(30)
    signup_trend = [{"date": r["_id"], "signups": r["count"]} for r in signup_trend_raw]

    email_trend_raw = await db.emails.aggregate([
        {"$match": {"direction": "sent", "created_at": {"$gte": ago14}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(14)
    email_trend = [{"date": r["_id"], "emails": r["count"]} for r in email_trend_raw]

    return {
        "users": {
            "total": total_users, "new_7d": new_7d, "new_30d": new_30d,
            "active_7d": active_7d, "active_30d": active_30d,
        },
        "subscriptions": subscription_breakdown,
        "emails": {
            "total_sent": total_sent, "total_received": total_received, "sent_7d": sent_7d,
        },
        "colleges_tracked": total_tracked,
        "top_colleges": top_colleges,
        "signup_trend": signup_trend,
        "email_trend": email_trend,
    }


# ── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def admin_users(admin=Depends(require_admin_token)):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    result = []
    for u in users:
        uid = u.get("user_id", "")
        emails_sent      = await db.emails.count_documents({"user_id": uid, "direction": "sent"})
        colleges_tracked = await db.tracked_colleges.count_documents({"user_id": uid})
        result.append({
            "user_id":           uid,
            "name":              u.get("name", ""),
            "email":             u.get("email", ""),
            "picture":           u.get("picture", ""),
            "subscription_tier": u.get("subscription_tier", "free"),
            "created_at":        u.get("created_at", ""),
            "last_active":       u.get("last_active", u.get("updated_at", "")),
            "emails_sent":       emails_sent,
            "colleges_tracked":  colleges_tracked,
        })
    result.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return result


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin_token)):
    """Permanently delete a user and all their associated data."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Delete all user data across every collection
    await db.users.delete_one({"user_id": user_id})
    await db.emails.delete_many({"user_id": user_id})
    await db.tracked_colleges.delete_many({"user_id": user_id})
    await db.profiles.delete_many({"user_id": user_id})
    await db.goals.delete_many({"user_id": user_id})
    await db.email_templates.delete_many({"user_id": user_id})
    await db.college_reports.delete_many({"user_id": user_id})
    await db.user_notifications.delete_many({"user_id": user_id})
    return {"ok": True, "deleted_user": user.get("email", user_id)}


@router.patch("/users/{user_id}/subscription")
async def update_subscription(user_id: str, body: dict, admin=Depends(require_admin_token)):
    tier = body.get("subscription_tier", "free")
    if tier not in ["free", "pro", "elite"]:
        raise HTTPException(status_code=400, detail="Invalid tier — must be free, pro, or elite")
    await db.users.update_one({"user_id": user_id}, {"$set": {"subscription_tier": tier}})
    return {"message": "Subscription updated", "user_id": user_id, "subscription_tier": tier}


# ── User Activity Detail ────────────────────────────────────────────────────

@router.get("/users/{user_id}/activity")
async def admin_user_activity(user_id: str, admin=Depends(require_admin_token)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    emails_all   = await db.emails.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    tracked_docs = await db.tracked_colleges.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    from bson import ObjectId
    # Enrich tracked with college names
    enriched_tracked = []
    for t in tracked_docs:
        cid = t.get("college_id", "")
        try:
            c = await db.colleges.find_one({"_id": ObjectId(cid)}, {"_id": 0, "name": 1, "division": 1, "region": 1})
        except Exception:
            c = None
        enriched_tracked.append({
            **t,
            "college_name":     c.get("name", "Unknown") if c else "Unknown",
            "college_division": c.get("division", "") if c else "",
            "college_region":   c.get("region", "") if c else "",
        })
    sent_emails     = [e for e in emails_all if e.get("direction") == "sent"]
    received_emails = [e for e in emails_all if e.get("direction") == "received"]
    # Reply outcomes
    positive_outcomes = ["interested", "call_requested", "scholarship_offered", "after_call", "after_visit"]
    positive_replies = [
        t for t in tracked_docs
        if t.get("reply_outcome") and t.get("reply_outcome") in positive_outcomes
    ]
    return {
        "user": {
            "user_id":           user.get("user_id"),
            "name":              user.get("name", ""),
            "email":             user.get("email", ""),
            "picture":           user.get("picture", ""),
            "subscription_tier": user.get("subscription_tier", "free"),
            "created_at":        user.get("created_at", ""),
            "last_active":       user.get("last_active", ""),
        },
        "profile": {
            "full_name":         profile.get("full_name", ""),
            "primary_position":  profile.get("primary_position") or profile.get("position", ""),
            "current_team":      profile.get("current_team", ""),
            "highlight_tape_url": profile.get("highlight_tape_url", ""),
            "bio":               profile.get("bio", ""),
        },
        "stats": {
            "emails_sent":       len(sent_emails),
            "emails_received":   len(received_emails),
            "colleges_tracked":  len(tracked_docs),
            "positive_replies":  len(positive_replies),
            "reply_rate":        round(len(received_emails) / len(sent_emails) * 100) if sent_emails else 0,
        },
        "recent_emails":    emails_all[:30],
        "tracked_colleges": enriched_tracked,
        "positive_colleges": [
            {
                "college_name":   t.get("college_name", ""),
                "division":       t.get("college_division", ""),
                "reply_outcome":  t.get("reply_outcome", ""),
            }
            for t in enriched_tracked
            if t.get("reply_outcome") in positive_outcomes
        ],
    }


# ── Reports ─────────────────────────────────────────────────────────────────

@router.get("/reports")
async def admin_reports(admin=Depends(require_admin_token)):
    reports = await db.college_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reports


@router.patch("/reports/{report_id}")
async def update_report(report_id: str, body: dict, admin=Depends(require_admin_token)):
    import uuid
    status         = body.get("status", "")
    admin_response = body.get("admin_response", "")
    if status not in ["pending", "investigating", "fixed", "invalid"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    now = datetime.now(timezone.utc).isoformat()
    await db.college_reports.update_one(
        {"id": report_id},
        {"$set": {"status": status, "admin_response": admin_response, "updated_at": now}},
    )
    # Send notification to user if admin wrote a response
    if admin_response.strip():
        report = await db.college_reports.find_one({"id": report_id}, {"_id": 0})
        if report:
            notif = {
                "id":         str(uuid.uuid4()),
                "user_id":    report["user_id"],
                "report_id":  report_id,
                "college_name": report.get("college_name", ""),
                "message":    admin_response,
                "status":     status,
                "read":       False,
                "created_at": now,
            }
            await db.user_notifications.insert_one(notif)
            del notif["_id"]
    return {"ok": True, "report_id": report_id, "status": status}


# ── App Settings ─────────────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(admin=Depends(require_admin_token)):
    doc = await db.app_settings.find_one({"key": "global"}, {"_id": 0})
    if not doc:
        return {"show_european": True}
    return {"show_european": doc.get("show_european", True)}


@router.patch("/settings")
async def update_settings(body: dict, admin=Depends(require_admin_token)):
    updates = {}
    if "show_european" in body:
        updates["show_european"] = bool(body["show_european"])
    if not updates:
        raise HTTPException(status_code=400, detail="No valid settings provided")
    await db.app_settings.update_one(
        {"key": "global"},
        {"$set": updates},
        upsert=True,
    )
    return {"ok": True, **updates}
