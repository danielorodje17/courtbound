import io
import csv
import re as _re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import EmailLogCreate, BulkEmailImport, ReplyLogRequest, EmailTemplateCreate

router = APIRouter(tags=["emails"])


def _clean(val: str) -> str:
    if not val:
        return ""
    v = val.strip()
    v = _re.sub(r'[^\x20-\x7E\u00C0-\u024F]', '', v)
    return v.strip()


def _map_type_to_direction(t: str) -> str:
    t = t.lower()
    if "received" in t or "reply" in t or "response" in t or "incoming" in t:
        return "received"
    return "sent"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/emails/college-context/{college_id}")
async def college_context(college_id: str, current_user: UserModel = Depends(get_current_user)):
    tracked_result = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("reply_outcome,notes")
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    tracked = tracked_result.data[0] if tracked_result.data else None

    received_result = await run_in_threadpool(
        lambda: supa.table("emails")
        .select("subject,body,coach_name,created_at")
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .eq("direction", "received")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    latest_reply = received_result.data[0] if received_result.data else None

    return {
        "reply_outcome": tracked.get("reply_outcome", "") if tracked else "",
        "notes": tracked.get("notes", "") if tracked else "",
        "latest_reply": latest_reply,
    }


@router.get("/emails")
async def get_emails(current_user: UserModel = Depends(get_current_user), college_id: str = None):
    query = supa.table("emails").select("*").eq("user_id", current_user.user_id)
    if college_id:
        query = query.eq("college_id", college_id)
    result = await run_in_threadpool(lambda: query.order("created_at", desc=True).limit(500).execute())
    return result.data


@router.post("/emails")
async def log_email(data: EmailLogCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id,
        "college_id": data.college_id,
        "direction": data.direction,
        "subject": data.subject,
        "body": data.body,
        "coach_name": data.coach_name or "",
        "coach_email": data.coach_email or "",
        "message_type": data.message_type or "initial_outreach",
        "created_at": _now(),
    }
    result = await run_in_threadpool(lambda: supa.table("emails").insert(doc).execute())
    return result.data[0] if result.data else doc


@router.delete("/emails/{email_id}")
async def delete_email(email_id: str, current_user: UserModel = Depends(get_current_user)):
    await run_in_threadpool(
        lambda: supa.table("emails")
        .delete()
        .eq("id", email_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    return {"message": "Deleted"}


@router.post("/emails/bulk")
async def bulk_import_emails(data: BulkEmailImport, current_user: UserModel = Depends(get_current_user)):
    if not data.college_ids:
        raise HTTPException(status_code=400, detail="No colleges selected")

    sent_date = data.sent_date or _now()
    docs = []
    for college_id in data.college_ids:
        college_result = await run_in_threadpool(
            lambda cid=college_id: supa.table("colleges")
            .select("id,coaches(*)")
            .eq("id", cid)
            .execute()
        )
        if not college_result.data:
            continue
        college = college_result.data[0]
        coaches = college.get("coaches") or [{}]
        coach = coaches[0] if coaches else {}
        docs.append({
            "user_id": current_user.user_id,
            "college_id": college_id,
            "direction": data.direction,
            "subject": data.subject,
            "body": data.body,
            "coach_name": data.coach_name or coach.get("name", ""),
            "coach_email": coach.get("email", ""),
            "message_type": "initial_outreach",
            "created_at": sent_date,
        })

    if not docs:
        raise HTTPException(status_code=400, detail="No valid colleges found")

    result = await run_in_threadpool(lambda: supa.table("emails").insert(docs).execute())
    count = len(result.data) if result.data else len(docs)
    return {"inserted": count, "message": f"Logged email for {count} colleges"}


@router.post("/emails/import-csv")
async def import_csv(current_user: UserModel = Depends(get_current_user), file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = [{k.strip(): v for k, v in row.items()} for row in reader]
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or unreadable")

    emails_added = duplicates_skipped = 0
    ts = _now()

    for row in rows:
        college_name = _clean(row.get("College Name", ""))
        if not college_name:
            continue
        date_str = _clean(row.get("Date (YYYY-MM-DD)", ""))
        comm_type = _clean(row.get("Type", "Email Sent"))
        coach_name = _clean(row.get("Coach Name", ""))
        coach_email = _clean(row.get("Coach Email", ""))
        subject = _clean(row.get("Subject", ""))
        notes = _clean(row.get("Notes", ""))
        follow_up_needed = _clean(row.get("Follow Up Needed (yes/no)", "no")).lower() == "yes"
        follow_up_date = _clean(row.get("Follow Up Date (YYYY-MM-DD)", ""))
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            dt = ts
        direction = _map_type_to_direction(comm_type)

        name_base = college_name.split("(")[0].split("–")[0].split("-")[0].strip()
        college_result = await run_in_threadpool(
            lambda nb=name_base: supa.table("colleges").select("id").ilike("name", f"{nb}%").execute()
        )
        if not college_result.data:
            continue
        college_id = college_result.data[0]["id"]

        tracked_result = await run_in_threadpool(
            lambda: supa.table("tracked_colleges")
            .select("status")
            .eq("user_id", current_user.user_id)
            .eq("college_id", college_id)
            .execute()
        )
        follow_note = f" | Follow up by: {follow_up_date}" if follow_up_needed and follow_up_date else ""
        if not tracked_result.data:
            await run_in_threadpool(
                lambda: supa.table("tracked_colleges").insert({
                    "user_id": current_user.user_id, "college_id": college_id,
                    "notes": (notes or "") + follow_note, "status": "contacted",
                    "follow_up_needed": follow_up_needed,
                    "follow_up_date": follow_up_date or None,
                    "created_at": ts, "updated_at": ts,
                }).execute()
            )
        else:
            if tracked_result.data[0].get("status") == "interested":
                await run_in_threadpool(
                    lambda: supa.table("tracked_colleges")
                    .update({"status": "contacted",
                             "follow_up_needed": follow_up_needed,
                             "follow_up_date": follow_up_date or None})
                    .eq("user_id", current_user.user_id)
                    .eq("college_id", college_id)
                    .execute()
                )

        dup_result = await run_in_threadpool(
            lambda: supa.table("emails")
            .select("id")
            .eq("user_id", current_user.user_id)
            .eq("college_id", college_id)
            .eq("subject", subject)
            .eq("created_at", dt)
            .execute()
        )
        if not dup_result.data:
            await run_in_threadpool(
                lambda: supa.table("emails").insert({
                    "user_id": current_user.user_id, "college_id": college_id,
                    "direction": direction, "subject": subject, "body": notes,
                    "coach_name": coach_name if "not listed" not in coach_name.lower() else "",
                    "coach_email": coach_email, "created_at": dt,
                    "follow_up_needed": follow_up_needed,
                    "follow_up_date": follow_up_date or None,
                    "message_type": "initial_outreach",
                }).execute()
            )
            emails_added += 1
        else:
            duplicates_skipped += 1

    return {
        "emails_added": emails_added,
        "duplicates_skipped": duplicates_skipped,
        "total_rows": len(rows),
        "message": f"Import complete: {emails_added} emails logged.",
    }


@router.post("/emails/log-reply")
async def log_reply(data: ReplyLogRequest, current_user: UserModel = Depends(get_current_user)):
    received_at = data.received_date or _now()
    doc = {
        "user_id": current_user.user_id,
        "college_id": data.college_id,
        "direction": "received",
        "subject": data.subject or "Reply from coach",
        "body": data.body,
        "coach_name": data.coach_name or "",
        "coach_email": data.coach_email or "",
        "message_type": "coach_reply",
        "created_at": received_at,
    }
    result = await run_in_threadpool(lambda: supa.table("emails").insert(doc).execute())
    saved = result.data[0] if result.data else doc

    outcome_status_map = {
        "interested": "replied",
        "schedule_call": "replied",
        "rejected": "replied",
        "scholarship_offered": "replied",
    }
    new_status = outcome_status_map.get(data.outcome or "", "replied")
    await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .update({"status": new_status, "reply_outcome": data.outcome or "", "updated_at": _now()})
        .eq("user_id", current_user.user_id)
        .eq("college_id", data.college_id)
        .in_("status", ["interested", "contacted", "replied"])
        .execute()
    )
    return saved


@router.get("/responses/summary")
async def get_response_summary(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id

    tracked_result = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("*, colleges(id,name,division,location,coaches(name,email,title))")
        .eq("user_id", uid)
        .execute()
    )
    if not tracked_result.data:
        return []

    tracked_list = tracked_result.data
    college_ids = [t["college_id"] for t in tracked_list]

    emails_result = await run_in_threadpool(
        lambda: supa.table("emails")
        .select("college_id,direction,subject,body,coach_name,created_at")
        .eq("user_id", uid)
        .in_("college_id", college_ids)
        .order("created_at", desc=True)
        .execute()
    )
    emails_data = emails_result.data or []

    # Group emails by college + direction
    from collections import defaultdict
    email_stats: dict = defaultdict(lambda: defaultdict(dict))
    for e in emails_data:
        cid = e["college_id"]
        direction = e["direction"]
        if not email_stats[cid][direction]:
            email_stats[cid][direction] = {
                "count": 0,
                "last_date": e.get("created_at"),
                "last_subject": e.get("subject"),
                "last_body": e.get("body"),
                "last_coach": e.get("coach_name"),
            }
        email_stats[cid][direction]["count"] += 1

    result = []
    for t in tracked_list:
        college = t.get("colleges")
        if not college:
            continue
        cid = t["college_id"]
        result.append({
            "tracked_id": t["id"],
            "college_id": cid,
            "college": college,
            "status": t.get("status", "interested"),
            "reply_outcome": t.get("reply_outcome") or "",
            "notes": t.get("notes") or "",
            "sent": email_stats[cid].get("sent"),
            "received": email_stats[cid].get("received"),
        })
    return result


# ── Templates ────────────────────────────────────────────────────────────────

@router.get("/templates")
async def get_templates(current_user: UserModel = Depends(get_current_user)):
    result = await run_in_threadpool(
        lambda: supa.table("email_templates")
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


@router.post("/templates")
async def save_template(data: EmailTemplateCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id,
        "name": data.name,
        "subject": data.subject,
        "body": data.body,
        "message_type": data.message_type,
        "created_at": _now(),
    }
    result = await run_in_threadpool(lambda: supa.table("email_templates").insert(doc).execute())
    return result.data[0] if result.data else doc


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: UserModel = Depends(get_current_user)):
    await run_in_threadpool(
        lambda: supa.table("email_templates")
        .delete()
        .eq("id", template_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    return {"message": "Deleted"}
