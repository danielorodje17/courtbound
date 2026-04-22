import io
import csv
import re as _re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from bson import ObjectId
from datetime import datetime, timezone
from database import db
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


@router.get("/emails/college-context/{college_id}")
async def college_context(college_id: str, current_user: UserModel = Depends(get_current_user)):
    """Returns the latest college reply and tracked outcome for the compose page."""
    tracked = await db.tracked_colleges.find_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"_id": 0, "reply_outcome": 1, "notes": 1}
    )
    received = await db.emails.find(
        {"user_id": current_user.user_id, "college_id": college_id, "direction": "received"},
        {"_id": 0, "subject": 1, "body": 1, "coach_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(1).to_list(1)
    latest_reply = received[0] if received else None
    return {
        "reply_outcome": tracked.get("reply_outcome", "") if tracked else "",
        "notes": tracked.get("notes", "") if tracked else "",
        "latest_reply": latest_reply,
    }


@router.get("/emails")
async def get_emails(current_user: UserModel = Depends(get_current_user), college_id: str = None):
    query = {"user_id": current_user.user_id}
    if college_id:
        query["college_id"] = college_id
    emails = await db.emails.find(query).sort("created_at", -1).to_list(500)
    for e in emails:
        e["id"] = str(e.pop("_id"))
    return emails


@router.post("/emails")
async def log_email(data: EmailLogCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id, "college_id": data.college_id,
        "direction": data.direction, "subject": data.subject, "body": data.body,
        "coach_name": data.coach_name, "coach_email": data.coach_email,
        "message_type": data.message_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.emails.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.delete("/emails/{email_id}")
async def delete_email(email_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.emails.delete_one({"_id": ObjectId(email_id), "user_id": current_user.user_id})
    return {"message": "Deleted"}


@router.post("/emails/bulk")
async def bulk_import_emails(data: BulkEmailImport, current_user: UserModel = Depends(get_current_user)):
    if not data.college_ids:
        raise HTTPException(status_code=400, detail="No colleges selected")
    docs = []
    sent_date = data.sent_date or datetime.now(timezone.utc).isoformat()
    for college_id in data.college_ids:
        try:
            college = await db.colleges.find_one({"_id": ObjectId(college_id)})
        except Exception:
            continue
        if not college:
            continue
        coach = (college.get("coaches") or [{}])[0]
        docs.append({
            "user_id": current_user.user_id, "college_id": college_id,
            "direction": data.direction, "subject": data.subject, "body": data.body,
            "coach_name": data.coach_name or coach.get("name", ""),
            "coach_email": coach.get("email", ""), "created_at": sent_date,
        })
    if not docs:
        raise HTTPException(status_code=400, detail="No valid colleges found")
    result = await db.emails.insert_many(docs)
    return {"inserted": len(result.inserted_ids), "message": f"Logged email for {len(result.inserted_ids)} colleges"}


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
    ts = datetime.now(timezone.utc).isoformat()

    for i, row in enumerate(rows):
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
        existing_college = await db.colleges.find_one({"name": {"$regex": f"^{name_base}", "$options": "i"}})
        if not existing_college:
            # Skip rows for colleges not in the app — college import is admin-only
            continue
        college_id = str(existing_college["_id"])

        tracked = await db.tracked_colleges.find_one({"user_id": current_user.user_id, "college_id": college_id})
        follow_note = f" | Follow up by: {follow_up_date}" if follow_up_needed and follow_up_date else ""
        if not tracked:
            await db.tracked_colleges.insert_one({
                "user_id": current_user.user_id, "college_id": college_id,
                "notes": (notes or "") + follow_note, "status": "contacted",
                "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date,
                "created_at": ts,
            })
        else:
            if tracked.get("status") == "interested":
                await db.tracked_colleges.update_one(
                    {"user_id": current_user.user_id, "college_id": college_id},
                    {"$set": {"status": "contacted", "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date}},
                )
        dup = await db.emails.find_one({"user_id": current_user.user_id, "college_id": college_id, "subject": subject, "created_at": dt})
        if not dup:
            await db.emails.insert_one({
                "user_id": current_user.user_id, "college_id": college_id,
                "direction": direction, "subject": subject, "body": notes,
                "coach_name": coach_name if "not listed" not in coach_name.lower() else "",
                "coach_email": coach_email,
                "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date,
                "created_at": dt,
            })
            emails_added += 1
        else:
            duplicates_skipped += 1

    return {
        "emails_added": emails_added,
        "duplicates_skipped": duplicates_skipped, "total_rows": len(rows),
        "message": f"Import complete: {emails_added} emails logged.",
    }


@router.post("/emails/log-reply")
async def log_reply(data: ReplyLogRequest, current_user: UserModel = Depends(get_current_user)):
    received_at = data.received_date or datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": current_user.user_id, "college_id": data.college_id,
        "direction": "received",
        "subject": data.subject or "Reply from coach",
        "body": data.body, "coach_name": data.coach_name,
        "coach_email": data.coach_email, "created_at": received_at,
        "outcome": data.outcome or "",
    }
    result = await db.emails.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    # Map outcome to tracked_college status
    outcome_status_map = {
        "interested": "replied",
        "schedule_call": "replied",
        "rejected": "not_interested",
        "scholarship_offered": "offer_received",
    }
    new_status = outcome_status_map.get(data.outcome, "replied")
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": data.college_id,
         "status": {"$in": ["interested", "contacted", "replied"]}},
        {"$set": {"status": new_status, "reply_outcome": data.outcome,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return doc


@router.get("/responses/summary")
async def get_response_summary(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return []
    college_ids_str = [t["college_id"] for t in tracked]
    college_ids_obj = []
    for cid in college_ids_str:
        try:
            college_ids_obj.append(ObjectId(cid))
        except Exception:
            pass
    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids_obj}}).to_list(500)
    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    pipeline = [
        {"$match": {"user_id": current_user.user_id, "college_id": {"$in": college_ids_str}}},
        {"$group": {
            "_id": {"college_id": "$college_id", "direction": "$direction"},
            "count": {"$sum": 1}, "last_date": {"$max": "$created_at"},
            "last_subject": {"$last": "$subject"}, "last_body": {"$last": "$body"},
            "last_coach": {"$last": "$coach_name"},
        }},
    ]
    email_stats_raw = await db.emails.aggregate(pipeline).to_list(1000)
    email_stats = {}
    for stat in email_stats_raw:
        cid = stat["_id"]["college_id"]
        direction = stat["_id"]["direction"]
        if cid not in email_stats:
            email_stats[cid] = {}
        email_stats[cid][direction] = {
            "count": stat["count"], "last_date": stat["last_date"],
            "last_subject": stat["last_subject"], "last_body": stat["last_body"],
            "last_coach": stat["last_coach"],
        }
    result = []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if not college:
            continue
        result.append({
            "tracked_id": str(t["_id"]),
            "college_id": t["college_id"],
            "college": {
                "id": str(college["_id"]),
                "name": college.get("name", ""),
                "division": college.get("division", ""),
                "location": college.get("location", ""),
                "coaches": college.get("coaches", []),
            },
            "status": t.get("status", "interested"),
            "reply_outcome": t.get("reply_outcome", ""),
            "notes": t.get("notes", ""),
            "sent": email_stats.get(t["college_id"], {}).get("sent"),
            "received": email_stats.get(t["college_id"], {}).get("received"),
        })
    return result


@router.get("/templates")
async def get_templates(current_user: UserModel = Depends(get_current_user)):
    templates = await db.email_templates.find({"user_id": current_user.user_id}).sort("created_at", -1).to_list(100)
    for t in templates:
        t["id"] = str(t.pop("_id"))
    return templates


@router.post("/templates")
async def save_template(data: EmailTemplateCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id, "name": data.name,
        "subject": data.subject, "body": data.body, "message_type": data.message_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.email_templates.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.email_templates.delete_one({"_id": ObjectId(template_id), "user_id": current_user.user_id})
    return {"message": "Deleted"}
