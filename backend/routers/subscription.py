import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from supabase_db import supa
from auth_utils import UserModel, get_current_user

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/plans")
async def get_plans():
    """Public endpoint — returns pricing plans for the pricing page."""
    try:
        result = await run_in_threadpool(
            lambda: supa.table("pricing_plans").select("*").execute()
        )
        plans = {p["tier"]: p for p in (result.data or [])}
        return plans
    except Exception:
        # pricing_plans table not created yet — run supabase_migration_v3.sql
        return {}


@router.get("/status")
async def get_status(current_user: UserModel = Depends(get_current_user)):
    """Returns the current user's subscription status including trial info."""
    tier = current_user.subscription_tier
    trial_end_date = current_user.trial_end_date

    trial_days_remaining = None
    is_trial_active = False

    if tier == "trial" and trial_end_date:
        try:
            ted = datetime.fromisoformat(str(trial_end_date).replace("Z", "+00:00"))
            if getattr(ted, "tzinfo", None) is None:
                ted = ted.replace(tzinfo=timezone.utc)
            diff = ted - datetime.now(timezone.utc)
            trial_days_remaining = max(0, diff.days)
            is_trial_active = diff.total_seconds() > 0
        except Exception:
            pass

    return {
        "subscription_tier": tier,
        "trial_end_date": trial_end_date,
        "trial_days_remaining": trial_days_remaining,
        "is_trial_active": is_trial_active,
        "effective_tier": "premium" if is_trial_active else tier,
    }

    return {
        "subscription_tier": tier,
        "trial_end_date": trial_end_date,
        "trial_days_remaining": trial_days_remaining,
        "is_trial_active": is_trial_active,
        "effective_tier": "premium" if is_trial_active else tier,
    }


@router.post("/checkout")
async def checkout(body: dict, current_user: UserModel = Depends(get_current_user)):
    """Placeholder checkout endpoint — Stripe integration coming soon."""
    tier = body.get("tier")
    if tier not in ("basic", "premium"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    return {
        "status": "coming_soon",
        "message": "Stripe payment is launching soon. We'll notify you by email when it's ready.",
        "tier": tier,
    }
