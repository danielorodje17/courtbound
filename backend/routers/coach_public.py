import re
from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa

router = APIRouter(prefix="/coach", tags=["coach-public"])


def _to_slug(name: str) -> str:
    slug = (name or "").lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


@router.get("/public/{slug}")
async def get_public_coach_profile(slug: str, request: Request):
    """Publicly accessible programme page — no auth required."""
    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("*")
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

    privacy = match.get("privacy_settings") or {}
    # Respect profile_visible — default True if not set
    if privacy.get("profile_visible") is False:
        raise HTTPException(status_code=404, detail="Programme not found")

    # Track this programme view asynchronously (fire and forget, don't break on error)
    try:
        view_row = {
            "coach_id": str(match["id"]),
            "viewer_type": "player",
            "viewed_at": datetime.now(timezone.utc).isoformat(),
        }
        await run_in_threadpool(lambda: supa.table("coach_programme_views").insert(view_row).execute())
    except Exception:
        pass  # Don't fail the page load if tracking fails

    prefs = match.get("recruiting_prefs") or {}
    hide_prefs = privacy.get("hide_recruiting_prefs", False)

    return {
        "coach_name": match["full_name"],
        "institution_name": match["institution_name"],
        "primary_sport": match.get("primary_sport"),
        "division": match.get("division"),
        "conference": match.get("conference"),
        "bio": match.get("about_programme"),
        "slug": slug,
        "recruiting_prefs": {} if hide_prefs else {
            "positions": prefs.get("positions") or [],
            "grad_years": prefs.get("grad_years") or [],
            "divisions": prefs.get("divisions") or [],
            "min_height_cm": prefs.get("min_height_cm"),
            "min_ppg": prefs.get("min_ppg"),
            "min_gpa": prefs.get("min_gpa"),
        },
        # Programme detail fields (What We Offer)
        "scholarship_type": match.get("scholarship_type"),
        "scholarship_avg_value": match.get("scholarship_avg_value"),
        "nil_available": match.get("nil_available") or False,
        "nil_description": match.get("nil_description"),
        "housing_type": match.get("housing_type"),
        "f1_visa_support": match.get("f1_visa_support"),
        "international_players_count": match.get("international_players_count"),
        "is_verified": True,
    }
