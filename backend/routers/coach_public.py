import re
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from typing import Optional
from supabase_db import supa

router = APIRouter(prefix="/coach", tags=["coach-public"])


def _to_slug(name: str) -> str:
    slug = (name or "").lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


@router.get("/public/programmes")
async def list_programmes(
    search: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    sport: Optional[str] = Query(None),
    nil_available: Optional[bool] = Query(None),
    f1_visa: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=48),
):
    """Public programme directory — no auth required."""
    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select(
            "id, full_name, institution_name, division, conference, primary_sport, "
            "scholarship_type, nil_available, f1_visa_support, about_programme, "
            "recruiting_prefs, privacy_settings"
        )
        .eq("verification_status", "verified")
        .execute()
    )
    coaches = result.data or []

    # Respect privacy — skip profiles where profile_visible is explicitly False
    coaches = [c for c in coaches if (c.get("privacy_settings") or {}).get("profile_visible") is not False]

    # Text search across institution, coach name, conference
    if search:
        q = search.lower().strip()
        coaches = [
            c for c in coaches
            if q in (c.get("institution_name") or "").lower()
            or q in (c.get("full_name") or "").lower()
            or q in (c.get("conference") or "").lower()
        ]

    if division:
        coaches = [c for c in coaches if (c.get("division") or "").lower() == division.lower()]

    if sport:
        coaches = [c for c in coaches if sport.lower() in (c.get("primary_sport") or "").lower()]

    if nil_available is not None:
        coaches = [c for c in coaches if bool(c.get("nil_available")) == nil_available]

    if f1_visa is not None:
        coaches = [c for c in coaches if bool(c.get("f1_visa_support")) == f1_visa]

    # Sort alphabetically by institution name
    coaches.sort(key=lambda c: (c.get("institution_name") or "").lower())

    total = len(coaches)
    offset = (page - 1) * limit
    page_coaches = coaches[offset: offset + limit]

    return {
        "programmes": [
            {
                "slug": _to_slug(c.get("institution_name") or ""),
                "institution_name": c.get("institution_name"),
                "coach_name": c.get("full_name"),
                "division": c.get("division"),
                "conference": c.get("conference"),
                "primary_sport": c.get("primary_sport"),
                "scholarship_type": c.get("scholarship_type"),
                "nil_available": bool(c.get("nil_available")),
                "f1_visa_support": bool(c.get("f1_visa_support")),
                "bio": (c.get("about_programme") or "")[:160] or None,
                "positions": (c.get("recruiting_prefs") or {}).get("positions") or [],
            }
            for c in page_coaches
        ],
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


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
    coach_id_str = str(match["id"])
    try:
        view_row = {
            "coach_id": coach_id_str,
            "viewer_type": "player",
            "viewed_at": datetime.now(timezone.utc).isoformat(),
        }
        await run_in_threadpool(lambda: supa.table("coach_programme_views").insert(view_row).execute())
    except Exception:
        pass  # Don't fail the page load if tracking fails

    # Fire a throttled in-app notification for the coach (max 1 per hour)
    try:
        import asyncio
        from notifications_utils import _notify_coach_direct
        asyncio.ensure_future(_notify_coach_direct(
            coach_id=coach_id_str,
            notif_type="programme_view",
            title="Your programme page was viewed",
            message="A player just visited your programme profile on CourtBound.",
            link=f"/coach/program/{slug}",
            throttle_minutes=60,
        ))
    except Exception:
        pass

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
