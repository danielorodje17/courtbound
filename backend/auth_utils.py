from fastapi import Cookie, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from supabase_db import supa


class UserModel(BaseModel):
    user_id: str   # Supabase users.id (UUID)
    email: str
    name: str
    picture: Optional[str] = ""


async def get_current_user(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> UserModel:
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await run_in_threadpool(
        lambda: supa.table("user_sessions")
        .select("user_id,expires_at")
        .eq("session_token", token)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid session")

    session = result.data[0]
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if getattr(expires_at, "tzinfo", None) is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_result = await run_in_threadpool(
        lambda: supa.table("users")
        .select("id,email,name,picture")
        .eq("id", session["user_id"])
        .execute()
    )
    if not user_result.data:
        raise HTTPException(status_code=401, detail="User not found")

    u = user_result.data[0]
    return UserModel(
        user_id=u["id"],
        email=u.get("email", ""),
        name=u.get("name", ""),
        picture=u.get("picture") or "",
    )
