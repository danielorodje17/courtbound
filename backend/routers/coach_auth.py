import os
import uuid
import asyncio
import bcrypt
import logging
import json
from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
from supabase_db import supa

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coach", tags=["coach"])


# ── Auth Helpers ────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _check_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _clean_coach(coach: dict) -> dict:
    """Remove sensitive fields before returning to client."""
    return {k: v for k, v in coach.items() if k not in ("password_hash", "session_token")}


async def get_current_coach(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Coach not authenticated")
    token = authorization.split(" ")[1]
    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .select("*")
        .eq("session_token", token)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid or expired coach token")
    coach = result.data[0]
    # Update last_active
    await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .update({"last_active": _now()})
        .eq("id", coach["id"])
        .execute()
    )
    return coach


async def require_verified_coach(coach=Depends(get_current_coach)):
    if coach["verification_status"] != "verified":
        raise HTTPException(status_code=403, detail="Account pending verification")
    return coach


# ── Domain Verification Helper ──────────────────────────────────────────────

async def _check_domain(email: str) -> tuple[bool, Optional[str]]:
    """Returns (auto_verified, institution_name_or_None)"""
    domain = email.split("@")[-1].lower()
    result = await run_in_threadpool(
        lambda: supa.table("ncaa_institutions")
        .select("name, division")
        .contains("email_domains", [domain])
        .limit(1)
        .execute()
    )
    if result.data:
        return True, result.data[0]["name"]
    # Flag personal email providers
    personal = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
                "icloud.com", "aol.com", "protonmail.com", "live.com"}
    if domain in personal:
        return False, None
    # Unknown domain — treat as manual review
    return False, None


# ── Registration ─────────────────────────────────────────────────────────────

@router.post("/auth/register")
async def coach_register(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    full_name = body.get("full_name", "").strip()
    job_title = body.get("job_title", "").strip()
    institution_name = body.get("institution_name", "").strip()
    division = body.get("division", "").strip()
    conference = body.get("conference", "").strip()
    institution_website = body.get("institution_website", "").strip()
    primary_sport = body.get("primary_sport", "").strip()
    country = body.get("country", "US").strip()

    if not all([email, full_name, job_title, institution_name, division, primary_sport]):
        raise HTTPException(status_code=400, detail="All required fields must be filled")

    google_id = body.get("google_id", "").strip()
    # Password required only when not using Google OAuth
    if not google_id:
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Check duplicate
    existing = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("id").eq("email", email).limit(1).execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Auto-verify if domain matches known institution
    auto_verified, matched_institution = await _check_domain(email)
    verification_status = "verified" if auto_verified else "pending"
    verified_at = _now() if auto_verified else None

    session_token = str(uuid.uuid4())
    row = {
        "email": email,
        "password_hash": _hash_pw(password) if password else None,
        "session_token": session_token,
        "full_name": full_name,
        "job_title": job_title,
        "institution_name": matched_institution or institution_name,
        "division": division,
        "conference": conference,
        "institution_website": institution_website,
        "primary_sport": primary_sport,
        "country": country,
        "verification_status": verification_status,
        "verified_at": verified_at,
        "onboarding_steps": {},
        "recruiting_prefs": {},
        "last_active": _now(),
    }

    result = await run_in_threadpool(lambda: supa.table("coach_accounts").insert(row).execute())
    if not result.data:
        raise HTTPException(status_code=500, detail="Registration failed")

    coach = result.data[0]
    return {
        "token": session_token,
        "coach": _clean_coach(coach),
        "auto_verified": auto_verified,
        "message": "Account verified automatically" if auto_verified else
                   "Account created — pending manual verification (usually within 48 hours)",
    }


# ── Login ────────────────────────────────────────────────────────────────────

@router.post("/auth/login")
async def coach_login(body: dict):
    email = body.get("email", "").lower().strip()
    password = body.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("*").eq("email", email).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    coach = result.data[0]
    if not coach.get("password_hash") or not _check_pw(password, coach["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session_token = str(uuid.uuid4())
    await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .update({"session_token": session_token, "last_active": _now()})
        .eq("id", coach["id"])
        .execute()
    )
    coach["session_token"] = session_token
    return {"token": session_token, "coach": _clean_coach(coach)}


# ── Me ───────────────────────────────────────────────────────────────────────

@router.get("/auth/me")
async def coach_me(coach=Depends(get_current_coach)):
    return _clean_coach(coach)


# ── Update Profile / Preferences ─────────────────────────────────────────────

@router.patch("/auth/profile")
async def coach_update_profile(body: dict, coach=Depends(get_current_coach)):
    allowed = {
        "full_name", "job_title", "institution_name", "division", "conference",
        "institution_website", "primary_sport", "country", "profile_photo",
        "about_programme", "recruiting_prefs", "onboarding_steps", "onboarding_completed",
        # Programme detail fields
        "scholarship_type", "scholarship_avg_value", "nil_available", "nil_description",
        "housing_type", "f1_visa_support", "international_players_count",
        # Privacy
        "privacy_settings",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts").update(updates).eq("id", coach["id"]).execute()
    )
    return _clean_coach(result.data[0]) if result.data else {"message": "Updated"}


# ── Privacy Settings ──────────────────────────────────────────────────────────

@router.get("/auth/privacy")
async def get_privacy_settings(coach=Depends(get_current_coach)):
    settings = coach.get("privacy_settings") or {}
    return {
        "hide_recruiting_prefs": settings.get("hide_recruiting_prefs", False),
        "hide_contact_info": settings.get("hide_contact_info", False),
        "profile_visible": settings.get("profile_visible", True),
    }


@router.patch("/auth/privacy")
async def update_privacy_settings(body: dict, coach=Depends(get_current_coach)):
    allowed_keys = {"hide_recruiting_prefs", "hide_contact_info", "profile_visible"}
    current = coach.get("privacy_settings") or {}
    updates = {k: bool(v) for k, v in body.items() if k in allowed_keys}
    merged = {**current, **updates}
    try:
        result = await run_in_threadpool(
            lambda: supa.table("coach_accounts")
            .update({"privacy_settings": merged})
            .eq("id", coach["id"])
            .execute()
        )
        return _clean_coach(result.data[0]) if result.data else {"message": "Updated"}
    except Exception as e:
        err_str = str(e)
        if "privacy_settings" in err_str or "PGRST204" in err_str:
            raise HTTPException(
                status_code=503,
                detail="Privacy settings not available yet — please run database migration v18."
            )
        raise


# ── Notification Preferences ──────────────────────────────────────────────────

NOTIFICATION_PREF_KEYS = {
    "highlight_reel",
    "commitment",
    "programme_view",
    "contact_countdown",
}

NOTIFICATION_PREF_DEFAULTS = {
    "highlight_reel": True,
    "commitment": True,
    "programme_view": False,
    "contact_countdown": True,
}


@router.get("/auth/notification-prefs")
async def get_notification_prefs(coach=Depends(get_current_coach)):
    stored = coach.get("notification_prefs") or {}
    return {k: bool(stored.get(k, v)) for k, v in NOTIFICATION_PREF_DEFAULTS.items()}


@router.patch("/auth/notification-prefs")
async def update_notification_prefs(body: dict, coach=Depends(get_current_coach)):
    current = coach.get("notification_prefs") or {}
    updates = {k: bool(v) for k, v in body.items() if k in NOTIFICATION_PREF_KEYS}
    merged = {**current, **updates}
    try:
        result = await run_in_threadpool(
            lambda: supa.table("coach_accounts")
            .update({"notification_prefs": merged})
            .eq("id", coach["id"])
            .execute()
        )
        updated_coach = result.data[0] if result.data else {}
        stored = updated_coach.get("notification_prefs") or merged
        return {k: bool(stored.get(k, v)) for k, v in NOTIFICATION_PREF_DEFAULTS.items()}
    except Exception as e:
        err_str = str(e)
        if "notification_prefs" in err_str or "PGRST204" in err_str:
            raise HTTPException(
                status_code=503,
                detail="Notification preferences not available yet — please run database migration v24.",
            )
        raise


# ── GDPR Data Export ───────────────────────────────────────────────────────────

@router.get("/auth/data-export")
async def data_export(coach=Depends(get_current_coach)):
    """Download all personal data for this coach account as a JSON file (GDPR Art. 20)."""
    coach_id = str(coach["id"])

    # Gather all data in parallel
    messages_res, saved_res, notifs_res, templates_res = await asyncio.gather(
        run_in_threadpool(
            lambda: supa.table("coach_messages")
            .select("id,player_user_id,subject,body,sent_at,status,scheduled_at,is_read,player_reply,player_replied_at,ncaa_period_type")
            .eq("coach_id", coach_id)
            .order("sent_at", desc=True)
            .execute()
        ),
        run_in_threadpool(
            lambda: supa.table("coach_saved_players")
            .select("player_user_id,list_name,notes,sort_order,saved_at")
            .eq("coach_id", coach_id)
            .execute()
        ),
        run_in_threadpool(
            lambda: supa.table("coach_notifications")
            .select("id,type,title,message,link,is_read,created_at")
            .eq("coach_id", coach_id)
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        ),
        run_in_threadpool(
            lambda: supa.table("coach_message_templates")
            .select("id,name,subject,body,is_default,created_at")
            .eq("coach_id", coach_id)
            .execute()
        ),
    )

    # Enrich saved players with names
    saved = saved_res.data or []
    player_ids = [s["player_user_id"] for s in saved]
    player_names: dict = {}
    if player_ids:
        p_res = await run_in_threadpool(
            lambda: supa.table("profiles")
            .select("user_id,full_name")
            .in_("user_id", player_ids)
            .execute()
        )
        player_names = {str(p["user_id"]): p.get("full_name") for p in (p_res.data or [])}

    account_data = _clean_coach(coach)

    export = {
        "export_generated_at": datetime.now(timezone.utc).isoformat(),
        "account": account_data,
        "messages_sent": messages_res.data or [],
        "saved_players": [
            {**s, "player_name": player_names.get(str(s["player_user_id"]))}
            for s in saved
        ],
        "notifications": notifs_res.data or [],
        "message_templates": templates_res.data or [],
    }

    json_bytes = json.dumps(export, indent=2, default=str).encode("utf-8")
    filename = f"courtbound-data-export-{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
    return StreamingResponse(
        iter([json_bytes]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Custom Lists ──────────────────────────────────────────────────────────────

DEFAULT_LISTS = {"Watch List", "Priority Targets", "Contacted", "Offer Extended", "Committed"}
MAX_CUSTOM_LISTS = 10
MAX_LIST_NAME_LEN = 40


def _get_custom_lists(coach: dict) -> list:
    val = coach.get("custom_lists")
    if isinstance(val, list):
        return val
    return []


async def _save_custom_lists(coach_id: str, lists: list):
    try:
        await run_in_threadpool(
            lambda: supa.table("coach_accounts")
            .update({"custom_lists": lists})
            .eq("id", coach_id)
            .execute()
        )
    except Exception as e:
        if "custom_lists" in str(e):
            from fastapi import HTTPException as _H
            raise _H(status_code=503, detail="Custom lists not available yet — please run database migration v20.")
        raise


@router.get("/custom-lists")
async def get_custom_lists(coach=Depends(get_current_coach)):
    return {"custom_lists": _get_custom_lists(coach)}


@router.post("/custom-lists")
async def add_custom_list(body: dict, coach=Depends(get_current_coach)):
    name = (body.get("name") or "").strip()
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="List name must be at least 2 characters")
    if len(name) > MAX_LIST_NAME_LEN:
        raise HTTPException(status_code=400, detail=f"List name too long (max {MAX_LIST_NAME_LEN} characters)")
    if name in DEFAULT_LISTS:
        raise HTTPException(status_code=409, detail=f"'{name}' is a default list name")
    current = _get_custom_lists(coach)
    if name in current:
        raise HTTPException(status_code=409, detail=f"List '{name}' already exists")
    if len(current) >= MAX_CUSTOM_LISTS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_CUSTOM_LISTS} custom lists allowed")
    updated = current + [name]
    await _save_custom_lists(coach["id"], updated)
    return {"custom_lists": updated}


@router.patch("/custom-lists/{old_name}")
async def rename_custom_list(old_name: str, body: dict, coach=Depends(get_current_coach)):
    new_name = (body.get("name") or "").strip()
    if not new_name or len(new_name) < 2:
        raise HTTPException(status_code=400, detail="New name must be at least 2 characters")
    if len(new_name) > MAX_LIST_NAME_LEN:
        raise HTTPException(status_code=400, detail="Name too long")
    if new_name in DEFAULT_LISTS:
        raise HTTPException(status_code=409, detail=f"'{new_name}' is a default list name")
    current = _get_custom_lists(coach)
    if old_name not in current:
        raise HTTPException(status_code=404, detail=f"List '{old_name}' not found")
    if new_name in current:
        raise HTTPException(status_code=409, detail=f"List '{new_name}' already exists")
    updated = [new_name if lst == old_name else lst for lst in current]
    await _save_custom_lists(coach["id"], updated)
    # Rename all saved players on this list
    await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .update({"list_name": new_name})
        .eq("coach_id", coach["id"])
        .eq("list_name", old_name)
        .execute()
    )
    return {"custom_lists": updated}


@router.delete("/custom-lists/{list_name}")
async def delete_custom_list(list_name: str, coach=Depends(get_current_coach)):
    current = _get_custom_lists(coach)
    if list_name not in current:
        raise HTTPException(status_code=404, detail=f"List '{list_name}' not found")
    updated = [lst for lst in current if lst != list_name]
    await _save_custom_lists(coach["id"], updated)
    # Move all players on this list to Watch List
    await run_in_threadpool(
        lambda: supa.table("coach_saved_players")
        .update({"list_name": "Watch List"})
        .eq("coach_id", coach["id"])
        .eq("list_name", list_name)
        .execute()
    )
    return {"custom_lists": updated}


# ── Logout ───────────────────────────────────────────────────────────────────
async def coach_logout(coach=Depends(get_current_coach)):
    await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .update({"session_token": None})
        .eq("id", coach["id"])
        .execute()
    )
    return {"message": "Logged out"}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.post("/auth/google")
async def coach_google_auth(body: dict):
    """Called after Google OAuth redirect. Links Google identity to coach account."""
    google_email = body.get("google_email", "").lower().strip()
    google_name = body.get("google_name", "").strip()

    if not google_email:
        raise HTTPException(status_code=400, detail="Email required")

    result = await run_in_threadpool(
        lambda: supa.table("coach_accounts").select("*").eq("email", google_email).limit(1).execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=json.dumps({
                "needs_registration": True,
                "prefill": {"email": google_email, "full_name": google_name}
            })
        )

    coach = result.data[0]
    session_token = str(uuid.uuid4())
    await run_in_threadpool(
        lambda: supa.table("coach_accounts")
        .update({"session_token": session_token, "last_active": _now()})
        .eq("id", coach["id"])
        .execute()
    )
    coach["session_token"] = session_token
    return {"token": session_token, "coach": _clean_coach(coach)}
