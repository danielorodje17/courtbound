from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
import uuid
from database import db
from auth_utils import UserModel, get_current_user
from models import CollegeTrackedCreate, ChecklistUpdate, CallNoteCreate

router = APIRouter(tags=["tracked"])

DEFAULT_CHECKLIST = [
    {"id": "email_sent",     "label": "Send initial email to coach"},
    {"id": "info_requested", "label": "Request programme info / brochure"},
    {"id": "highlight_tape", "label": "Send highlight tape (Hudl / YouTube)"},
    {"id": "transcripts",    "label": "Gather academic transcripts"},
    {"id": "ncaa_id",        "label": "Register with NCAA Eligibility Center"},
    {"id": "sat_act",        "label": "Complete SAT / ACT exam (if required)"},
    {"id": "application",    "label": "Submit college application"},
    {"id": "financial_aid",  "label": "Apply for financial aid / scholarship forms"},
    {"id": "visa",           "label": "Apply for student visa (F-1)"},
    {"id": "nli_signed",     "label": "Sign National Letter of Intent (NLI)"},
]


@router.get("/my-colleges")
async def get_my_colleges(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return []
    uid = current_user.user_id
    tracked_cids = [t["college_id"] for t in tracked]
    college_ids_oid = []
    for cid in tracked_cids:
        try:
            college_ids_oid.append(ObjectId(cid))
        except Exception:
            pass

    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids_oid}}).to_list(500)
    emails_cursor = await db.emails.find(
        {"user_id": uid, "college_id": {"$in": tracked_cids}, "direction": "sent"},
        {"_id": 0, "college_id": 1}
    ).to_list(1000)
    checklists_cursor = await db.college_checklists.find(
        {"user_id": uid, "college_id": {"$in": tracked_cids}},
        {"_id": 0, "college_id": 1, "items": 1}
    ).to_list(500)

    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    sent_set = {e["college_id"] for e in emails_cursor}
    checklist_map = {cl["college_id"]: cl.get("items", []) for cl in checklists_cursor}

    result = []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if college:
            college["id"] = str(college.pop("_id"))
            t["id"] = str(t.pop("_id"))
            t["college"] = college
            cid = t["college_id"]
            score = 10
            if cid in sent_set: score += 15
            if t.get("status") in ["contacted", "replied", "rejected"]: score += 10
            if t.get("status") == "replied": score += 20
            if t.get("follow_up_date"): score += 5
            if t.get("application_deadline"): score += 5
            if t.get("call_notes"): score += 10
            items = checklist_map.get(cid, [])
            if items:
                pct = sum(1 for i in items if i.get("checked")) / len(items)
                if pct >= 1.0: score += 25
                elif pct >= 0.5: score += 15
            t["progress_score"] = min(score, 100)
            result.append(t)
    return result


@router.post("/my-colleges")
async def track_college(data: CollegeTrackedCreate, current_user: UserModel = Depends(get_current_user)):
    existing = await db.tracked_colleges.find_one({"user_id": current_user.user_id, "college_id": data.college_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already tracking this college")
    doc = {
        "user_id": current_user.user_id, "college_id": data.college_id,
        "notes": data.notes, "status": "interested",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.tracked_colleges.insert_one(doc)
    doc.pop("_id", None)
    return {"id": str(result.inserted_id), **doc}


@router.delete("/my-colleges/{college_id}")
async def untrack_college(college_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.tracked_colleges.delete_one({"user_id": current_user.user_id, "college_id": college_id})
    return {"message": "Removed from tracking"}


@router.patch("/my-colleges/{college_id}/status")
async def update_tracked_status(college_id: str, body: dict, current_user: UserModel = Depends(get_current_user)):
    update_fields = {
        "status": body.get("status", "interested"),
        "notes": body.get("notes", ""),
    }
    for key in ("follow_up_date", "application_deadline", "signing_day"):
        if key in body:
            update_fields[key] = body[key]
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$set": update_fields}
    )
    return {"message": "Updated"}


@router.post("/my-colleges/{college_id}/call-note")
async def add_call_note(college_id: str, data: CallNoteCreate, current_user: UserModel = Depends(get_current_user)):
    note = {
        "id": str(uuid.uuid4()),
        "content": data.content,
        "date": data.date or datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$push": {"call_notes": note}}
    )
    return note


@router.delete("/my-colleges/{college_id}/call-note/{note_id}")
async def delete_call_note(college_id: str, note_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$pull": {"call_notes": {"id": note_id}}}
    )
    return {"message": "Deleted"}


@router.get("/checklist/{college_id}")
async def get_checklist(college_id: str, current_user: UserModel = Depends(get_current_user)):
    doc = await db.college_checklists.find_one(
        {"user_id": current_user.user_id, "college_id": college_id}, {"_id": 0}
    )
    if doc:
        return doc
    items = [{"id": i["id"], "label": i["label"], "checked": False} for i in DEFAULT_CHECKLIST]
    return {"user_id": current_user.user_id, "college_id": college_id, "items": items}


@router.put("/checklist/{college_id}")
async def update_checklist(college_id: str, data: ChecklistUpdate, current_user: UserModel = Depends(get_current_user)):
    await db.college_checklists.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$set": {"items": data.items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Checklist updated"}
