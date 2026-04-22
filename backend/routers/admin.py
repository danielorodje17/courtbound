import os
import io
import csv
import secrets
from fastapi import APIRouter, Header, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
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


# ── College Coach Email Fix ───────────────────────────────────────────────────

@router.delete("/colleges/{college_id}/coaches")
async def delete_coach(college_id: str, body: dict, admin=Depends(require_admin_token)):
    """Remove a coach from a college by name."""
    from bson import ObjectId
    coach_name = (body.get("coach_name") or "").strip()
    if not coach_name:
        raise HTTPException(status_code=400, detail="coach_name is required")
    try:
        oid = ObjectId(college_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college_id")

    result = await db.colleges.update_one(
        {"_id": oid},
        {"$pull": {"coaches": {"name": coach_name}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="College not found")
    return {"ok": True, "removed_coach": coach_name}


@router.patch("/colleges/{college_id}/coach-email")
async def fix_coach_email(college_id: str, body: dict, admin=Depends(require_admin_token)):
    """Admin: update a coach's name and/or email, and delete all sent emails to the old address."""
    from bson import ObjectId
    coach_name     = (body.get("coach_name") or "").strip()
    new_coach_name = (body.get("new_coach_name") or "").strip()
    new_email      = (body.get("new_email") or "").strip()
    if not coach_name:
        raise HTTPException(status_code=400, detail="coach_name is required")
    if not new_coach_name and not new_email:
        raise HTTPException(status_code=400, detail="Provide new_coach_name or new_email")
    try:
        oid = ObjectId(college_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college_id")

    # Find current coach data before overwriting
    college = await db.colleges.find_one(
        {"_id": oid, "coaches.name": coach_name},
        {"coaches.$": 1}
    )
    if not college:
        raise HTTPException(status_code=404, detail="College or coach not found")

    old_email = college["coaches"][0].get("email", "") if college.get("coaches") else ""

    # Build the update fields
    set_fields = {}
    if new_email:
        set_fields["coaches.$.email"] = new_email
    if new_coach_name:
        set_fields["coaches.$.name"] = new_coach_name
    # last_verified: use provided value or auto-stamp today
    lv = (body.get("last_verified") or "").strip() or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    set_fields["coaches.$.last_verified"] = lv

    result = await db.colleges.update_one(
        {"_id": oid, "coaches.name": coach_name},
        {"$set": set_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="College or coach not found")

    # Delete sent emails that used the old (bounced) email address
    deleted = 0
    if new_email and old_email and old_email != new_email:
        res = await db.emails.delete_many({
            "college_id": college_id,
            "coach_email": old_email,
        })
        deleted = res.deleted_count

    return {
        "ok": True,
        "college_id": college_id,
        "old_coach_name": coach_name,
        "new_coach_name": new_coach_name or coach_name,
        "old_email": old_email,
        "new_email": new_email or old_email,
        "emails_deleted": deleted,
    }


@router.get("/colleges-contacts")
async def admin_colleges_contacts(admin=Depends(require_admin_token)):
    """Return all colleges with their coach contact info for admin review."""
    colleges = await db.colleges.find(
        {},
        {"_id": 1, "name": 1, "division": 1, "coaches": 1}
    ).sort("name", 1).to_list(length=None)

    suspicious_patterns = ["athletics@", "info@", "admin@", "basketball@",
                           "sports@", "recruiting@", "coaches@", "contact@"]

    result = []
    for c in colleges:
        cid = str(c["_id"])
        for coach in (c.get("coaches") or []):
            email = coach.get("email", "")
            is_suspicious = any(email.lower().startswith(p) for p in suspicious_patterns) or not email
            result.append({
                "college_id": cid,
                "college_name": c.get("name", ""),
                "division": c.get("division", ""),
                "coach_name": coach.get("name", ""),
                "coach_title": coach.get("title", ""),
                "email": email,
                "phone": coach.get("phone", ""),
                "last_verified": coach.get("last_verified", ""),
                "suspicious": is_suspicious,
            })
    return result


@router.post("/colleges/{college_id}/upload-image")
async def upload_college_image(college_id: str, file: UploadFile = File(...), admin=Depends(require_admin_token)):
    """Upload a PNG/JPG logo for a college. Stores in static/college_images/ and updates image_url."""
    import os
    from bson import ObjectId

    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, WEBP images are allowed")

    try:
        oid = ObjectId(college_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college_id")

    college = await db.colleges.find_one({"_id": oid}, {"name": 1})
    if not college:
        raise HTTPException(status_code=404, detail="College not found")

    # Save file
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    filename = f"{college_id}.{ext}"
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "static", "college_images")
    # Resolve relative to this file
    static_dir = os.path.join(os.path.dirname(__file__), "static", "college_images")
    os.makedirs(static_dir, exist_ok=True)

    file_path = os.path.join(static_dir, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Update image_url in DB to the static path (frontend constructs full URL)
    image_url = f"/static/college_images/{filename}"
    await db.colleges.update_one({"_id": oid}, {"$set": {"image_url": image_url}})

    return {"ok": True, "image_url": image_url, "college_name": college.get("name", "")}


@router.patch("/colleges/{college_id}/details")
async def update_college_details(college_id: str, body: dict, admin=Depends(require_admin_token)):
    """Admin: update any top-level college fields and/or full coaches array."""
    from bson import ObjectId
    try:
        oid = ObjectId(college_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college_id")

    allowed = {
        "name", "location", "state", "division", "conference", "region",
        "foreign_friendly", "scholarship_info", "acceptance_rate",
        "notable_alumni", "ranking", "website", "image_url", "coaches",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.colleges.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="College not found")
    return {"ok": True, "college_id": college_id, "fields_updated": list(updates.keys())}


@router.get("/colleges/bulk-export")
async def bulk_export_colleges(admin=Depends(require_admin_token)):
    """Export all colleges as CSV (one row per college, first coach flattened)."""
    colleges = await db.colleges.find({}).sort("name", 1).to_list(length=None)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "college_id", "name", "location", "state", "division", "conference",
        "region", "foreign_friendly", "scholarship_info", "acceptance_rate",
        "notable_alumni", "ranking", "website", "image_url",
        "coach1_name", "coach1_title", "coach1_email", "coach1_phone", "coach1_last_verified",
        "coach2_name", "coach2_title", "coach2_email", "coach2_phone", "coach2_last_verified",
    ])
    for c in colleges:
        coaches = c.get("coaches") or []
        c1 = coaches[0] if len(coaches) > 0 else {}
        c2 = coaches[1] if len(coaches) > 1 else {}
        writer.writerow([
            str(c["_id"]),
            c.get("name", ""),
            c.get("location", ""),
            c.get("state", ""),
            c.get("division", ""),
            c.get("conference", ""),
            c.get("region", "USA"),
            "yes" if c.get("foreign_friendly") else "no",
            c.get("scholarship_info", ""),
            c.get("acceptance_rate", ""),
            c.get("notable_alumni", ""),
            c.get("ranking", ""),
            c.get("website", ""),
            c.get("image_url", ""),
            c1.get("name",""), c1.get("title",""), c1.get("email",""), c1.get("phone",""), c1.get("last_verified",""),
            c2.get("name",""), c2.get("title",""), c2.get("email",""), c2.get("phone",""), c2.get("last_verified",""),
        ])

    output.seek(0)
    filename = f"courtbound_colleges_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/colleges/bulk-import")
async def bulk_import_colleges(file: UploadFile = File(...), admin=Depends(require_admin_token)):
    """Bulk import colleges from CSV. Empty college_id = create new. Existing id = update."""
    from bson import ObjectId

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode file — use UTF-8 CSV")

    reader = csv.DictReader(io.StringIO(text))
    required = {"name", "division"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail="CSV must have at minimum: name, division")

    created = 0
    updated = 0
    skipped = 0
    errors = []

    for row in reader:
        name = (row.get("name") or "").strip()
        if not name:
            skipped += 1
            continue

        # Build coaches array
        coaches = []
        for prefix in ("coach1", "coach2"):
            cname = (row.get(f"{prefix}_name") or "").strip()
            if cname:
                coaches.append({
                    "name": cname,
                    "title": (row.get(f"{prefix}_title") or "Head Coach").strip(),
                    "email": (row.get(f"{prefix}_email") or "").strip(),
                    "phone": (row.get(f"{prefix}_phone") or "").strip(),
                    "last_verified": (row.get(f"{prefix}_last_verified") or "").strip(),
                })

        def boolify(v):
            return str(v).strip().lower() in ("yes", "true", "1")

        college_doc = {
            "name":            name,
            "location":        (row.get("location") or "").strip(),
            "state":           (row.get("state") or "").strip(),
            "division":        (row.get("division") or "").strip(),
            "conference":      (row.get("conference") or "").strip(),
            "region":          (row.get("region") or "USA").strip(),
            "foreign_friendly": boolify(row.get("foreign_friendly", "no")),
            "scholarship_info": (row.get("scholarship_info") or "").strip(),
            "acceptance_rate":  (row.get("acceptance_rate") or "").strip(),
            "notable_alumni":   (row.get("notable_alumni") or "").strip(),
            "ranking":          int(row["ranking"]) if str(row.get("ranking", "")).strip().isdigit() else None,
            "website":          (row.get("website") or "").strip(),
            "image_url":        (row.get("image_url") or "").strip(),
            "coaches":          coaches,
        }

        college_id = (row.get("college_id") or "").strip()
        if college_id:
            # Update existing
            try:
                oid = ObjectId(college_id)
            except Exception:
                errors.append(f"Invalid id for {name}")
                skipped += 1
                continue
            college_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
            res = await db.colleges.update_one({"_id": oid}, {"$set": college_doc})
            if res.matched_count:
                updated += 1
            else:
                errors.append(f"Not found: {college_id}")
                skipped += 1
        else:
            # Create new
            college_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.colleges.insert_one(college_doc)
            created += 1

    return {"ok": True, "created": created, "updated": updated, "skipped": skipped, "errors": errors[:20]}


@router.get("/colleges-contacts/export")
async def export_contacts(filter: Optional[str] = "suspicious", admin=Depends(require_admin_token)):
    """Export college coach contacts as CSV. filter=suspicious|all"""
    colleges = await db.colleges.find(
        {}, {"_id": 1, "name": 1, "division": 1, "coaches": 1}
    ).sort("name", 1).to_list(length=None)

    suspicious_patterns = ["athletics@", "info@", "admin@", "basketball@",
                           "sports@", "recruiting@", "coaches@", "contact@"]

    def is_suspicious(email):
        return not email or any(email.lower().startswith(p) for p in suspicious_patterns)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "college_id", "college_name", "division",
        "coach_name", "coach_title", "email", "phone", "last_verified", "suspicious"
    ])
    for c in colleges:
        for coach in (c.get("coaches") or []):
            email = coach.get("email", "")
            susp  = is_suspicious(email)
            if filter == "suspicious" and not susp:
                continue
            writer.writerow([
                str(c["_id"]),
                c.get("name", ""),
                c.get("division", ""),
                coach.get("name", ""),
                coach.get("title", ""),
                email,
                coach.get("phone", ""),
                coach.get("last_verified", ""),
                "yes" if susp else "no",
            ])

    output.seek(0)
    filename = f"courtbound_contacts_{filter}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/colleges-contacts/import")
async def import_contacts(file: UploadFile = File(...), admin=Depends(require_admin_token)):
    """Import updated coach contacts from CSV. Matches by college_id + coach_name."""
    from bson import ObjectId

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode file — use UTF-8 CSV")

    reader = csv.DictReader(io.StringIO(text))
    if not {"college_id", "coach_name", "email"}.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail="CSV must have columns: college_id, coach_name, email")

    updated = 0
    skipped = 0
    emails_deleted = 0
    errors = []

    for row in reader:
        college_id = (row.get("college_id") or "").strip()
        coach_name = (row.get("coach_name") or "").strip()
        new_email  = (row.get("email") or "").strip()
        new_title  = (row.get("coach_title") or "").strip()
        new_lv     = (row.get("last_verified") or "").strip()

        if not college_id or not coach_name:
            skipped += 1
            continue
        try:
            oid = ObjectId(college_id)
        except Exception:
            errors.append(f"Invalid college_id: {college_id}")
            skipped += 1
            continue

        college = await db.colleges.find_one(
            {"_id": oid, "coaches.name": coach_name}, {"coaches.$": 1}
        )
        if not college or not college.get("coaches"):
            errors.append(f"Not found: {coach_name} @ {college_id}")
            skipped += 1
            continue

        old_email = college["coaches"][0].get("email", "")
        set_fields = {}
        if new_email:
            set_fields["coaches.$.email"] = new_email
        if new_title:
            set_fields["coaches.$.title"] = new_title
        if new_lv:
            set_fields["coaches.$.last_verified"] = new_lv
        if not set_fields:
            skipped += 1
            continue

        await db.colleges.update_one(
            {"_id": oid, "coaches.name": coach_name},
            {"$set": set_fields},
        )
        updated += 1

        if new_email and old_email and old_email != new_email:
            res = await db.emails.delete_many({"college_id": college_id, "coach_email": old_email})
            emails_deleted += res.deleted_count

    return {
        "ok": True,
        "updated": updated,
        "skipped": skipped,
        "emails_deleted": emails_deleted,
        "errors": errors[:20],
    }


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
