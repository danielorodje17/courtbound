import os
import io
import csv
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Cookie, Header
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import defaultdict
from supabase_db import supa
from models import AdminLogin, CollegeUpdate, CoachEmailFix, DeleteCoach, BulkImportColleges

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_EMAILS = os.environ.get("ADMIN_EMAILS", "").split(",")
SESSION_TTL = timedelta(hours=8)


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

    users_r = await run_in_threadpool(lambda: supa.table("users").select("*").execute())
    users = users_r.data or []
    total_users = len(users)
    new_7d = sum(1 for u in users if (u.get("created_at") or "") >= seven_days_ago)
    new_30d = sum(1 for u in users if (u.get("created_at") or "") >= thirty_days_ago)
    active_7d = sum(1 for u in users if (u.get("last_active") or "") >= seven_days_ago)

    tier_counts: dict = defaultdict(int)
    for u in users:
        tier_counts[u.get("subscription_tier", "free")] += 1

    emails_r = await run_in_threadpool(lambda: supa.table("emails").select("user_id,created_at").execute())
    emails = emails_r.data or []
    emails_7d = sum(1 for e in emails if (e.get("created_at") or "") >= seven_days_ago)

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

    # Signup trend (last 30 days)
    signup_trend: dict = defaultdict(int)
    for u in users:
        ds = str(u.get("created_at", ""))[:10]
        if ds >= thirty_days_ago[:10]:
            signup_trend[ds] += 1
    today = now.date()
    trend_data = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        trend_data.append({"date": d, "count": signup_trend.get(d, 0)})

    reports_r = await run_in_threadpool(
        lambda: supa.table("college_reports").select("id", count="exact").eq("status", "open").execute()
    )
    pending_reports = reports_r.count or 0

    return {
        "total_users": total_users,
        "new_users_7d": new_7d,
        "new_users_30d": new_30d,
        "active_users_7d": active_7d,
        "subscription_breakdown": dict(tier_counts),
        "emails_sent_7d": emails_7d,
        "total_emails": len(emails),
        "total_tracked": len(tracked),
        "pending_reports": pending_reports,
        "top_colleges": top_colleges,
        "signup_trend": trend_data,
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
        u["emails_sent"] = email_sent_counts.get(uid, 0)
        u["colleges_tracked"] = tracked_counts.get(uid, 0)
        u.pop("password_hash", None)
    return users


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, _=Depends(require_admin_token)):
    # CASCADE delete handles all related tables
    await run_in_threadpool(lambda: supa.table("users").delete().eq("id", user_id).execute())
    return {"message": "User deleted"}


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
    if tier not in ("basic", "premium"):
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
    update_fields["last_verified"] = datetime.now(timezone.utc).date().isoformat()

    result = await run_in_threadpool(
        lambda: supa.table("coaches")
        .update(update_fields)
        .eq("college_id", college_id)
        .eq("name", data.old_coach_name)
        .execute()
    )

    if data.old_coach_email and data.new_coach_email and data.old_coach_email != data.new_coach_email:
        await run_in_threadpool(
            lambda: supa.table("emails")
            .update({"coach_email": data.new_coach_email})
            .eq("college_id", college_id)
            .eq("coach_email", data.old_coach_email)
            .execute()
        )
    return {"message": "Coach updated", "updated": len(result.data) if result.data else 0}


@router.get("/colleges-contacts")
async def admin_colleges_contacts(_=Depends(require_admin_token), division: str = None, verified_only: bool = False):
    query = supa.table("colleges").select("id,name,division,conference,location,state,foreign_friendly,website,coaches(*)")
    if division:
        query = query.eq("division", division)
    result = await run_in_threadpool(lambda: query.order("name").execute())
    colleges = result.data or []
    if verified_only:
        colleges = [c for c in colleges if any(ch.get("last_verified") for ch in (c.get("coaches") or []))]
    return colleges


@router.post("/colleges/{college_id}/upload-image")
async def upload_college_image(college_id: str, file: UploadFile = File(...), _=Depends(require_admin_token)):
    import shutil
    ext = (file.filename or ".jpg").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Unsupported image format")
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "college_images")
    os.makedirs(static_dir, exist_ok=True)
    fname = f"{college_id}.{ext}"
    fpath = os.path.join(static_dir, fname)
    with open(fpath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    image_url = f"/api/static/college_images/{fname}"
    await run_in_threadpool(lambda: supa.table("colleges").update({"image_url": image_url}).eq("id", college_id).execute())
    return {"image_url": image_url}


@router.patch("/colleges/{college_id}/details")
async def admin_update_college(college_id: str, data: CollegeUpdate, _=Depends(require_admin_token)):
    update_fields: dict = {k: v for k, v in data.dict(exclude_none=True).items()}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided")
    await run_in_threadpool(lambda: supa.table("colleges").update(update_fields).eq("id", college_id).execute())
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


@router.get("/colleges-contacts/export")
async def export_contacts(_=Depends(require_admin_token)):
    result = await run_in_threadpool(
        lambda: supa.table("coaches").select("*, colleges(name,division,conference,state)").order("last_verified", desc=True).execute()
    )
    coaches = result.data or []
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
