from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from typing import Optional
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from datetime import datetime, timezone

router = APIRouter(tags=["colleges"])


@router.get("/colleges")
async def get_colleges(
    search: Optional[str] = None,
    division: Optional[str] = None,
    foreign_friendly: Optional[bool] = None,
    state: Optional[str] = None,
):
    # Check global show_european setting
    settings_result = await run_in_threadpool(
        lambda: supa.table("app_settings").select("show_european").eq("key", "global").execute()
    )
    show_european = True
    if settings_result.data:
        show_european = settings_result.data[0].get("show_european", True)

    query = supa.table("colleges").select(
        "id,name,location,state,division,conference,foreign_friendly,ranking,"
        "acceptance_rate,image_url,scholarship_info,notable_alumni,website,"
        "region,country,language_of_study,scholarship_type,coaches(*)"
    )
    if search:
        query = query.ilike("name", f"%{search}%")
    if division:
        query = query.eq("division", division)
    if foreign_friendly is not None:
        query = query.eq("foreign_friendly", foreign_friendly)
    if state:
        query = query.ilike("state", f"%{state}%")
    if not show_european:
        query = query.neq("region", "Europe")

    result = await run_in_threadpool(lambda: query.order("ranking").limit(500).execute())
    return result.data


@router.get("/colleges/compare")
async def compare_colleges(ids: str, current_user: UserModel = Depends(get_current_user)):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) < 2 or len(id_list) > 3:
        raise HTTPException(status_code=400, detail="Provide 2 or 3 college IDs")

    result = await run_in_threadpool(
        lambda: supa.table("colleges").select("*, coaches(*)").in_("id", id_list).execute()
    )
    colleges = result.data

    for c in colleges:
        cid = c["id"]
        tracked_result = await run_in_threadpool(
            lambda c2=cid: supa.table("tracked_colleges")
            .select("status")
            .eq("user_id", current_user.user_id)
            .eq("college_id", c2)
            .execute()
        )
        tracked = tracked_result.data[0] if tracked_result.data else None
        c["tracked_status"] = tracked.get("status") if tracked else None
        c["progress_score"] = 0

    return colleges


@router.get("/colleges/{college_id}")
async def get_college(college_id: str):
    result = await run_in_threadpool(
        lambda: supa.table("colleges").select("*, coaches(*)").eq("id", college_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="College not found")
    return result.data[0]
