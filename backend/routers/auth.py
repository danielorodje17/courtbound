import os
import uuid
from fastapi import APIRouter, Response, Cookie, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone, timedelta
from typing import Optional
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from fastapi import Depends

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
        raise HTTPException(status_code=401, detail="Invalid session from auth provider")

    user_data = r.json()
    google_id = user_data.get("id") or user_data.get("user_id")
    email = user_data.get("email", "")
    name = user_data.get("name", "")
    picture = user_data.get("picture", "") or user_data.get("avatar", "")
    session_token = user_data.get("session_token", session_id)

    now_iso = datetime.now(timezone.utc).isoformat()

    # Upsert user by email; get back the Supabase UUID
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
        ).select("id").execute()
    )

    if upsert_result.data:
        user_id = upsert_result.data[0]["id"]
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
