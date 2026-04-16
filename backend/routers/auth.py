import os
from fastapi import APIRouter, Response, Cookie, Header, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
from database import db
from auth_utils import UserModel, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_AUTH_URL = os.environ.get("EMERGENT_AUTH_URL", "https://demobackend.emergentagent.com")


@router.post("/session")
async def exchange_session(body: dict, response: Response):
    import httpx
    # Frontend sends session_id from OAuth hash fragment
    session_id = body.get("session_id") or body.get("session_token")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    # Call Emergent auth to exchange session_id → persistent session_token
    async with httpx.AsyncClient() as client_http:
        r = await client_http.get(
            f"{EMERGENT_AUTH_URL}/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session from auth provider")

    user_data = r.json()
    user_id = user_data.get("id") or user_data.get("user_id")
    email = user_data.get("email", "")
    name = user_data.get("name", "")
    picture = user_data.get("picture", "") or user_data.get("avatar", "")
    session_token = user_data.get("session_token", session_id)

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "email": email, "name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user_id, "expires_at": expires_at.isoformat()}},
        upsert=True,
    )
    # Return session_token so frontend can store it for Bearer auth
    return {"session_token": session_token, "user_id": user_id, "email": email, "name": name, "picture": picture}


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
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}
