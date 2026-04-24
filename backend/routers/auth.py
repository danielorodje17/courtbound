import os
import uuid
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
