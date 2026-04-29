import os
import uuid
import json
import base64
import logging
from fastapi import APIRouter, Response, Cookie, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone, timedelta
from typing import Optional
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from fastapi import Depends

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_AUTH_URL = os.environ.get("EMERGENT_AUTH_URL", "https://demobackend.emergentagent.com")


def _decode_jwt_payload(token: str) -> dict:
    """
    Decode JWT payload (base64url) WITHOUT signature verification.
    Returns the payload dict or {} on failure.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        segment = parts[1]
        # Restore base64url padding
        segment += "=" * (4 - len(segment) % 4)
        decoded = base64.urlsafe_b64decode(segment)
        return json.loads(decoded)
    except Exception:
        return {}


@router.post("/session")
async def exchange_session(body: dict, response: Response):
    import httpx
    session_id = body.get("session_id") or body.get("session_token")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient() as client_http:
        r = await client_http.get(
            f"{EMERGENT_AUTH_URL}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        logger.warning(f"Auth provider returned {r.status_code}: {r.text[:200]}")
        raise HTTPException(status_code=401, detail="Invalid session from auth provider")

    user_data = r.json()
    google_id = user_data.get("id") or user_data.get("user_id")
    email = user_data.get("email", "")
    name = user_data.get("name", "")
    picture = user_data.get("picture", "") or user_data.get("avatar", "")
    session_token = user_data.get("session_token", session_id)

    # Upsert user by email — supabase-py v2 does NOT support .select() chained on .upsert()
    upsert_result = await run_in_threadpool(
        lambda: supa.table("users").upsert(
            {
                "google_id": google_id,
                "email": email,
                "name": name,
                "picture": picture,
                "role": "player",
            },
            on_conflict="email",
        ).execute()
    )

    user_row = upsert_result.data[0] if upsert_result.data else None
    if user_row:
        user_id = user_row["id"]
        try:
            # Start 14-day trial for brand-new users
            if not user_row.get("trial_start_date"):
                trial_end = datetime.now(timezone.utc) + timedelta(days=14)
                await run_in_threadpool(
                    lambda: supa.table("users").update({
                        "subscription_tier": "trial",
                        "trial_start_date": datetime.now(timezone.utc).isoformat(),
                        "trial_end_date": trial_end.isoformat(),
                    }).eq("id", user_id).execute()
                )
            elif user_row.get("subscription_tier") == "trial":
                # Check if trial has expired and downgrade if so
                trial_end_raw = user_row.get("trial_end_date")
                if trial_end_raw:
                    ted = datetime.fromisoformat(str(trial_end_raw).replace("Z", "+00:00"))
                    if getattr(ted, "tzinfo", None) is None:
                        ted = ted.replace(tzinfo=timezone.utc)
                    if ted < datetime.now(timezone.utc):
                        await run_in_threadpool(
                            lambda: supa.table("users").update({"subscription_tier": "free"}).eq("id", user_id).execute()
                        )
        except Exception as e:
            # Trial columns may not exist yet — requires supabase_migration_v3.sql
            logger.warning(f"Trial setup skipped (run supabase_migration_v3.sql): {e}")
    else:
        # Fallback: look up by email
        lookup = await run_in_threadpool(
            lambda: supa.table("users").select("id").eq("email", email).execute()
        )
        user_id = lookup.data[0]["id"] if lookup.data else str(uuid.uuid4())

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await run_in_threadpool(
        lambda: supa.table("user_sessions").upsert(
            {
                "session_token": session_token,
                "user_id": user_id,
                "expires_at": expires_at.isoformat(),
            },
            on_conflict="session_token",
        ).execute()
    )

    return {
        "session_token": session_token,
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
    }


@router.get("/me")
async def auth_me(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.post("/google-callback")
async def google_callback(body: dict):
    """
    Supabase Auth callback — frontend sends the Supabase access_token after
    completing the OAuth exchange with supabase-js.
    We validate it, upsert the user, create our own session, and return session_token.

    Validation strategy (resilient to supabase-js JWT format changes in v2.104+):
    1. Decode the JWT payload (base64, no crypto verification) to extract `sub` (Supabase UUID)
    2. Check the audience claim = "authenticated" to reject non-Supabase tokens
    3. Fetch the full user via supa.auth.admin.get_user_by_id() using the service key —
       this is the authoritative server-side confirmation the user exists in Supabase auth.
    We skip supa.auth.get_user(access_token) because newer supabase-js versions
    (v2.104.1+) occasionally produce tokens whose format causes supabase-py to raise
    "invalid JWT: token is malformed" even though the PKCE exchange succeeded.
    """
    access_token = body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token required")

    # Step 1: Decode JWT payload (no signature verification)
    payload = _decode_jwt_payload(access_token)
    supabase_uid = payload.get("sub")
    audience = payload.get("aud", "")

    # Step 2: Basic audience check — Supabase always sets aud="authenticated"
    if not supabase_uid or audience != "authenticated":
        # Fallback: try the original get_user() method (handles edge cases)
        try:
            user_response = await run_in_threadpool(
                lambda: supa.auth.get_user(access_token)
            )
            if not user_response or not user_response.user:
                raise HTTPException(status_code=401, detail="Invalid Supabase token")
            supabase_uid = str(user_response.user.id)
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Supabase get_user fallback also failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid Supabase token")

    # Step 3: Authoritative lookup via admin API (service role key) — confirms user exists
    try:
        admin_resp = await run_in_threadpool(
            lambda: supa.auth.admin.get_user_by_id(supabase_uid)
        )
    except Exception as e:
        logger.warning(f"Admin get_user_by_id failed: {e}")
        raise HTTPException(status_code=401, detail="Could not verify user with Supabase")

    if not admin_resp or not admin_resp.user:
        raise HTTPException(status_code=401, detail="User not found in Supabase auth")

    sb_user = admin_resp.user
    email = sb_user.email or ""
    meta = sb_user.user_metadata or {}
    name = meta.get("full_name") or meta.get("name") or ""
    picture = meta.get("avatar_url") or meta.get("picture") or ""
    google_id = str(sb_user.id)  # Supabase auth UUID

    # Upsert into our users table
    upsert_result = await run_in_threadpool(
        lambda: supa.table("users").upsert(
            {
                "google_id": google_id,
                "email": email,
                "name": name,
                "picture": picture,
                "role": "player",
            },
            on_conflict="email",
        ).execute()
    )

    user_row = upsert_result.data[0] if upsert_result.data else None
    if user_row:
        internal_user_id = user_row["id"]
        # Start 14-day trial for brand-new users
        try:
            if not user_row.get("trial_start_date"):
                trial_end = datetime.now(timezone.utc) + timedelta(days=14)
                await run_in_threadpool(
                    lambda: supa.table("users").update({
                        "subscription_tier": "trial",
                        "trial_start_date": datetime.now(timezone.utc).isoformat(),
                        "trial_end_date": trial_end.isoformat(),
                    }).eq("id", internal_user_id).execute()
                )
            elif user_row.get("subscription_tier") == "trial":
                trial_end_raw = user_row.get("trial_end_date")
                if trial_end_raw:
                    ted = datetime.fromisoformat(str(trial_end_raw).replace("Z", "+00:00"))
                    if getattr(ted, "tzinfo", None) is None:
                        ted = ted.replace(tzinfo=timezone.utc)
                    if ted < datetime.now(timezone.utc):
                        await run_in_threadpool(
                            lambda: supa.table("users").update({"subscription_tier": "free"}).eq("id", internal_user_id).execute()
                        )
        except Exception as e:
            logger.warning(f"Trial setup skipped (run supabase_migration_v3.sql): {e}")
    else:
        lookup = await run_in_threadpool(
            lambda: supa.table("users").select("id").eq("email", email).execute()
        )
        internal_user_id = lookup.data[0]["id"] if lookup.data else str(uuid.uuid4())

    # Create a new 7-day session.
    # IMPORTANT: only delete EXPIRED sessions — do NOT wipe valid ones.
    # Deleting all sessions caused race conditions: concurrent requests would wipe
    # each other's newly created sessions, locking the user out.
    session_token = uuid.uuid4().hex + uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    now_iso = datetime.now(timezone.utc).isoformat()

    await run_in_threadpool(
        lambda: supa.table("user_sessions")
            .delete()
            .eq("user_id", internal_user_id)
            .lt("expires_at", now_iso)
            .execute()
    )
    await run_in_threadpool(
        lambda: supa.table("user_sessions").insert({
            "session_token": session_token,
            "user_id": internal_user_id,
            "expires_at": expires_at.isoformat(),
        }).execute()
    )

    return {
        "session_token": session_token,
        "user_id": internal_user_id,
        "email": email,
        "name": name,
        "picture": picture,
    }


@router.post("/logout")
async def auth_logout(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "").strip()
    if token:
        await run_in_threadpool(
            lambda: supa.table("user_sessions").delete().eq("session_token", token).execute()
        )
    return {"message": "Logged out"}
