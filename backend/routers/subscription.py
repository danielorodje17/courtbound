import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

router = APIRouter(prefix="/subscription", tags=["subscription"])

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

# Fixed plan skeleton — amounts are overridden from DB pricing_plans at checkout time
PLANS = {
    "recruit_monthly":     {"db_tier": "basic",    "db_field": "price_monthly", "currency": "gbp", "tier": "basic",   "days": 30,  "label": "Recruit Monthly"},
    "recruit_annual":      {"db_tier": "basic",    "db_field": "price_annual",  "currency": "gbp", "tier": "basic",   "days": 365, "label": "Recruit Annual"},
    "scholarship_monthly": {"db_tier": "premium",  "db_field": "price_monthly", "currency": "gbp", "tier": "premium", "days": 30,  "label": "Scholarship Monthly"},
    "scholarship_annual":  {"db_tier": "premium",  "db_field": "price_annual",  "currency": "gbp", "tier": "premium", "days": 365, "label": "Scholarship Annual"},
    "season_pass":         {"db_tier": "season_pass","db_field": "price_monthly","currency": "gbp", "tier": "premium", "days": 120, "label": "Season Pass (4 months)"},
}

# Fallback amounts used if DB lookup fails
PLAN_FALLBACK_AMOUNTS = {
    "recruit_monthly": 9.99,
    "recruit_annual": 79.00,
    "scholarship_monthly": 19.99,
    "scholarship_annual": 159.00,
    "season_pass": 49.00,
}


async def _get_plan_amount(plan_key: str) -> float:
    """Fetch the live price for a plan_key from the pricing_plans table."""
    plan_meta = PLANS.get(plan_key, {})
    db_tier = plan_meta.get("db_tier")
    db_field = plan_meta.get("db_field", "price_monthly")
    try:
        result = await run_in_threadpool(
            lambda: supa.table("pricing_plans").select(db_field).eq("tier", db_tier).single().execute()
        )
        amount = result.data.get(db_field)
        if amount is not None:
            return float(amount)
    except Exception:
        pass
    return PLAN_FALLBACK_AMOUNTS.get(plan_key, 9.99)


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
        return {}


@router.get("/status")
async def get_status(current_user: UserModel = Depends(get_current_user)):
    """Returns the current user's subscription status including trial info."""
    tier = current_user.subscription_tier
    trial_end_date = current_user.trial_end_date
    subscription_expires_at = current_user.subscription_expires_at

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
        "subscription_expires_at": subscription_expires_at,
    }


@router.post("/checkout")
async def create_checkout(
    body: dict,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    plan_key = body.get("plan_key")
    origin = body.get("origin", "").rstrip("/")
    promo_code = (body.get("promo_code") or "").strip().upper() or None

    if plan_key not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan = PLANS[plan_key]
    live_amount = await _get_plan_amount(plan_key)

    # Apply percentage discount if a valid discount promo code is supplied
    discount_percent = 0.0
    if promo_code:
        try:
            promo_res = await run_in_threadpool(
                lambda: supa.table("promo_codes").select("*").eq("code", promo_code).execute()
            )
            if promo_res.data:
                promo = promo_res.data[0]
                dp = promo.get("discount_percent")
                plan_type = promo.get("applicable_plan_type", "all")
                is_valid = (
                    promo.get("is_active")
                    and dp is not None
                    and (
                        plan_type == "all"
                        or (plan_type == "annual" and plan_key.endswith("_annual"))
                        or (plan_type == "monthly" and plan_key.endswith("_monthly"))
                    )
                )
                if is_valid:
                    discount_percent = float(dp)
                    live_amount = round(live_amount * (1 - discount_percent / 100), 2)
        except Exception:
            pass  # Don't block checkout if promo validation fails

    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"

    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin}/pricing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"

    metadata = {
        "user_id": str(current_user.user_id),
        "user_email": current_user.email,
        "plan_key": plan_key,
        "tier": plan["tier"],
        "days": str(plan["days"]),
        "promo_code": promo_code or "",
        "discount_percent": str(discount_percent),
    }

    checkout_req = CheckoutSessionRequest(
        amount=live_amount,
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(checkout_req)

    try:
        await run_in_threadpool(
            lambda: supa.table("payment_transactions").insert({
                "session_id": session.session_id,
                "user_id": str(current_user.user_id),
                "amount": float(live_amount),
                "currency": plan["currency"],
                "plan_key": plan_key,
                "tier": plan["tier"],
                "days": plan["days"],
                "payment_status": "pending",
                "status": "initiated",
                "metadata": metadata,
            }).execute()
        )
    except Exception:
        pass

    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
):
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    status = await stripe.get_checkout_status(session_id)

    # Guard against double-processing
    txn = None
    try:
        existing = await run_in_threadpool(
            lambda: supa.table("payment_transactions")
            .select("status,tier,days,plan_key")
            .eq("session_id", session_id)
            .execute()
        )
        txn = (existing.data or [None])[0]
    except Exception:
        pass

    if txn and txn.get("status") == "completed":
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "already_processed": True,
        }

    if status.payment_status == "paid":
        meta = status.metadata or {}
        plan_key = meta.get("plan_key") or (txn or {}).get("plan_key", "")
        user_id = meta.get("user_id") or str(current_user.user_id)
        plan = PLANS.get(plan_key, {})
        days = int(meta.get("days") or plan.get("days") or 30)
        tier = meta.get("tier") or plan.get("tier") or "basic"
        expires_at = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

        await run_in_threadpool(
            lambda: supa.table("users").update({
                "subscription_tier": tier,
                "subscription_expires_at": expires_at,
            }).eq("id", user_id).execute()
        )

        # Record discount promo code redemption
        promo_code = meta.get("promo_code", "").strip().upper()
        if promo_code:
            from routers.promo import record_discount_redemption
            await record_discount_redemption(promo_code, user_id)

        try:
            await run_in_threadpool(
                lambda: supa.table("payment_transactions").update({
                    "payment_status": "paid",
                    "status": "completed",
                }).eq("session_id", session_id).execute()
            )
        except Exception:
            pass

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "already_processed": False,
    }
