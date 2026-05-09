"""
Background scheduler for trial management and email reminders.
Runs every hour to:
  1. Downgrade expired trials to 'free'
  2. Send Resend email reminders at day 7 and day 11 of trial

Email sending requires RESEND_API_KEY in .env.
Until the key is provided, actions are logged only.
"""

import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)
_scheduler = AsyncIOScheduler()


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

def _build_day7_html(name: str, frontend_url: str) -> str:
    pricing_url = f"{frontend_url}/pricing"
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background:#f97316;padding:28px 40px;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">
              CourtBound
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#fed7aa;">Your Scholarship Tracker</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">
              Hi {name}, you're halfway through your trial!
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
              You've been using CourtBound for <strong>7 days</strong> — 7 more days left on your free trial with full Premium access.
            </p>
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;">Here's what you get with Premium:</p>
            <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
              <li>AI email composer & recruitment strategy</li>
              <li>NCAA eligibility checker</li>
              <li>AI college match scoring</li>
              <li>Unlimited college tracking & email logging</li>
              <li>Bulk email import & CSV export</li>
            </ul>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
              After your trial, you'll move to the Free plan unless you upgrade. Don't lose your progress!
            </p>
            <a href="{pricing_url}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">
              View Pricing Plans
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              You're receiving this because you signed up for a CourtBound trial.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_day11_html(name: str, days_remaining: int, frontend_url: str) -> str:
    pricing_url = f"{frontend_url}/pricing"
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background:#dc2626;padding:28px 40px;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">
              CourtBound
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#fecaca;">Your trial ends in {days_remaining} days</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">
              Hi {name}, only {days_remaining} days left!
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
              Your 14-day free trial ends in <strong>{days_remaining} days</strong>. After that, your account will revert to the Free plan with limited features.
            </p>
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;">Don't lose access to:</p>
            <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
              <li>All AI-powered tools</li>
              <li>Your full college tracking history</li>
              <li>Email logging & response tracking</li>
              <li>Unlimited college access</li>
            </ul>
            <a href="{pricing_url}" style="display:inline-block;background:#dc2626;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">
              Upgrade Now — Keep Full Access
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              You're receiving this because you signed up for a CourtBound trial.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Core job
# ---------------------------------------------------------------------------

async def _process_trial_reminders():
    """Hourly job: downgrade expired trials and send reminder emails."""
    from supabase_db import supa

    now = datetime.now(timezone.utc)
    logger.info("Scheduler: running trial reminder check")

    try:
        result = supa.table("users").select(
            "id,email,name,subscription_tier,trial_start_date,trial_end_date"
        ).eq("subscription_tier", "trial").execute()

        users = result.data or []
        logger.info(f"Scheduler: found {len(users)} trial users")

        for user in users:
            user_id = user["id"]
            email = user["email"]
            name = user.get("name") or "there"
            trial_start_raw = user.get("trial_start_date")
            trial_end_raw = user.get("trial_end_date")

            if not trial_start_raw or not trial_end_raw:
                continue

            try:
                trial_start = datetime.fromisoformat(str(trial_start_raw).replace("Z", "+00:00"))
                trial_end = datetime.fromisoformat(str(trial_end_raw).replace("Z", "+00:00"))
                if getattr(trial_start, "tzinfo", None) is None:
                    trial_start = trial_start.replace(tzinfo=timezone.utc)
                if getattr(trial_end, "tzinfo", None) is None:
                    trial_end = trial_end.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            # Downgrade expired trial
            if now > trial_end:
                supa.table("users").update({"subscription_tier": "free"}).eq("id", user_id).execute()
                logger.info(f"Scheduler: trial expired for {email}, downgraded to free")
                continue

            days_into_trial = (now - trial_start).days
            days_remaining = max(0, (trial_end - now).days)

            # Fetch already-sent reminders
            sent_r = supa.table("trial_email_reminders").select("reminder_type").eq("user_id", user_id).execute()
            sent_types = {r["reminder_type"] for r in (sent_r.data or [])}

            # Day 7 reminder
            if days_into_trial >= 7 and "day_7" not in sent_types:
                await _send_reminder(supa, user_id, email, name, "day_7", days_remaining)

            # Day 11 reminder (3 days remaining)
            elif days_remaining <= 3 and "day_11" not in sent_types:
                await _send_reminder(supa, user_id, email, name, "day_11", days_remaining)

    except Exception as e:
        logger.error(f"Scheduler error in trial check: {e}")


async def _send_reminder(supa, user_id: str, email: str, name: str, reminder_type: str, days_remaining: int):
    resend_key = os.environ.get("RESEND_API_KEY", "")
    frontend_url = os.environ.get("FRONTEND_URL", "")

    if resend_key:
        try:
            import resend
            resend.api_key = resend_key
            sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

            if reminder_type == "day_7":
                subject = "You're halfway through your CourtBound trial!"
                html = _build_day7_html(name, frontend_url)
            else:
                subject = f"Only {days_remaining} days left in your CourtBound trial"
                html = _build_day11_html(name, days_remaining, frontend_url)

            params = {
                "from": f"CourtBound <{sender}>",
                "to": [email],
                "subject": subject,
                "html": html,
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Scheduler: sent {reminder_type} email to {email}")
        except Exception as e:
            logger.error(f"Scheduler: failed to send {reminder_type} to {email}: {e}")
            return  # Don't record if send failed
    else:
        logger.info(f"Scheduler: [STUB] Would send {reminder_type} to {email} — set RESEND_API_KEY to enable")

    # Record reminder sent (prevents duplicates)
    try:
        supa.table("trial_email_reminders").insert({
            "user_id": user_id,
            "reminder_type": reminder_type,
        }).execute()
    except Exception as e:
        logger.error(f"Scheduler: failed to record reminder {reminder_type} for {user_id}: {e}")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

async def _dispatch_scheduled_messages():
    """Flip 'scheduled' messages whose scheduled_at has passed to 'sent'."""
    try:
        from supabase_db import supa
        now = datetime.now(timezone.utc).isoformat()
        result = supa.table("coach_messages") \
            .update({"status": "sent"}) \
            .eq("status", "scheduled") \
            .lte("scheduled_at", now) \
            .execute()
        dispatched = len(result.data or [])
        if dispatched:
            logger.info("Scheduled messages dispatched: %d", dispatched)
    except Exception as exc:
        logger.warning("Scheduled message dispatch failed: %s", exc)


async def _notify_contact_period_countdown():
    """
    Daily job: notify NCAA D1 coaches when a contact period is 7 or 1 day away.
    NAIA/D2/JUCO are always in open recruiting — no countdown needed for them.
    """
    try:
        from supabase_db import supa
        from routers.coach_dashboard import RECRUITING_CALENDAR

        today = datetime.now(timezone.utc).date()
        d1_calendar = RECRUITING_CALENDAR.get("NCAA D1", [])

        # Find the next upcoming contact or evaluation period
        upcoming = [
            p for p in d1_calendar
            if p["type"] in ("contact", "evaluation")
            and datetime.strptime(p["start"], "%Y-%m-%d").date() > today
        ]
        if not upcoming:
            return

        upcoming.sort(key=lambda p: p["start"])
        next_period = upcoming[0]
        start_date = datetime.strptime(next_period["start"], "%Y-%m-%d").date()
        days_away = (start_date - today).days

        if days_away not in (7, 1):
            return  # Only notify at 7-day and 1-day marks

        period_label = next_period["label"]
        formatted_start = start_date.strftime("%d %b %Y")

        if days_away == 7:
            title = f"{period_label} starts in 7 days"
            message = (
                f"Your {period_label} window opens on {formatted_start}. "
                "Plan your player outreach and campus visit invitations now."
            )
        else:
            title = f"{period_label} starts tomorrow"
            message = (
                f"Your {period_label} window opens tomorrow ({formatted_start}). "
                "Make sure your outreach messages are ready to go."
            )

        # Fetch all verified D1 coaches
        coaches_res = supa.table("coach_accounts") \
            .select("id") \
            .eq("verification_status", "verified") \
            .eq("division", "NCAA D1") \
            .execute()
        coaches = coaches_res.data or []
        if not coaches:
            return

        # Dedup: skip if this coach already received a contact_countdown notification in last 36h
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=36)).isoformat()
        recent_res = supa.table("coach_notifications") \
            .select("coach_id") \
            .eq("type", "contact_countdown") \
            .gte("created_at", cutoff) \
            .execute()
        already_notified = {str(r["coach_id"]) for r in (recent_res.data or [])}

        rows = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for coach in coaches:
            cid = str(coach["id"])
            if cid not in already_notified:
                rows.append({
                    "coach_id": cid,
                    "type": "contact_countdown",
                    "title": title,
                    "message": message,
                    "link": "/coach/dashboard",
                    "is_read": False,
                    "created_at": now_iso,
                })

        if rows:
            supa.table("coach_notifications").insert(rows).execute()
            logger.info(
                "Contact period countdown: sent '%s' to %d D1 coach(es)",
                title, len(rows)
            )
    except Exception as exc:
        logger.error("Contact period countdown job failed: %s", exc)

def start_scheduler():
    if not _scheduler.running:
        _scheduler.add_job(
            _process_trial_reminders,
            IntervalTrigger(hours=1),
            id="trial_reminders",
            replace_existing=True,
        )
        _scheduler.add_job(
            _dispatch_scheduled_messages,
            IntervalTrigger(minutes=15),
            id="scheduled_messages",
            replace_existing=True,
        )
        _scheduler.add_job(
            _notify_contact_period_countdown,
            IntervalTrigger(hours=24),
            id="contact_period_countdown",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info(
            "Scheduler started: trial reminders (1h) + "
            "scheduled messages (15m) + contact period countdown (24h)"
        )


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Trial reminder scheduler stopped")
