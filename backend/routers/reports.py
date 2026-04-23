from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import CollegeReportCreate

router = APIRouter(tags=["reports"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/reports")
async def submit_report(data: CollegeReportCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id,
        "college_id": data.college_id,
        "issue_type": data.report_type,
        "notes": data.description,
        "correct_info": data.suggested_value or "",
        "status": "open",
        "created_at": _now(),
    }
    result = await run_in_threadpool(lambda: supa.table("college_reports").insert(doc).execute())
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
