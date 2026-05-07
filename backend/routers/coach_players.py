import os
import uuid
import logging
from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from typing import Optional
from supabase_db import supa
from routers.coach_auth import get_current_coach, require_verified_coach

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coach", tags=["coach-players"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")


# ── Match Score Calculation ─────────────────────────────────────────────────

def calculate_match_score(prefs: dict, player: dict) -> int:
    """Rule-based match score 0-100 based on coach recruiting preferences."""
    if not prefs:
        return 75  # default when no prefs set

    score = 0
    weight = 0

    # Position match (30 pts)
    if prefs.get("positions"):
        weight += 30
        player_pos = (player.get("position") or "").lower()
        player_pos2 = (player.get("secondary_position") or "").lower()
        for p in prefs["positions"]:
            pl = p.lower()
            if pl in player_pos or pl in player_pos2:
                score += 30 if pl in player_pos else 18
                break

    # Graduation year (20 pts)
    if prefs.get("grad_years"):
        weight += 20
        grad = str(player.get("expected_graduation") or "")
        for yr in prefs["grad_years"]:
            if str(yr) in grad:
                score += 20
                break

    # Target division preference (20 pts)
    if prefs.get("divisions"):
        weight += 20
        player_div = (player.get("target_division") or "").lower()
        for d in prefs["divisions"]:
            if d.lower() in player_div or player_div in d.lower():
                score += 20
                break

    # Stats — PPG minimum (15 pts)
    if prefs.get("min_ppg") is not None:
        weight += 15
        ppg = float(player.get("ppg") or 0)
        if ppg >= float(prefs["min_ppg"]):
            score += 15
        elif ppg >= float(prefs["min_ppg"]) * 0.8:
            score += 8  # partial

    # Height minimum (15 pts)
    if prefs.get("min_height_cm") is not None:
        weight += 15
        h = float(player.get("height_cm") or 0)
        if h >= float(prefs["min_height_cm"]):
            score += 15
        elif h >= float(prefs["min_height_cm"]) - 3:
            score += 8  # borderline

    if weight == 0:
        return 75
    return min(100, int((score / weight) * 100))


# ── AI Summary via Claude ───────────────────────────────────────────────────

async def generate_player_summary(player: dict) -> str:
    """One-line AI summary for a player card."""
    if not EMERGENT_LLM_KEY:
        return _fallback_summary(player)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"player-summary-{player.get('user_id', 'unknown')}",
            system_message=(
                "You are a concise basketball recruiting analyst. Generate a single sentence "
                "(max 15 words) that captures a UK basketball player's key recruiting attribute "
                "for a US college coach. Be specific, use data, sound professional."
            ),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        pos = player.get("position") or "player"
        ppg = player.get("ppg") or 0
        rpg = player.get("rpg") or 0
        apg = player.get("apg") or 0
        ht = player.get("height_ft") or ""
        club = player.get("club_team") or ""
        div = player.get("target_division") or ""
        grad = player.get("expected_graduation") or ""

        prompt = (
            f"Player: {pos}, {ht}, PPG {ppg}, RPG {rpg}, APG {apg}, "
            f"club: {club}, targets: {div}, grad: {grad}. "
            f"One sentence recruiting summary."
        )
        response = await chat.send_message(UserMessage(text=prompt))
        return response.strip().strip('"')
    except Exception as e:
        logger.warning(f"AI summary failed: {e}")
        return _fallback_summary(player)


def _fallback_summary(player: dict) -> str:
    pos = player.get("position") or "player"
    ppg = player.get("ppg")
    ht = player.get("height_ft") or ""
    if ppg:
        return f"{ht} {pos} averaging {ppg} PPG at the UK club level."
    return f"Versatile {pos} with strong fundamentals from the UK."


def _player_card(player: dict, coach_prefs: dict, saved_ids: set) -> dict:
    """Lightweight player card for search results."""
    uid = str(player.get("user_id") or "")
    return {
        "user_id": uid,
        "full_name": player.get("full_name") or "Unknown",
        "position": player.get("position"),
        "secondary_position": player.get("secondary_position"),
        "height_ft": player.get("height_ft"),
        "height_cm": player.get("height_cm"),
        "weight_kg": player.get("weight_kg"),
        "club_team": player.get("club_team") or player.get("current_team"),
        "expected_graduation": player.get("expected_graduation"),
        "target_start_year": player.get("target_start_year"),
        "ppg": player.get("ppg"),
        "rpg": player.get("rpg"),
        "apg": player.get("apg"),
        "highlight_tape_url": player.get("highlight_tape_url"),
        "ncaa_registered": player.get("ncaa_registered"),
        "bio": (player.get("bio") or "")[:120],
        "hometown": player.get("hometown"),
        "nationality": player.get("nationality"),
        "updated_at": player.get("updated_at"),
        "match_score": calculate_match_score(coach_prefs, player),
        "is_saved": uid in saved_ids,
    }


# ── Player Search ─────────────────────────────────────────────────────────────

@router.get("/players")
async def search_players(
    position: Optional[str] = Query(None),
    grad_year: Optional[str] = Query(None),
    min_height_cm: Optional[int] = Query(None),
    max_height_cm: Optional[int] = Query(None),
    min_ppg: Optional[float] = Query(None),
    min_gpa: Optional[float] = Query(None),
    min_sat: Optional[int] = Query(None),
    ncaa_registered: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query("match"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    coach=Depends(require_verified_coach),
):
    sport = coach.get("primary_sport", "").lower()
    gender = "men" if "men's" in sport or "men" in sport else "women"

    # Base query — match coach's sport
    query = (
        supa.table("profiles")
        .select("*")
        .eq("basketball_gender", gender)
        .not_.is_("full_name", "null")
    )

    if position:
        query = query.ilike("position", f"%{position}%")
    if grad_year:
        query = query.ilike("expected_graduation", f"%{grad_year}%")
    if min_height_cm:
        query = query.gte("height_cm", min_height_cm)
    if max_height_cm:
        query = query.lte("height_cm", max_height_cm)
    if min_ppg is not None:
        query = query.gte("ppg", min_ppg)
    if ncaa_registered is not None:
        query = query.eq("ncaa_registered", ncaa_registered)
    if search:
        query = query.or_(
            f"full_name.ilike.%{search}%,club_team.ilike.%{search}%,hometown.ilike.%{search}%"
        )

    result = await run_in_threadpool(lambda: query.limit(200).execute())
    players = result.data or []

    # Post-query filters for text-stored academic fields
    if min_gpa is not None:
        def _gpa_ok(p):
            try:
                return float(str(p.get("gpa_equivalent") or "").strip()) >= min_gpa
            except ValueError:
                return False
        players = [p for p in players if _gpa_ok(p)]

    if min_sat is not None:
        def _sat_ok(p):
            try:
                return int(str(p.get("sat_score") or "").strip()) >= min_sat
            except ValueError:
                return False
        players = [p for p in players if _sat_ok(p)]

    # Get saved player IDs for this coach
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .select("player_user_id")
        .eq("coach_id", coach["id"])
        .execute()
    )
    saved_ids = {str(r["player_user_id"]) for r in (saved_res.data or [])}

    prefs = coach.get("recruiting_prefs") or {}
    cards = [_player_card(p, prefs, saved_ids) for p in players]

    # Sort
    if sort == "match":
        cards.sort(key=lambda c: c["match_score"], reverse=True)
    elif sort == "newest":
        cards.sort(key=lambda c: c.get("updated_at") or "", reverse=True)
    elif sort == "height":
        cards.sort(key=lambda c: c.get("height_cm") or 0, reverse=True)
    elif sort == "grad_year":
        cards.sort(key=lambda c: c.get("expected_graduation") or "")

    total = len(cards)
    offset = (page - 1) * limit
    return {"players": cards[offset:offset + limit], "total": total, "page": page, "pages": -(-total // limit)}


# ── Full Player Profile ────────────────────────────────────────────────────────

@router.get("/players/{user_id}")
async def get_player_profile(user_id: str, coach=Depends(require_verified_coach)):
    result = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    )
    if not result.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Player not found")

    player = result.data[0]

    # Record the view
    view_row = {"coach_id": coach["id"], "player_user_id": user_id,
                "viewed_at": datetime.now(timezone.utc).isoformat()}
    await run_in_threadpool(lambda: supa.table("coach_player_views").insert(view_row).execute())

    # Is saved?
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .select("*")
        .eq("coach_id", coach["id"])
        .eq("player_user_id", user_id)
        .limit(1)
        .execute()
    )
    saved_info = saved_res.data[0] if saved_res.data else None

    prefs = coach.get("recruiting_prefs") or {}
    match_score = calculate_match_score(prefs, player)
    ai_summary = await generate_player_summary(player)

    return {
        **{k: v for k, v in player.items()},
        "match_score": match_score,
        "ai_summary": ai_summary,
        "is_saved": saved_info is not None,
        "saved_list": saved_info.get("list_name") if saved_info else None,
    }


# ── Save / Unsave Player ───────────────────────────────────────────────────────

@router.post("/players/{user_id}/save")
async def save_player(user_id: str, body: dict = {}, coach=Depends(require_verified_coach)):
    list_name = body.get("list_name", "Watch List")
    row = {
        "coach_id": coach["id"],
        "player_user_id": user_id,
        "list_name": list_name,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    await run_in_threadpool(
        lambda: supa.table("coach_saved_players").upsert(row, on_conflict="coach_id,player_user_id").execute()
    )
    return {"message": "Player saved", "list_name": list_name}


@router.delete("/players/{user_id}/save")
async def unsave_player(user_id: str, coach=Depends(require_verified_coach)):
    await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .delete()
        .eq("coach_id", coach["id"])
        .eq("player_user_id", user_id)
        .execute()
    )
    return {"message": "Player removed from board"}


@router.patch("/players/{user_id}/save")
async def update_saved_player(user_id: str, body: dict, coach=Depends(require_verified_coach)):
    updates = {k: v for k, v in body.items() if k in ("list_name", "notes", "color_label")}
    await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .update(updates)
        .eq("coach_id", coach["id"])
        .eq("player_user_id", user_id)
        .execute()
    )
    return {"message": "Updated"}


# ── Saved Players Board ────────────────────────────────────────────────────────

@router.get("/saved")
async def get_saved_players(coach=Depends(require_verified_coach)):
    saved_res = await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .select("*")
        .eq("coach_id", coach["id"])
        .order("saved_at", desc=True)
        .execute()
    )
    saved = saved_res.data or []
    if not saved:
        return []

    user_ids = [s["player_user_id"] for s in saved]
    profiles_res = await run_in_threadpool(
        lambda: supa.table("profiles").select(
            "user_id,full_name,position,height_ft,height_cm,club_team,"
            "expected_graduation,ppg,rpg,apg,highlight_tape_url,updated_at,basketball_gender"
        ).in_("user_id", user_ids).execute()
    )
    profile_map = {str(p["user_id"]): p for p in (profiles_res.data or [])}

    prefs = coach.get("recruiting_prefs") or {}
    result = []
    for s in saved:
        uid = str(s["player_user_id"])
        p = profile_map.get(uid, {})
        result.append({
            **s,
            "player": {**p, "match_score": calculate_match_score(prefs, p)},
        })
    return result
