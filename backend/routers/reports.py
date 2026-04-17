import uuid
from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import UserModel, get_current_user
from datetime import datetime, timezone

router = APIRouter(tags=["reports"])


@router.post("/reports/college")
async def submit_report(body: dict, current_user: UserModel = Depends(get_current_user)):
    college_id   = body.get("college_id", "")
    college_name = body.get("college_name", "")
    coach_name   = body.get("coach_name", "")
    issue_type   = body.get("issue_type", "")
    correct_info = body.get("correct_info", "")
    notes        = body.get("notes", "")
    if not college_id or not issue_type:
        raise HTTPException(status_code=400, detail="college_id and issue_type required")
    report = {
        "id":           str(uuid.uuid4()),
        "user_id":      current_user.user_id,
        "user_name":    current_user.name,
        "user_email":   current_user.email,
        "college_id":   college_id,
        "college_name": college_name,
        "coach_name":   coach_name,
        "issue_type":   issue_type,
        "correct_info": correct_info,
        "notes":        notes,
        "status":       "pending",
        "admin_response": "",
        "created_at":   datetime.now(timezone.utc).isoformat(),
        "updated_at":   datetime.now(timezone.utc).isoformat(),
    }
    await db.college_reports.insert_one(report)
    return {k: v for k, v in report.items() if k != "_id"}


@router.get("/reports/my")
async def my_reports(current_user: UserModel = Depends(get_current_user)):
    reports = await db.college_reports.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return reports


@router.get("/notifications")
async def get_notifications(current_user: UserModel = Depends(get_current_user)):
    notifs = await db.user_notifications.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "unread": unread}


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.user_notifications.update_one(
        {"id": notif_id, "user_id": current_user.user_id},
        {"$set": {"read": True}}
    )
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(current_user: UserModel = Depends(get_current_user)):
    await db.user_notifications.update_many(
        {"user_id": current_user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"ok": True}
