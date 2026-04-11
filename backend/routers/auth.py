import os
from fastapi import APIRouter, Response, Cookie, Header, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
from database import db
from auth_utils import UserModel, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_AUTH_URL = os.environ.get("EMERGENT_AUTH_URL", "https://auth.emergentagent.com")


@router.post("/session")
async def exchange_session(body: dict, response: Response):
    import httpx
    session_token = body.get("session_token")
    if not session_token:
        raise HTTPException(status_code=400, detail="session_token required")
    async with httpx.AsyncClient() as client_http:
        r = await client_http.get(
            f"{EMERGENT_AUTH_URL}/api/validate-session",
            headers={"Authorization": f"Bearer {session_token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session from auth provider")
    user_data = r.json()
    user_id = user_data.get("user_id") or user_data.get("id")
    email = user_data.get("email", "")
    name = user_data.get("name", "")
    picture = user_data.get("picture", "") or user_data.get("avatar", "")

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "email": email, "name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"session_token": session_token, "user_id": user_id, "expires_at": expires_at.isoformat()}},
        upsert=True,
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


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
