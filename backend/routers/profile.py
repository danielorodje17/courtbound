from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import PlayerProfile

router = APIRouter(tags=["profile"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/profile")
async def get_profile(current_user: UserModel = Depends(get_current_user)):
    result = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", current_user.user_id).execute()
    )
    if not result.data:
        return {}
    doc = result.data[0]
    doc.pop("user_id", None)
    doc.pop("id", None)
    return doc


@router.put("/profile")
async def save_profile(data: PlayerProfile, current_user: UserModel = Depends(get_current_user)):
    payload = {k: v for k, v in data.dict().items() if v is not None and v != ""}
    # Map primary_position → position (Supabase column name is 'position')
    if "primary_position" in payload:
        if not payload.get("position"):
            payload["position"] = payload["primary_position"]
        del payload["primary_position"]
    # Convert empty date string to None for PostgreSQL DATE type
    if payload.get("date_of_birth") == "":
        payload["date_of_birth"] = None
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = _now()

    try:
        await run_in_threadpool(
            lambda: supa.table("profiles").upsert(payload, on_conflict="user_id").execute()
        )
    except Exception:
        # Graceful pre-migration fallback: remove columns that may not exist yet
        for col in ("basketball_gender",):
            payload.pop(col, None)
        await run_in_threadpool(
            lambda: supa.table("profiles").upsert(payload, on_conflict="user_id").execute()
        )
    return {"message": "Profile saved"}
