from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from database import db
from auth_utils import UserModel, get_current_user
from models import PlayerProfile

router = APIRouter(tags=["profile"])


@router.get("/profile")
async def get_profile(current_user: UserModel = Depends(get_current_user)):
    doc = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not doc:
        return {}
    doc.pop("user_id", None)
    return doc


@router.put("/profile")
async def save_profile(data: PlayerProfile, current_user: UserModel = Depends(get_current_user)):
    payload = {k: v for k, v in data.dict().items() if v is not None and v != ""}
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.profiles.update_one(
        {"user_id": current_user.user_id}, {"$set": payload}, upsert=True
    )
    return {"message": "Profile saved"}
