from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from bson import ObjectId
from database import db
from auth_utils import UserModel, get_current_user
from seed_data import EUROPEAN_COLLEGES
from datetime import datetime, timezone

router = APIRouter(tags=["colleges"])


@router.get("/colleges")
async def get_colleges(
    search: Optional[str] = None,
    division: Optional[str] = None,
    foreign_friendly: Optional[bool] = None,
    state: Optional[str] = None,
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if division:
        query["division"] = division
    if foreign_friendly is not None:
        query["foreign_friendly"] = foreign_friendly
    if state:
        query["state"] = {"$regex": state, "$options": "i"}

    # Check global setting — hide European colleges if disabled
    settings = await db.app_settings.find_one({"key": "global"}, {"_id": 0})
    show_european = settings.get("show_european", True) if settings else True
    if not show_european:
        query["region"] = {"$ne": "Europe"}

    colleges = await db.colleges.find(query, {
        "_id": 1, "name": 1, "location": 1, "state": 1, "division": 1,
        "conference": 1, "foreign_friendly": 1, "ranking": 1, "acceptance_rate": 1,
        "coaches": 1, "image_url": 1, "scholarship_info": 1, "notable_alumni": 1,
        "website": 1, "region": 1, "country": 1, "language_of_study": 1, "scholarship_type": 1,
    }).sort("ranking", 1).to_list(500)

    for c in colleges:
        c["id"] = str(c.pop("_id"))
    return colleges


@router.get("/colleges/compare")
async def compare_colleges(ids: str, current_user: UserModel = Depends(get_current_user)):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) < 2 or len(id_list) > 3:
        raise HTTPException(status_code=400, detail="Provide 2 or 3 college IDs")
    oid_list = []
    for cid in id_list:
        try:
            oid_list.append(ObjectId(cid))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid id: {cid}")
    colleges = await db.colleges.find({"_id": {"$in": oid_list}}).to_list(3)
    result = []
    for c in colleges:
        tracked = await db.tracked_colleges.find_one(
            {"user_id": current_user.user_id, "college_id": str(c["_id"])},
            {"_id": 0, "status": 1, "progress_score": 1}
        )
        c["id"] = str(c.pop("_id"))
        c["tracked_status"] = tracked.get("status") if tracked else None
        c["progress_score"] = tracked.get("progress_score") if tracked else 0
        result.append(c)
    return result


@router.get("/colleges/{college_id}")
async def get_college(college_id: str):
    try:
        college = await db.colleges.find_one({"_id": ObjectId(college_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college ID")
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    college["id"] = str(college.pop("_id"))
    return college


@router.post("/seed-european-colleges")
async def seed_european_colleges(current_user: UserModel = Depends(get_current_user)):
    inserted, skipped = 0, 0
    for college in EUROPEAN_COLLEGES:
        exists = await db.colleges.find_one({"name": college["name"]})
        if exists:
            skipped += 1
            continue
        college_doc = {**college, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.colleges.insert_one(college_doc)
        inserted += 1
    return {"inserted": inserted, "skipped": skipped, "total": len(EUROPEAN_COLLEGES)}


@router.post("/migrate-us-region")
async def migrate_us_region(current_user: UserModel = Depends(get_current_user)):
    result = await db.colleges.update_many(
        {"region": {"$exists": False}},
        {"$set": {"region": "USA"}}
    )
    return {"updated": result.modified_count}
