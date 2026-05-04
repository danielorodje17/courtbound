import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa
from emergentintegrations.payments.stripe.checkout import StripeCheckout

router = APIRouter(prefix="/webhook", tags=["webhook"])
logger = logging.getLogger(__name__)

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")

PLANS = {
    "recruit_monthly":     {"amount": 9.99,   "currency": "gbp", "tier": "basic",   "days": 30},
    "recruit_annual":      {"amount": 79.00,  "currency": "gbp", "tier": "basic",   "days": 365},
    "scholarship_monthly": {"amount": 19.99,  "currency": "gbp", "tier": "premium", "days": 30},
    "scholarship_annual":  {"amount": 159.00, "currency": "gbp", "tier": "premium", "days": 365},
    "season_pass":         {"amount": 49.00,  "currency": "gbp", "tier": "premium", "days": 120},
}


@router.post("/stripe")
async def stripe_webhook(request: Request):
    try:
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/webhook/stripe"
        stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        webhook_response = await stripe.handle_webhook(body, sig)

        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            meta = webhook_response.metadata or {}

            # Guard against double-processing
            existing = await run_in_threadpool(
                lambda: supa.table("payment_transactions")
                .select("status,plan_key")
                .eq("session_id", session_id)
                .execute()
            )
            txn = (existing.data or [None])[0]
            if txn and txn.get("status") == "completed":
                return {"received": True}

            plan_key = meta.get("plan_key") or (txn or {}).get("plan_key", "")
            user_id = meta.get("user_id")
            plan = PLANS.get(plan_key, {})
            days = int(meta.get("days") or plan.get("days") or 30)
            tier = meta.get("tier") or plan.get("tier") or "basic"
            expires_at = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

            if user_id:
                await run_in_threadpool(
                    lambda: supa.table("users").update({
                        "subscription_tier": tier,
                        "subscription_expires_at": expires_at,
                    }).eq("id", user_id).execute()
                )

            await run_in_threadpool(
                lambda: supa.table("payment_transactions").update({
                    "payment_status": "paid",
                    "status": "completed",
                }).eq("session_id", session_id).execute()
            )

        return {"received": True}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"received": True}
