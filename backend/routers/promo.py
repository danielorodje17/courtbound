import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from routers.admin import require_admin_token

router = APIRouter(prefix="/promo", tags=["promo"])


# ── USER: Redeem a code ────────────────────────────────────────────────────────

@router.post("/redeem")
async def redeem_code(body: dict, current_user: UserModel = Depends(get_current_user)):
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Please enter a code")

    # Fetch code
    res = await run_in_threadpool(
        lambda: supa.table("promo_codes").select("*").eq("code", code).execute()
    )
    if not res.data:
        raise HTTPException(status_code=400, detail="Invalid code. Please check and try again.")

    promo = res.data[0]

    if not promo["is_active"]:
        raise HTTPException(status_code=400, detail="This code is no longer active.")

    if promo.get("expires_at"):
        try:
            exp = datetime.fromisoformat(str(promo["expires_at"]).replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="This code has expired.")
        except HTTPException:
            raise
        except Exception:
            pass

    if promo.get("max_uses") and promo["use_count"] >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="This code has reached its maximum number of uses.")

    # Check already redeemed by this user
    used = await run_in_threadpool(
        lambda: supa.table("promo_code_redemptions")
        .select("id")
        .eq("code", code)
        .eq("user_id", current_user.user_id)
        .execute()
    )
    if used.data:
        raise HTTPException(status_code=400, detail="You have already used this code.")

    extension_days = promo["extension_days"]

    # Fetch current user dates
    user_row = await run_in_threadpool(
        lambda: supa.table("users")
        .select("subscription_tier,trial_end_date,subscription_expires_at")
        .eq("id", current_user.user_id)
        .execute()
    )
    u = user_row.data[0] if user_row.data else {}
    tier = u.get("subscription_tier", "free")
    update_data = {}
    now = datetime.now(timezone.utc)

    def parse_dt(val):
        try:
            dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    if tier == "trial":
        base = parse_dt(u.get("trial_end_date")) or now
        new_end = max(base, now) + timedelta(days=extension_days)
        update_data["trial_end_date"] = new_end.isoformat()
    elif tier == "free":
        new_end = now + timedelta(days=extension_days)
        update_data["subscription_tier"] = "trial"
        update_data["trial_end_date"] = new_end.isoformat()
        try:
            update_data["trial_start_date"] = now.isoformat()
        except Exception:
            pass
    elif tier in ("basic", "premium"):
        base = parse_dt(u.get("subscription_expires_at")) or now
        new_end = max(base, now) + timedelta(days=extension_days)
        update_data["subscription_expires_at"] = new_end.isoformat()
    else:
        new_end = now + timedelta(days=extension_days)
        update_data["subscription_tier"] = "trial"
        update_data["trial_end_date"] = new_end.isoformat()

    await run_in_threadpool(
        lambda: supa.table("users").update(update_data).eq("id", current_user.user_id).execute()
    )

    # Record redemption
    await run_in_threadpool(
        lambda: supa.table("promo_code_redemptions").insert({
            "code": code,
            "user_id": current_user.user_id,
        }).execute()
    )

    # Increment use count
    await run_in_threadpool(
        lambda: supa.table("promo_codes")
        .update({"use_count": promo["use_count"] + 1})
        .eq("code", code)
        .execute()
    )

    label = new_end.strftime("%-d %B %Y")
    return {
        "success": True,
        "extension_days": extension_days,
        "new_end_date": new_end.isoformat(),
        "message": f"Code applied! Your access has been extended by {extension_days} days (until {label}).",
    }


# ── ADMIN: List all codes ──────────────────────────────────────────────────────

@router.get("/admin/codes")
async def list_promo_codes(_=Depends(require_admin_token)):
    res = await run_in_threadpool(
        lambda: supa.table("promo_codes")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


# ── ADMIN: Create a code ───────────────────────────────────────────────────────

@router.post("/admin/codes")
async def create_promo_code(body: dict, _=Depends(require_admin_token)):
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    if len(code) < 3:
        raise HTTPException(status_code=400, detail="Code must be at least 3 characters")

    extension_days = int(body.get("extension_days") or 0)
    if extension_days not in (14, 30, 7, 60, 90):
        raise HTTPException(status_code=400, detail="Extension days must be 7, 14, 30, 60, or 90")

    max_uses = body.get("max_uses")
    if max_uses is not None:
        max_uses = int(max_uses) if max_uses else None

    expires_at = body.get("expires_at") or None

    try:
        res = await run_in_threadpool(
            lambda: supa.table("promo_codes").insert({
                "code": code,
                "extension_days": extension_days,
                "is_active": True,
                "max_uses": max_uses,
                "use_count": 0,
                "description": (body.get("description") or "").strip(),
                "expires_at": expires_at,
            }).execute()
        )
        return res.data[0] if res.data else {"code": code}
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Code '{code}' already exists")
        raise HTTPException(status_code=500, detail="Failed to create code")


# ── ADMIN: Toggle active / update ─────────────────────────────────────────────

@router.patch("/admin/codes/{code}")
async def update_promo_code(code: str, body: dict, _=Depends(require_admin_token)):
    updates = {}
    if "is_active" in body:
        updates["is_active"] = bool(body["is_active"])
    if "max_uses" in body:
        updates["max_uses"] = int(body["max_uses"]) if body["max_uses"] else None
    if "description" in body:
        updates["description"] = str(body["description"]).strip()
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await run_in_threadpool(
        lambda: supa.table("promo_codes").update(updates).eq("code", code.upper()).execute()
    )
    return {"success": True}


# ── ADMIN: Delete a code ───────────────────────────────────────────────────────

@router.delete("/admin/codes/{code}")
async def delete_promo_code(code: str, _=Depends(require_admin_token)):
    await run_in_threadpool(
        lambda: supa.table("promo_code_redemptions").delete().eq("code", code.upper()).execute()
    )
    await run_in_threadpool(
        lambda: supa.table("promo_codes").delete().eq("code", code.upper()).execute()
    )
    return {"success": True}


# ── ADMIN: Redemption history for a code ──────────────────────────────────────

@router.get("/admin/codes/{code}/redemptions")
async def get_redemptions(code: str, _=Depends(require_admin_token)):
    res = await run_in_threadpool(
        lambda: supa.table("promo_code_redemptions")
        .select("*, users(email,name)")
        .eq("code", code.upper())
        .order("redeemed_at", desc=True)
        .execute()
    )
    return res.data or []
