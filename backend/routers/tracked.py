from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
import uuid
from supabase_db import supa
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


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/my-colleges")
async def get_my_colleges(current_user: UserModel = Depends(get_current_user)):
    uid = current_user.user_id

    tracked_result = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("*, colleges(*, coaches(*))")
        .eq("user_id", uid)
        .execute()
    )
    if not tracked_result.data:
        return []

    tracked_list = tracked_result.data
    college_ids = [t["college_id"] for t in tracked_list]

    # Sent emails set
    emails_result = await run_in_threadpool(
        lambda: supa.table("emails")
        .select("college_id")
        .eq("user_id", uid)
        .eq("direction", "sent")
        .in_("college_id", college_ids)
        .execute()
    )
    sent_set = {e["college_id"] for e in (emails_result.data or [])}

    # Checklists
    checklists_result = await run_in_threadpool(
        lambda: supa.table("college_checklists")
        .select("college_id,items")
        .eq("user_id", uid)
        .in_("college_id", college_ids)
        .execute()
    )
    checklist_map = {cl["college_id"]: cl.get("items", []) for cl in (checklists_result.data or [])}

    result = []
    for t in tracked_list:
        college = t.get("colleges")
        if not college:
            continue
        # Rename embedded 'colleges' → 'college' for frontend compat
        t["college"] = t.pop("colleges")
        cid = t["college_id"]
        status = t.get("status", "interested")

        # Progress score
        score = 10
        if cid in sent_set:
            score += 15
        if status in ("contacted", "replied", "rejected"):
            score += 10
        if status == "replied":
            score += 20
        if t.get("follow_up_date"):
            score += 5
        if t.get("application_deadline"):
            score += 5
        if t.get("call_notes"):
            score += 10
        items = checklist_map.get(cid, [])
        if items:
            pct = sum(1 for i in items if i.get("checked")) / len(items)
            if pct >= 1.0:
                score += 25
            elif pct >= 0.5:
                score += 15
        t["progress_score"] = min(score, 100)
        result.append(t)

    return result


@router.post("/my-colleges")
async def track_college(data: CollegeTrackedCreate, current_user: UserModel = Depends(get_current_user)):
    try:
        ins_result = await run_in_threadpool(
            lambda: supa.table("tracked_colleges").insert({
                "user_id": current_user.user_id,
                "college_id": data.college_id,
                "notes": data.notes or "",
                "status": "interested",
                "created_at": _now(),
                "updated_at": _now(),
            }).execute()
        )
        return ins_result.data[0] if ins_result.data else {"message": "Tracked"}
    except Exception as e:
        err = str(e)
        if "23505" in err or "duplicate" in err.lower() or "unique" in err.lower():
            raise HTTPException(status_code=400, detail="Already tracking this college")
        raise HTTPException(status_code=400, detail=err)


@router.delete("/my-colleges/{college_id}")
async def untrack_college(college_id: str, current_user: UserModel = Depends(get_current_user)):
    await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .delete()
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    return {"message": "Removed from tracking"}


@router.patch("/my-colleges/{college_id}/status")
async def update_tracked_status(college_id: str, body: dict, current_user: UserModel = Depends(get_current_user)):
    update_fields = {
        "status": body.get("status", "interested"),
        "notes": body.get("notes", ""),
        "updated_at": _now(),
    }
    for key in ("follow_up_date", "application_deadline", "signing_day"):
        if key in body:
            update_fields[key] = body[key] or None
    await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .update(update_fields)
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    return {"message": "Updated"}


@router.post("/my-colleges/{college_id}/call-note")
async def add_call_note(college_id: str, data: CallNoteCreate, current_user: UserModel = Depends(get_current_user)):
    note = {
        "id": str(uuid.uuid4()),
        "content": data.content,
        "date": data.date or datetime.now(timezone.utc).date().isoformat(),
        "created_at": _now(),
    }
    # Fetch current call_notes
    cur = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("call_notes")
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    existing_notes = []
    if cur.data:
        existing_notes = cur.data[0].get("call_notes") or []

    new_notes = existing_notes + [note]
    await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .update({"call_notes": new_notes, "updated_at": _now()})
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    return note


@router.delete("/my-colleges/{college_id}/call-note/{note_id}")
async def delete_call_note(college_id: str, note_id: str, current_user: UserModel = Depends(get_current_user)):
    cur = await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .select("call_notes")
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    existing = []
    if cur.data:
        existing = cur.data[0].get("call_notes") or []

    new_notes = [n for n in existing if n.get("id") != note_id]
    await run_in_threadpool(
        lambda: supa.table("tracked_colleges")
        .update({"call_notes": new_notes, "updated_at": _now()})
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    return {"message": "Deleted"}


@router.get("/checklist/{college_id}")
async def get_checklist(college_id: str, current_user: UserModel = Depends(get_current_user)):
    result = await run_in_threadpool(
        lambda: supa.table("college_checklists")
        .select("*")
        .eq("user_id", current_user.user_id)
        .eq("college_id", college_id)
        .execute()
    )
    if result.data:
        return result.data[0]
    items = [{"id": i["id"], "label": i["label"], "checked": False} for i in DEFAULT_CHECKLIST]
    return {"user_id": current_user.user_id, "college_id": college_id, "items": items}


@router.put("/checklist/{college_id}")
async def update_checklist(college_id: str, data: ChecklistUpdate, current_user: UserModel = Depends(get_current_user)):
    await run_in_threadpool(
        lambda: supa.table("college_checklists").upsert(
            {
                "user_id": current_user.user_id,
                "college_id": college_id,
                "items": data.items,
                "updated_at": _now(),
            },
            on_conflict="user_id,college_id",
        ).execute()
    )
    return {"message": "Checklist updated"}
