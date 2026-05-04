import os
import io
import csv
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Cookie, Header
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import defaultdict
from supabase_db import supa
from models import AdminLogin, CollegeUpdate, CoachEmailFix, DeleteCoach, BulkImportColleges

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAILS = os.environ.get("ADMIN_EMAILS", "").split(",")
SESSION_TTL = timedelta(days=30)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def require_admin_token(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await run_in_threadpool(
        lambda: supa.table("admin_sessions").select("*").eq("token", token).execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid admin session")

    session = result.data[0]
    exp = session.get("expires_at", "")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
    if getattr(exp, "tzinfo", None) is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    return session


@router.post("/login")
async def admin_login(data: AdminLogin):
    import bcrypt
    admin_email = os.environ.get("ADMIN_EMAIL", "")
    admin_hash = os.environ.get("ADMIN_PASSWORD_HASH", "")
    admin_plain = os.environ.get("ADMIN_PASSWORD", "")

    if data.email.lower() != admin_email.lower():
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if admin_hash:
        if not bcrypt.checkpw(data.password.encode(), admin_hash.encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif admin_plain:
        if data.password != admin_plain:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + SESSION_TTL
    await run_in_threadpool(
        lambda: supa.table("admin_sessions").insert({
            "token": token, "email": data.email,
            "created_at": _now(), "expires_at": expires_at.isoformat(),
        }).execute()
    )
    return {"token": token, "email": data.email}


@router.post("/logout")
async def admin_logout(session=Depends(require_admin_token)):
    token = session.get("token")
    if token:
        await run_in_threadpool(
            lambda: supa.table("admin_sessions").delete().eq("token", token).execute()
        )
    return {"message": "Logged out"}


@router.get("/verify")
async def admin_verify(session=Depends(require_admin_token)):
    return {"email": session.get("email"), "valid": True}


@router.get("/stats")
async def admin_stats(_=Depends(require_admin_token)):
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    users_r = await run_in_threadpool(lambda: supa.table("users").select("*").execute())
    users = users_r.data or []
    total_users = len(users)
    new_7d  = sum(1 for u in users if (u.get("created_at") or "") >= seven_days_ago)
    new_30d = sum(1 for u in users if (u.get("created_at") or "") >= thirty_days_ago)
    active_7d  = sum(1 for u in users if (u.get("last_active") or "") >= seven_days_ago)
    active_30d = sum(1 for u in users if (u.get("last_active") or "") >= thirty_days_ago)

    tier_counts: dict = defaultdict(int)
    for u in users:
        tier_counts[u.get("subscription_tier", "free")] += 1

    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id,created_at,direction").execute())
    emails = emails_r.data or []
    total_sent     = sum(1 for e in emails if e.get("direction") == "sent")
    total_received = sum(1 for e in emails if e.get("direction") == "received")
    sent_7d = sum(1 for e in emails if e.get("direction") == "sent" and (e.get("created_at") or "") >= seven_days_ago)

    tracked_r = await run_in_threadpool(lambda: supa.table("tracked_colleges").select("college_id,user_id").execute())
    tracked = tracked_r.data or []

    cid_counts: dict = defaultdict(int)
    for t in tracked:
        cid_counts[t["college_id"]] += 1
    top_cids = sorted(cid_counts.items(), key=lambda x: -x[1])[:10]

    top_colleges = []
    if top_cids:
        cids = [cid for cid, _ in top_cids]
        cols_r = await run_in_threadpool(lambda: supa.table("colleges").select("id,name,division").in_("id", cids).execute())
        cname_map = {c["id"]: c for c in (cols_r.data or [])}
        for cid, cnt in top_cids:
            college = cname_map.get(cid, {})
            top_colleges.append({"name": college.get("name", "Unknown"), "division": college.get("division", ""), "count": cnt})

    # Signup trend (last 30 days) — key renamed to "signups" to match frontend chart
    signup_trend_map: dict = defaultdict(int)
    for u in users:
        ds = str(u.get("created_at", ""))[:10]
        if ds >= thirty_days_ago[:10]:
            signup_trend_map[ds] += 1
    today = now.date()
    signup_trend = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        signup_trend.append({"date": d, "signups": signup_trend_map.get(d, 0)})

    # Email activity trend (last 14 days)
    email_trend_map: dict = defaultdict(int)
    for e in emails:
        if e.get("direction") == "sent" and (e.get("created_at") or "") >= fourteen_days_ago:
            ds = str(e.get("created_at", ""))[:10]
            email_trend_map[ds] += 1
    email_trend = []
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        email_trend.append({"date": d, "emails": email_trend_map.get(d, 0)})

    reports_r = await run_in_threadpool(
        lambda: supa.table("college_reports").select("id", count="exact").eq("status", "open").execute()
    )
    pending_reports = reports_r.count or 0

    return {
        "users": {
            "total": total_users,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "active_7d": active_7d,
            "active_30d": active_30d,
        },
        "emails": {
            "total_sent": total_sent,
            "sent_7d": sent_7d,
            "total_received": total_received,
        },
        "colleges_tracked": len(tracked),
        "pending_reports": pending_reports,
        "top_colleges": top_colleges,
        "signup_trend": signup_trend,
        "email_trend": email_trend,
        "subscription_breakdown": dict(tier_counts),
    }


@router.get("/users")
async def admin_users(_=Depends(require_admin_token)):
    users_r = await run_in_threadpool(lambda: supa.table("users").select("*").order("created_at", desc=True).execute())
    users = users_r.data or []

    all_emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id,direction").execute())
    all_tracked_r = await run_in_threadpool(lambda: supa.table("tracked_colleges").select("user_id").execute())

    email_sent_counts: dict = defaultdict(int)
    for e in (all_emails_r.data or []):
        if e.get("direction") == "sent":
            email_sent_counts[e["user_id"]] += 1
    tracked_counts: dict = defaultdict(int)
    for t in (all_tracked_r.data or []):
        tracked_counts[t["user_id"]] += 1

    for u in users:
        uid = u["id"]
        u["user_id"] = uid  # alias so frontend can use user_id consistently
        u["emails_sent"] = email_sent_counts.get(uid, 0)
        u["colleges_tracked"] = tracked_counts.get(uid, 0)
        u.pop("password_hash", None)
    return users


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, _=Depends(require_admin_token)):
    # Manually cascade-delete related records before removing the user
    for table in ["user_sessions", "emails", "tracked_colleges", "goals", "templates", "profiles"]:
        try:
            await run_in_threadpool(lambda t=table: supa.table(t).delete().eq("user_id", user_id).execute())
        except Exception:
            pass
    await run_in_threadpool(lambda: supa.table("users").delete().eq("id", user_id).execute())
    return {"message": "User deleted"}


@router.patch("/users/{user_id}/disable")
async def admin_toggle_disable(user_id: str, body: dict, _=Depends(require_admin_token)):
    disabled = bool(body.get("disabled", True))
    try:
        await run_in_threadpool(
            lambda: supa.table("users").update({"is_disabled": disabled}).eq("id", user_id).execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Column not ready — run migration: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE; ({e})")
    return {"message": "User updated", "disabled": disabled}


@router.patch("/users/{user_id}/subscription")
async def admin_update_subscription(user_id: str, body: dict, _=Depends(require_admin_token)):
    await run_in_threadpool(
        lambda: supa.table("users").update({"subscription_tier": body.get("tier", "free")}).eq("id", user_id).execute()
    )
    return {"message": "Subscription updated"}


# ── Pricing management ────────────────────────────────────────────────────────

@router.get("/pricing")
async def admin_get_pricing(_=Depends(require_admin_token)):
    try:
        result = await run_in_threadpool(
            lambda: supa.table("pricing_plans").select("*").execute()
        )
        return result.data or []
    except Exception:
        return []


@router.put("/pricing/{tier}")
async def admin_update_pricing(tier: str, body: dict, _=Depends(require_admin_token)):
    if tier not in ("basic", "premium", "recruit", "scholarship"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    update_data = {"updated_at": _now()}
    if "price_monthly" in body:
        update_data["price_monthly"] = float(body["price_monthly"])
    if "currency" in body:
        update_data["currency"] = body["currency"]
    if "description" in body:
        update_data["description"] = body["description"]
    if "features" in body:
        update_data["features"] = body["features"]
    if "name" in body:
        update_data["name"] = body["name"]
    try:
        await run_in_threadpool(
            lambda: supa.table("pricing_plans").update(update_data).eq("tier", tier).execute()
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Run supabase_migration_v3.sql first")
    return {"message": "Pricing updated"}


@router.get("/users/{user_id}/activity")
async def admin_user_activity(user_id: str, _=Depends(require_admin_token)):
    tracked_r = await run_in_threadpool(
        lambda: supa.table("tracked_colleges").select("*, colleges(name,division)").eq("user_id", user_id).execute()
    )
    emails_r = await run_in_threadpool(
        lambda: supa.table("emails").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
    )
    profile_r = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", user_id).execute()
    )
    user_r = await run_in_threadpool(
        lambda: supa.table("users").select("id,email,name,created_at,last_active,subscription_tier,role").eq("id", user_id).execute()
    )
    return {
        "user": user_r.data[0] if user_r.data else None,
        "profile": profile_r.data[0] if profile_r.data else None,
        "tracked_colleges": tracked_r.data or [],
        "recent_emails": emails_r.data or [],
    }


@router.get("/reports")
async def admin_get_reports(_=Depends(require_admin_token)):
    result = await run_in_threadpool(
        lambda: supa.table("college_reports").select("*, colleges(id,name,division), users(id,email,name)").order("created_at", desc=True).limit(100).execute()
    )
    return result.data or []


@router.patch("/reports/{report_id}")
async def admin_update_report(report_id: str, body: dict, _=Depends(require_admin_token)):
    update_fields = {"status": body.get("status", "in_review"), "updated_at": _now()}
    if body.get("admin_notes"):
        update_fields["admin_response"] = body["admin_notes"]
    await run_in_threadpool(
        lambda: supa.table("college_reports").update(update_fields).eq("id", report_id).execute()
    )

    if body.get("notify_user"):
        report_r = await run_in_threadpool(lambda: supa.table("college_reports").select("user_id,college_id,issue_type").eq("id", report_id).execute())
        if report_r.data:
            rpt = report_r.data[0]
            await run_in_threadpool(
                lambda: supa.table("user_notifications").insert({
                    "user_id": rpt["user_id"], "report_id": report_id,
                    "message": body.get("notification_message", "Your college report has been reviewed."),
                    "created_at": _now(),
                }).execute()
            )
    return {"message": "Report updated"}


@router.delete("/colleges/{college_id}/coaches")
async def admin_delete_coach(college_id: str, data: DeleteCoach, _=Depends(require_admin_token)):
    await run_in_threadpool(
        lambda: supa.table("coaches").delete()
        .eq("college_id", college_id).eq("name", data.coach_name).execute()
    )
    return {"message": "Coach removed"}


@router.patch("/colleges/{college_id}/coach-email")
async def admin_fix_coach_email(college_id: str, data: CoachEmailFix, _=Depends(require_admin_token)):
    update_fields: dict = {}
    if data.new_coach_email is not None:
        update_fields["email"] = data.new_coach_email
    if data.new_coach_name is not None:
        update_fields["name"] = data.new_coach_name
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_fields["last_verified"] = data.last_verified if data.last_verified else datetime.now(timezone.utc).date().isoformat()

    # Prefer matching by coach UUID — unambiguous and immune to name changes.
    # Fall back to name-match if coach_id not provided (legacy path).
    query = supa.table("coaches").update(update_fields).eq("college_id", college_id)
    if data.coach_id:
        query = query.eq("id", data.coach_id)
    elif data.old_coach_name:
        query = query.eq("name", data.old_coach_name)
    else:
        raise HTTPException(status_code=400, detail="coach_id or old_coach_name required")

    result = await run_in_threadpool(lambda: query.execute())
    updated = len(result.data) if result.data else 0
    logger.info(f"Coach update: college={college_id} coach_id={data.coach_id} name={data.old_coach_name} updated={updated}")

    if updated == 0:
        raise HTTPException(status_code=404, detail="Coach not found — the record may have changed. Please refresh and try again.")

    if data.old_coach_email and data.new_coach_email and data.old_coach_email != data.new_coach_email:
        await run_in_threadpool(
            lambda: supa.table("emails")
            .update({"coach_email": data.new_coach_email})
            .eq("college_id", college_id)
            .eq("coach_email", data.old_coach_email)
            .execute()
        )
    return {"message": "Coach updated", "updated": updated}


@router.get("/colleges-contacts")
async def admin_colleges_contacts(_=Depends(require_admin_token), division: str = None, verified_only: bool = False):
    query = supa.table("colleges").select("id,name,division,conference,location,state,foreign_friendly,website,coaches(*)")
    if division:
        query = query.eq("division", division)
    result = await run_in_threadpool(lambda: query.order("name").execute())
    colleges = result.data or []
    if verified_only:
        colleges = [c for c in colleges if any(ch.get("last_verified") for ch in (c.get("coaches") or []))]

    # Flatten: one row per coach (frontend expects flat list with college_id, college_name, coach_name, email)
    rows = []
    for college in colleges:
        coaches = college.get("coaches") or []
        if not coaches:
            # Include colleges with no coaches so they appear in the admin list
            rows.append({
                "college_id": college["id"],
                "college_name": college.get("name", ""),
                "division": college.get("division"),
                "conference": college.get("conference"),
                "location": college.get("location"),
                "state": college.get("state"),
                "foreign_friendly": college.get("foreign_friendly"),
                "website": college.get("website"),
                "coach_name": "",
                "email": "",
                "phone": "",
                "title": "",
                "last_verified": None,
                "sort_order": 0,
            })
        else:
            for coach in coaches:
                rows.append({
                    "college_id": college["id"],
                    "coach_id": coach.get("id"),
                    "college_name": college.get("name", ""),
                    "division": college.get("division"),
                    "conference": college.get("conference"),
                    "location": college.get("location"),
                    "state": college.get("state"),
                    "foreign_friendly": college.get("foreign_friendly"),
                    "website": college.get("website"),
                    "coach_name": coach.get("name", ""),
                    "email": coach.get("email", ""),
                    "phone": coach.get("phone", ""),
                    "title": coach.get("title", ""),
                    "last_verified": coach.get("last_verified"),
                    "sort_order": coach.get("sort_order", 0),
                })
    return rows


@router.post("/colleges/{college_id}/upload-image")
async def upload_college_image(college_id: str, file: UploadFile = File(...), _=Depends(require_admin_token)):
    ext = (file.filename or ".jpg").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Unsupported image format")

    content_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}
    content_type = content_type_map.get(ext, "image/jpeg")

    file_data = await file.read()
    fname = f"{college_id}.{ext}"

    try:
        await run_in_threadpool(
            lambda: supa.storage.from_("college-images").upload(
                path=fname,
                file=file_data,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    image_url = await run_in_threadpool(
        lambda: supa.storage.from_("college-images").get_public_url(fname)
    )
    await run_in_threadpool(lambda: supa.table("colleges").update({"image_url": image_url}).eq("id", college_id).execute())
    return {"image_url": image_url}


@router.patch("/colleges/{college_id}/details")
async def admin_update_college(college_id: str, data: CollegeUpdate, _=Depends(require_admin_token)):
    # Split coaches out — they live in the coaches table, not the colleges table
    coaches_payload = data.coaches
    college_fields = {k: v for k, v in data.dict(exclude_none=True).items() if k != "coaches"}

    if college_fields:
        await run_in_threadpool(lambda: supa.table("colleges").update(college_fields).eq("id", college_id).execute())

    if coaches_payload is not None:
        # Replace all coaches for this college atomically:
        # delete existing rows, then re-insert the full list from the payload.
        await run_in_threadpool(lambda: supa.table("coaches").delete().eq("college_id", college_id).execute())
        if coaches_payload:
            rows = []
            for coach in coaches_payload:
                row = {
                    "college_id": college_id,
                    "name":         coach.get("name", ""),
                    "title":        coach.get("title", "Head Coach"),
                    "email":        coach.get("email", ""),
                    "phone":        coach.get("phone", ""),
                    "last_verified": coach.get("last_verified") or None,
                    "sort_order":   coach.get("sort_order", 0),
                }
                if coach.get("id"):        # preserve UUID for existing rows
                    row["id"] = coach["id"]
                rows.append(row)
            await run_in_threadpool(lambda: supa.table("coaches").insert(rows).execute())
        logger.info(f"College {college_id}: coaches upserted ({len(coaches_payload)} rows)")

    return {"message": "Updated"}


@router.get("/colleges/bulk-export")
async def bulk_export_colleges(_=Depends(require_admin_token)):
    result = await run_in_threadpool(
        lambda: supa.table("colleges").select("*, coaches(*)").order("name").execute()
    )
    colleges = result.data or []
    rows = []
    for c in colleges:
        for coach in (c.get("coaches") or [{}]):
            rows.append({
                "ID": c.get("id", ""),
                "Name": c.get("name", ""),
                "Division": c.get("division", ""),
                "Conference": c.get("conference", ""),
                "Location": c.get("location", ""),
                "State": c.get("state", ""),
                "Region": c.get("region", ""),
                "Country": c.get("country", ""),
                "Foreign Friendly": "Yes" if c.get("foreign_friendly") else "No",
                "Ranking": c.get("ranking", ""),
                "Acceptance Rate": c.get("acceptance_rate", ""),
                "Scholarship Info": c.get("scholarship_info", ""),
                "Website": c.get("website", ""),
                "Language of Study": c.get("language_of_study", ""),
                "Scholarship Type": c.get("scholarship_type", ""),
                "Coach Name": coach.get("name", ""),
                "Coach Email": coach.get("email", ""),
                "Coach Title": coach.get("title", ""),
                "Coach Phone": coach.get("phone", ""),
                "Coach Last Verified": coach.get("last_verified", ""),
            })
    if not rows:
        rows = [{"Name": "No colleges found"}]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=colleges_export.csv"},
    )


@router.post("/colleges/bulk-import")
async def bulk_import_colleges(data: BulkImportColleges, _=Depends(require_admin_token)):
    from fastapi.concurrency import run_in_threadpool
    inserted = updated = errors = 0
    for row in data.colleges:
        try:
            college_doc = {
                "name": (row.get("name") or row.get("Name", "")).strip(),
                "division": (row.get("division") or row.get("Division", "")).strip(),
                "conference": (row.get("conference") or row.get("Conference", "")).strip(),
                "location": (row.get("location") or row.get("Location", "")).strip(),
                "state": (row.get("state") or row.get("State", "")).strip(),
                "region": (row.get("region") or row.get("Region", "")).strip(),
                "country": (row.get("country") or row.get("Country", "")).strip(),
                "foreign_friendly": (row.get("foreign_friendly") or row.get("Foreign Friendly", "")).strip().lower() in ("yes", "true", "1"),
                "ranking": int(row.get("ranking") or row.get("Ranking") or 9999),
                "acceptance_rate": str(row.get("acceptance_rate") or row.get("Acceptance Rate", "")).strip(),
                "scholarship_info": (row.get("scholarship_info") or row.get("Scholarship Info", "")).strip(),
                "website": (row.get("website") or row.get("Website", "")).strip(),
                "language_of_study": (row.get("language_of_study") or row.get("Language of Study", "")).strip(),
                "scholarship_type": (row.get("scholarship_type") or row.get("Scholarship Type", "")).strip(),
            }
            name = college_doc["name"]
            if not name:
                errors += 1
                continue

            existing_r = await run_in_threadpool(
                lambda n=name: supa.table("colleges").select("id").ilike("name", n).execute()
            )
            if existing_r.data:
                college_id = existing_r.data[0]["id"]
                await run_in_threadpool(lambda cid=college_id, cd=college_doc: supa.table("colleges").update(cd).eq("id", cid).execute())
                updated += 1
            else:
                ins_r = await run_in_threadpool(lambda cd=college_doc: supa.table("colleges").insert(cd).execute())
                college_id = ins_r.data[0]["id"] if ins_r.data else None
                inserted += 1

            if not college_id:
                continue

            coach_name = (row.get("coach_name") or row.get("Coach Name", "")).strip()
            if coach_name:
                coach_doc = {
                    "college_id": college_id, "name": coach_name,
                    "email": (row.get("coach_email") or row.get("Coach Email", "")).strip(),
                    "title": (row.get("coach_title") or row.get("Coach Title", "Head Coach")).strip(),
                    "phone": (row.get("coach_phone") or row.get("Coach Phone", "")).strip(),
                    "last_verified": (row.get("coach_last_verified") or row.get("Coach Last Verified", "")).strip() or None,
                }
                await run_in_threadpool(
                    lambda cid=college_id, cd=coach_doc: supa.table("coaches")
                    .upsert(cd, on_conflict="college_id,name").execute()
                )
        except Exception:
            errors += 1
    return {"inserted": inserted, "updated": updated, "errors": errors}


SUSPICIOUS_PREFIXES = ["athletics@","info@","admin@","basketball@","sports@","recruiting@","coaches@","contact@"]

def _is_suspicious(email: str) -> bool:
    if not email:
        return True
    email_lower = email.lower()
    return any(email_lower.startswith(p) for p in SUSPICIOUS_PREFIXES)

@router.get("/colleges-contacts/export")
async def export_contacts(filter: str = "all", _=Depends(require_admin_token)):
    result = await run_in_threadpool(
        lambda: supa.table("coaches").select("*, colleges(name,division,conference,state)").order("last_verified", desc=True).execute()
    )
    coaches = result.data or []
    if filter == "suspicious":
        coaches = [c for c in coaches if _is_suspicious(c.get("email", ""))]
    elif filter == "ok":
        coaches = [c for c in coaches if not _is_suspicious(c.get("email", ""))]
    rows = []
    for c in coaches:
        college = c.get("colleges") or {}
        rows.append({
            "College": college.get("name", ""),
            "Division": college.get("division", ""),
            "Conference": college.get("conference", ""),
            "State": college.get("state", ""),
            "Coach Name": c.get("name", ""),
            "Coach Email": c.get("email", ""),
            "Coach Title": c.get("title", ""),
            "Coach Phone": c.get("phone", ""),
            "Last Verified": c.get("last_verified", ""),
        })
    if not rows:
        rows = [{"College": "No coaches found"}]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts_export.csv"},
    )


@router.post("/colleges-contacts/import")
async def import_contacts(file: UploadFile = File(...), _=Depends(require_admin_token)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or unreadable")
    updated = skipped = 0
    for row in rows:
        row = {k.strip(): v.strip() for k, v in row.items()}
        college_name = row.get("College", "")
        coach_name = row.get("Coach Name", "")
        coach_email = row.get("Coach Email", "")
        if not college_name or not coach_name:
            skipped += 1
            continue
        col_r = await run_in_threadpool(
            lambda cn=college_name: supa.table("colleges").select("id").ilike("name", cn).execute()
        )
        if not col_r.data:
            skipped += 1
            continue
        college_id = col_r.data[0]["id"]
        await run_in_threadpool(
            lambda: supa.table("coaches").upsert({
                "college_id": college_id, "name": coach_name,
                "email": coach_email,
                "title": row.get("Coach Title", "Head Coach"),
                "phone": row.get("Coach Phone", ""),
                "last_verified": row.get("Last Verified", None) or None,
            }, on_conflict="college_id,name").execute()
        )
        updated += 1
    return {"updated": updated, "skipped": skipped}


@router.get("/settings")
async def admin_get_settings(_=Depends(require_admin_token)):
    result = await run_in_threadpool(
        lambda: supa.table("app_settings").select("*").eq("key", "global").execute()
    )
    if result.data:
        return result.data[0]
    return {"key": "global", "show_european": True}


@router.patch("/settings")
async def admin_update_settings(body: dict, _=Depends(require_admin_token)):
    await run_in_threadpool(
        lambda: supa.table("app_settings").upsert(
            {"key": "global", "show_european": body.get("show_european", True), "updated_at": _now()},
            on_conflict="key",
        ).execute()
    )
    return {"message": "Settings updated"}


# ──────────────────────────────────────────────
#  FUNNEL ANALYTICS
# ──────────────────────────────────────────────
@router.get("/funnel")
async def admin_funnel(_=Depends(require_admin_token)):
    users_r = await run_in_threadpool(lambda: supa.table("users").select("id,subscription_tier,created_at,last_active").execute())
    users = users_r.data or []
    total_signups = len(users)

    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id").eq("direction", "sent").execute())
    users_with_emails = {e["user_id"] for e in (emails_r.data or [])}

    tracked_r = await run_in_threadpool(lambda: supa.table("tracked_colleges").select("user_id").execute())
    users_with_tracked = {t["user_id"] for t in (tracked_r.data or [])}

    activated = len({u["id"] for u in users if u["id"] in users_with_emails or u["id"] in users_with_tracked})
    trial = sum(1 for u in users if u.get("subscription_tier") == "trial")
    paid  = sum(1 for u in users if u.get("subscription_tier") in ("basic", "premium", "recruit", "scholarship"))

    def pct(n, d): return round(n / d * 100, 1) if d else 0

    funnel_stages = [
        {"stage": "Sign-ups",  "count": total_signups, "pct": 100},
        {"stage": "Activated", "count": activated,     "pct": pct(activated, total_signups)},
        {"stage": "Trial",     "count": trial,         "pct": pct(trial, total_signups)},
        {"stage": "Paid",      "count": paid,          "pct": pct(paid, total_signups)},
    ]

    # 30-day signup trend
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    trend_map: dict = defaultdict(int)
    for u in users:
        ds = str(u.get("created_at", ""))[:10]
        if ds >= thirty_days_ago[:10]:
            trend_map[ds] += 1
    signup_trend = [{"date": (now.date() - timedelta(days=i)).isoformat(), "signups": trend_map.get((now.date() - timedelta(days=i)).isoformat(), 0)} for i in range(29, -1, -1)]

    # Lead source breakdown
    LEAD_SOURCE_OPTIONS = ["Instagram", "Clubs", "Direct", "Referral", "Other"]
    lead_source_counts: dict = defaultdict(int)
    try:
        profiles_r = await run_in_threadpool(lambda: supa.table("profiles").select("lead_source").execute())
        for p in (profiles_r.data or []):
            src = p.get("lead_source") or "Other"
            if src not in LEAD_SOURCE_OPTIONS:
                src = "Other"
            lead_source_counts[src] += 1
    except Exception:
        pass
    lead_sources = [{"source": s, "count": lead_source_counts.get(s, 0)} for s in LEAD_SOURCE_OPTIONS]

    return {
        "funnel": funnel_stages,
        "trial_to_paid_rate": pct(paid, trial + paid),
        "signup_to_activated_rate": pct(activated, total_signups),
        "signup_trend": signup_trend,
        "lead_sources": lead_sources,
    }


# ──────────────────────────────────────────────
#  OUTREACH ANALYTICS
# ──────────────────────────────────────────────
@router.get("/outreach")
async def admin_outreach(_=Depends(require_admin_token)):
    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id,direction,created_at").execute())
    emails = emails_r.data or []

    users_r = await run_in_threadpool(lambda: supa.table("users").select("id,name,email").execute())
    user_map = {u["id"]: u for u in (users_r.data or [])}

    user_sent: dict = defaultdict(int)
    user_recv: dict = defaultdict(int)
    for e in emails:
        uid = e.get("user_id")
        if e.get("direction") == "sent":     user_sent[uid] += 1
        elif e.get("direction") == "received": user_recv[uid] += 1

    total_sent = sum(user_sent.values())
    total_recv = sum(user_recv.values())
    reply_rate = round(total_recv / total_sent * 100, 1) if total_sent else 0

    # 14-day trend
    now = datetime.now(timezone.utc)
    fourteen_ago = (now - timedelta(days=14)).isoformat()
    trend_map: dict = defaultdict(int)
    for e in emails:
        if e.get("direction") == "sent" and (e.get("created_at") or "") >= fourteen_ago:
            trend_map[str(e.get("created_at", ""))[:10]] += 1
    email_trend = [{"date": (now.date() - timedelta(days=i)).isoformat(), "emails": trend_map.get((now.date() - timedelta(days=i)).isoformat(), 0)} for i in range(13, -1, -1)]

    # Per-user table
    all_uids = set(list(user_sent.keys()) + list(user_recv.keys()))
    per_user = []
    for uid in all_uids:
        s, r = user_sent[uid], user_recv[uid]
        u = user_map.get(uid, {})
        per_user.append({
            "user_id": uid,
            "name": u.get("name", "Unknown"),
            "email": u.get("email", ""),
            "emails_sent": s,
            "replies_received": r,
            "reply_rate": round(r / s * 100, 1) if s else 0,
        })
    per_user.sort(key=lambda x: -x["emails_sent"])

    return {
        "aggregate": {"total_sent": total_sent, "total_received": total_recv, "reply_rate": reply_rate},
        "per_user": per_user[:20],
        "email_trend": email_trend,
    }


# ──────────────────────────────────────────────
#  USER ACTIVITY
# ──────────────────────────────────────────────
@router.get("/activity")
async def admin_activity(_=Depends(require_admin_token)):
    users_r = await run_in_threadpool(lambda: supa.table("users").select("id,name,email,subscription_tier,last_active,created_at").execute())
    users = users_r.data or []

    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id").eq("direction", "sent").execute())
    email_counts: dict = defaultdict(int)
    for e in (emails_r.data or []):
        email_counts[e["user_id"]] += 1

    now = datetime.now(timezone.utc)
    seven_ago  = (now - timedelta(days=7)).isoformat()
    thirty_ago = (now - timedelta(days=30)).isoformat()

    result = []
    for u in users:
        la = u.get("last_active") or ""
        if la >= seven_ago:     status = "active"
        elif la >= thirty_ago:  status = "idle"
        else:                   status = "dormant"
        result.append({
            "user_id":           u["id"],
            "name":              u.get("name", ""),
            "email":             u.get("email", ""),
            "subscription_tier": u.get("subscription_tier", "free"),
            "last_active":       la,
            "created_at":        u.get("created_at", ""),
            "emails_sent":       email_counts[u["id"]],
            "status":            status,
        })
    return {"users": result}


# ──────────────────────────────────────────────
#  NUDGE EMAILS
# ──────────────────────────────────────────────
@router.post("/nudge")
async def admin_nudge(body: dict, _=Depends(require_admin_token)):
    import resend as _resend
    user_ids = body.get("user_ids", [])
    if not user_ids:
        raise HTTPException(status_code=400, detail="user_ids required")

    RESEND_KEY    = os.environ.get("RESEND_API_KEY")
    SENDER        = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    FRONTEND_URL  = os.environ.get("FRONTEND_URL", "https://getcourtbound.com")
    if not RESEND_KEY:
        raise HTTPException(status_code=500, detail="Resend not configured")

    _resend.api_key = RESEND_KEY

    users_r = await run_in_threadpool(lambda: supa.table("users").select("id,name,email").in_("id", user_ids).execute())
    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id").eq("direction", "sent").in_("user_id", user_ids).execute())
    email_counts: dict = defaultdict(int)
    for e in (emails_r.data or []):
        email_counts[e["user_id"]] += 1

    logger = __import__("logging").getLogger(__name__)
    sent_count = 0
    for user in (users_r.data or []):
        uid  = user["id"]
        name = (user.get("name") or "there").split()[0]
        addr = user.get("email", "")
        if not addr: continue
        has_used = email_counts[uid] > 0
        if has_used:
            subject = "Still chasing your scholarship?"
            html = f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
              <h2 style="color:#0f172a">Hey {name},</h2>
              <p style="color:#475569;line-height:1.6">We noticed you haven't been on CourtBound in a while — but your scholarship journey isn't over.</p>
              <p style="color:#475569;line-height:1.6">Coaches are actively reviewing players right now. Log back in to track new colleges and send follow-up emails.</p>
              <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Back to CourtBound →</a>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">CourtBound · <a href="{FRONTEND_URL}" style="color:#94a3b8">getcourtbound.com</a></p></div>"""
        else:
            subject = "Your first coach email is one click away"
            html = f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
              <h2 style="color:#0f172a">Hey {name},</h2>
              <p style="color:#475569;line-height:1.6">You signed up for CourtBound but haven't reached out to any coaches yet.</p>
              <p style="color:#475569;line-height:1.6">The players who get scholarships are the ones who make first contact. It takes less than 2 minutes to send your first email.</p>
              <a href="{FRONTEND_URL}/colleges" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Find a college and email a coach →</a>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">CourtBound · <a href="{FRONTEND_URL}" style="color:#94a3b8">getcourtbound.com</a></p></div>"""
        try:
            _resend.Emails.send({"from": f"CourtBound <{SENDER}>", "to": [addr], "subject": subject, "html": html})
            sent_count += 1
        except Exception as e:
            logger.warning(f"Nudge failed for {addr}: {e}")

    return {"sent": sent_count, "total": len(user_ids)}
