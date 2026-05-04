from fastapi import Cookie, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from supabase_db import supa


class UserModel(BaseModel):
    user_id: str          # Supabase users.id (UUID)
    email: str
    name: str
    picture: Optional[str] = ""
    subscription_tier: str = "free"
    trial_end_date: Optional[str] = None
    subscription_expires_at: Optional[str] = None


def _compute_effective_tier(tier: str, trial_end_raw, expires_at_raw=None) -> str:
    """Return the tier to use, downgrading if trial or paid subscription has expired."""
    if tier == "trial" and trial_end_raw:
        try:
            ted = datetime.fromisoformat(str(trial_end_raw).replace("Z", "+00:00"))
            if getattr(ted, "tzinfo", None) is None:
                ted = ted.replace(tzinfo=timezone.utc)
            if ted < datetime.now(timezone.utc):
                return "free"
        except Exception:
            return "free"
    if tier in ("basic", "premium") and expires_at_raw:
        try:
            exp = datetime.fromisoformat(str(expires_at_raw).replace("Z", "+00:00"))
            if getattr(exp, "tzinfo", None) is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                return "free"
        except Exception:
            pass
    return tier


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

    try:
        user_result = await run_in_threadpool(
            lambda: supa.table("users")
            .select("id,email,name,picture,subscription_tier,trial_end_date,subscription_expires_at")
            .eq("id", session["user_id"])
            .execute()
        )
    except Exception:
        user_result = await run_in_threadpool(
            lambda: supa.table("users")
            .select("id,email,name,picture,subscription_tier,trial_end_date")
            .eq("id", session["user_id"])
            .execute()
        )
    if not user_result.data:
        raise HTTPException(status_code=401, detail="User not found")

    u = user_result.data[0]
    raw_tier = u.get("subscription_tier", "free") or "free"
    trial_end = u.get("trial_end_date")
    expires_at = u.get("subscription_expires_at")
    effective_tier = _compute_effective_tier(raw_tier, trial_end, expires_at)

    return UserModel(
        user_id=u["id"],
        email=u.get("email", ""),
        name=u.get("name", ""),
        picture=u.get("picture") or "",
        subscription_tier=effective_tier,
        trial_end_date=str(trial_end) if trial_end else None,
        subscription_expires_at=str(expires_at) if expires_at else None,
    )
