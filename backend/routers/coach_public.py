import re
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa

router = APIRouter(prefix="/coach", tags=["coach-public"])


def _to_slug(name: str) -> str:
    slug = (name or "").lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


@router.get("/public/{slug}")
async def get_public_coach_profile(slug: str):
    """Publicly accessible programme page — no auth required."""
    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select(
            "id,full_name,institution_name,primary_sport,division,conference,"
            "bio,recruiting_prefs,verification_status,created_at"
        )
        .eq("verification_status", "verified")
        .execute()
    )
    coaches = result.data or []
    match = next(
        (c for c in coaches if _to_slug(c.get("institution_name") or "") == slug),
        None,
    )
    if not match:
        raise HTTPException(status_code=404, detail="Programme not found")

    prefs = match.get("recruiting_prefs") or {}
    return {
        "coach_name": match["full_name"],
        "institution_name": match["institution_name"],
        "primary_sport": match.get("primary_sport"),
        "division": match.get("division"),
        "conference": match.get("conference"),
        "bio": match.get("bio"),
        "slug": slug,
        "recruiting_prefs": {
            "positions": prefs.get("positions") or [],
            "grad_years": prefs.get("grad_years") or [],
            "divisions": prefs.get("divisions") or [],
            "min_height_cm": prefs.get("min_height_cm"),
            "min_ppg": prefs.get("min_ppg"),
            "min_gpa": prefs.get("min_gpa"),
        },
        "is_verified": True,
    }
