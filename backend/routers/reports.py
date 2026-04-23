from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user

router = APIRouter(tags=["reports"])

# These issue types indicate the coach email is actively bad → strip verified badge immediately
EMAIL_INVALID_TYPES = {
    "Wrong email address",
    "Email bounced / undeliverable",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/reports/college")
async def submit_college_report(body: dict, current_user: UserModel = Depends(get_current_user)):
    college_id  = body.get("college_id", "")
    coach_name  = body.get("coach_name", "")
    issue_type  = body.get("issue_type", "")
    correct_info = body.get("correct_info", "")
    notes       = body.get("notes", "")
    college_name = body.get("college_name", "")

    doc = {
        "user_id":      current_user.user_id,
        "college_id":   college_id,
        "college_name": college_name,
        "coach_name":   coach_name,
        "issue_type":   issue_type,
        "correct_info": correct_info,
        "notes":        notes,
        "status":       "open",
        "created_at":   _now(),
    }
    result = await run_in_threadpool(lambda: supa.table("college_reports").insert(doc).execute())

    # If the issue is a bad email, immediately remove the verified badge from the coach
    if issue_type in EMAIL_INVALID_TYPES and college_id and coach_name:
        await run_in_threadpool(
            lambda: supa.table("coaches")
            .update({"last_verified": None})
            .eq("college_id", college_id)
            .eq("name", coach_name)
            .execute()
        )

    return result.data[0] if result.data else doc


@router.get("/notifications")
async def get_notifications(current_user: UserModel = Depends(get_current_user)):
    result = await run_in_threadpool(
        lambda: supa.table("user_notifications")
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: UserModel = Depends(get_current_user)):
    await run_in_threadpool(
        lambda: supa.table("user_notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    return {"ok": True}
