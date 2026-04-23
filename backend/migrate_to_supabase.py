"""
CourtBound — MongoDB → Supabase Migration Script
=================================================
Phase 2 of the Platform Independence migration.

Run from /app/backend:
    python3 migrate_to_supabase.py

Design:
- All MongoDB IDs are converted to deterministic UUIDs (uuid5) so the
  script is safe to re-run multiple times (idempotent upserts).
- FK order: colleges → coaches → users → (sessions, profiles, tracked,
  emails, reports, notifications, goals, checklists, ai_results)
- The service_role key bypasses Supabase Row Level Security, which is
  correct because all data access in production goes through FastAPI.
"""

import asyncio
import json
import uuid
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from supabase import create_client, Client
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

# ── Supabase credentials ──────────────────────────────────────────────────────
SUPABASE_URL = "https://zpjecshrowlgrbgvstiw.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwamVjc2hyb3dsZ3JiZ3ZzdGl3Iiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkzNzM4MiwiZXhwIjoyMDkyNTEzMzgyfQ"
    ".OvnVgrDJrpKLxNzx4mKZwvvUjLUS5ZPgHw450Iw7yNI"
)

# ── MongoDB connection ────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.environ.get("DB_NAME", "courtbound")

# ── UUID namespace — fixed so IDs are always deterministic ───────────────────
NS = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


def to_uuid(collection: str, key: str) -> str:
    """Deterministic UUID from (collection, natural key)."""
    return str(uuid.uuid5(NS, f"{collection}:{key}"))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_str(v) -> str:
    if v is None:
        return ""
    return str(v)


def safe_bool(v, default: bool = False) -> bool:
    if isinstance(v, bool):
        return v
    return default


# ── Migration stats ───────────────────────────────────────────────────────────
stats: dict[str, dict] = {}


def record(table: str, attempted: int, upserted: int, errors: int = 0):
    stats[table] = {"attempted": attempted, "upserted": upserted, "errors": errors}


# ── Supabase upsert helper ────────────────────────────────────────────────────
def upsert(sb: Client, table: str, rows: list[dict]) -> tuple[int, int]:
    """Batch upsert rows into a Supabase table. Returns (upserted, errors)."""
    if not rows:
        return 0, 0
    upserted = errors = 0
    # Supabase PostgREST handles up to ~500 rows per request safely
    batch_size = 200
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            result = (
                sb.table(table)
                .upsert(batch, on_conflict="id")
                .execute()
            )
            upserted += len(result.data) if result.data else len(batch)
        except Exception as exc:
            errors += len(batch)
            print(f"  [ERROR] {table} batch {i}–{i+len(batch)}: {exc}")
    return upserted, errors


# ─────────────────────────────────────────────────────────────────────────────
# MIGRATION FUNCTIONS  (in FK dependency order)
# ─────────────────────────────────────────────────────────────────────────────

async def migrate_colleges(db, sb: Client) -> dict[str, str]:
    """Returns {mongo_id_str: supabase_uuid} for use as FK in coaches etc."""
    docs = await db.colleges.find({}).to_list(None)
    id_map: dict[str, str] = {}
    rows = []
    for doc in docs:
        mongo_id = str(doc["_id"])
        supabase_id = to_uuid("college", doc["name"])
        id_map[mongo_id] = supabase_id
        rows.append({
            "id":               supabase_id,
            "name":             safe_str(doc.get("name")),
            "location":         safe_str(doc.get("location")),
            "state":            safe_str(doc.get("state")),
            "division":         safe_str(doc.get("division")),
            "conference":       safe_str(doc.get("conference")),
            "region":           safe_str(doc.get("region") or "USA"),
            "country":          safe_str(doc.get("country")),
            "foreign_friendly": safe_bool(doc.get("foreign_friendly")),
            "image_url":        safe_str(doc.get("image_url")),
            "scholarship_info": safe_str(doc.get("scholarship_info")),
            "notable_alumni":   safe_str(doc.get("notable_alumni")),
            "ranking":          int(doc.get("ranking") or 999),
            "acceptance_rate":  safe_str(doc.get("acceptance_rate")),
            "website":          safe_str(doc.get("website")),
            "scholarship_type": safe_str(doc.get("scholarship_type")),
            "language_of_study":safe_str(doc.get("language_of_study")),
            "from_csv":         safe_bool(doc.get("from_csv")),
            "created_at":       safe_str(doc.get("created_at") or now_iso()),
        })
    ups, errs = upsert(sb, "colleges", rows)
    record("colleges", len(rows), ups, errs)
    return id_map


async def migrate_coaches(db, sb: Client, college_id_map: dict[str, str]):
    docs = await db.colleges.find({}, {"_id": 1, "coaches": 1}).to_list(None)
    rows = []
    for doc in docs:
        mongo_college_id = str(doc["_id"])
        supabase_college_id = college_id_map.get(mongo_college_id)
        if not supabase_college_id:
            continue
        for idx, coach in enumerate(doc.get("coaches") or []):
            # Always include idx so duplicate emails in same college stay distinct
            key = f"{mongo_college_id}:{idx}:{safe_str(coach.get('email'))}"
            rows.append({
                "id":            to_uuid("coach", key),
                "college_id":    supabase_college_id,
                "name":          safe_str(coach.get("name")),
                "email":         safe_str(coach.get("email")),
                "title":         safe_str(coach.get("title")),
                "phone":         safe_str(coach.get("phone")),
                "last_verified": coach.get("last_verified") or None,
                "sort_order":    idx,
            })
    ups, errs = upsert(sb, "coaches", rows)
    record("coaches", len(rows), ups, errs)


async def migrate_users(db, sb: Client) -> dict[str, str]:
    """
    Returns {canonical_user_id: supabase_uuid}.
    Canonical ID = doc['user_id'] if present, else str(doc['_id']).
    """
    docs = await db.users.find({}).to_list(None)
    id_map: dict[str, str] = {}
    rows = []
    for doc in docs:
        # Build canonical ID
        canonical = doc.get("user_id") or str(doc["_id"])
        supabase_id = to_uuid("user", doc["email"])
        id_map[canonical] = supabase_id
        # Also map _id string in case some FK uses it
        id_map[str(doc["_id"])] = supabase_id

        rows.append({
            "id":            supabase_id,
            "google_id":     doc.get("google_id") or None,
            "email":         safe_str(doc.get("email")),
            "name":          safe_str(doc.get("name")),
            "picture":       safe_str(doc.get("picture")),
            "password_hash": doc.get("password_hash") or None,
            "role":          safe_str(doc.get("role") or "player"),
            "created_at":    safe_str(doc.get("created_at") or now_iso()),
        })
    ups, errs = upsert(sb, "users", rows)
    record("users", len(rows), ups, errs)
    return id_map


async def migrate_user_sessions(db, sb: Client, user_id_map: dict[str, str]):
    # Merge both `sessions` and `user_sessions` collections
    rows = []
    seen_tokens: set[str] = set()

    for coll_name in ("user_sessions", "sessions"):
        docs = await db[coll_name].find({}).to_list(None)
        for doc in docs:
            token = safe_str(doc.get("session_token") or doc.get("token"))
            if not token or token in seen_tokens:
                continue
            seen_tokens.add(token)
            uid = user_id_map.get(safe_str(doc.get("user_id")))
            if not uid:
                continue  # orphan session — skip
            expires_raw = doc.get("expires_at")
            rows.append({
                "id":            to_uuid("session", token),
                "user_id":       uid,
                "session_token": token,
                "expires_at":    safe_str(expires_raw or now_iso()),
                "created_at":    safe_str(doc.get("created_at") or now_iso()),
            })
    ups, errs = upsert(sb, "user_sessions", rows)
    record("user_sessions", len(rows), ups, errs)


async def migrate_admin_sessions(db, sb: Client):
    docs = await db.admin_sessions.find({}).to_list(None)
    rows = []
    for doc in docs:
        token = safe_str(doc.get("token"))
        if not token:
            continue
        rows.append({
            "id":         to_uuid("admin_session", token),
            "email":      safe_str(doc.get("email")),
            "token":      token,
            "expires_at": safe_str(doc.get("expires_at") or now_iso()),
            "created_at": safe_str(doc.get("created_at") or now_iso()),
        })
    ups, errs = upsert(sb, "admin_sessions", rows)
    record("admin_sessions", len(rows), ups, errs)


async def migrate_login_attempts(db, sb: Client):
    docs = await db.login_attempts.find({}).to_list(None)
    rows = []
    for doc in docs:
        ident = safe_str(doc.get("identifier"))
        if not ident:
            continue
        rows.append({
            "id":           to_uuid("login_attempt", ident),
            "identifier":   ident,
            "attempts":     int(doc.get("attempts") or 1),
            "last_attempt": safe_str(doc.get("last_attempt") or now_iso()),
        })
    ups, errs = upsert(sb, "login_attempts", rows)
    record("login_attempts", len(rows), ups, errs)


async def migrate_app_settings(db, sb: Client):
    docs = await db.app_settings.find({}).to_list(None)
    rows = []
    for doc in docs:
        rows.append({
            "key":           safe_str(doc.get("key") or "global"),
            "show_european": safe_bool(doc.get("show_european"), True),
            "updated_at":    now_iso(),
        })
    if not rows:
        rows = [{"key": "global", "show_european": True, "updated_at": now_iso()}]
    # app_settings uses key as PK, upsert on key
    try:
        sb.table("app_settings").upsert(rows, on_conflict="key").execute()
        record("app_settings", len(rows), len(rows))
    except Exception as exc:
        print(f"  [ERROR] app_settings: {exc}")
        record("app_settings", len(rows), 0, len(rows))


async def migrate_profiles(db, sb: Client, user_id_map: dict[str, str]):
    docs = await db.profiles.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        if not uid:
            skipped += 1
            continue

        dob = doc.get("date_of_birth")
        rows.append({
            "id":                     to_uuid("profile", safe_str(doc.get("user_id"))),
            "user_id":                uid,
            "full_name":              safe_str(doc.get("full_name")),
            "email":                  safe_str(doc.get("email")),
            "phone":                  safe_str(doc.get("phone")),
            "date_of_birth":          safe_str(dob) if dob else None,
            "nationality":            safe_str(doc.get("nationality")),
            "hometown":               safe_str(doc.get("hometown")),
            "position":               safe_str(doc.get("position")),
            "secondary_position":     safe_str(doc.get("secondary_position")),
            "height_cm":              safe_str(doc.get("height_cm")),
            "height_ft":              safe_str(doc.get("height_ft")),
            "weight_kg":              safe_str(doc.get("weight_kg")),
            "wingspan_cm":            safe_str(doc.get("wingspan_cm")),
            "dominant_hand":          safe_str(doc.get("dominant_hand")),
            "jersey_number":          safe_str(doc.get("jersey_number")),
            "years_playing":          safe_str(doc.get("years_playing")),
            "current_school":         safe_str(doc.get("current_school")),
            "club_team":              safe_str(doc.get("club_team")),
            "current_team":           safe_str(doc.get("current_team")),
            "academy_ppg":            safe_str(doc.get("academy_ppg")),
            "academy_rpg":            safe_str(doc.get("academy_rpg")),
            "academy_apg":            safe_str(doc.get("academy_apg")),
            "academy_spg":            safe_str(doc.get("academy_spg")),
            "academy_fg_percent":     safe_str(doc.get("academy_fg_percent")),
            "academy_three_pt_percent": safe_str(doc.get("academy_three_pt_percent")),
            "college_ppg":            safe_str(doc.get("college_ppg")),
            "college_rpg":            safe_str(doc.get("college_rpg")),
            "college_apg":            safe_str(doc.get("college_apg")),
            "college_spg":            safe_str(doc.get("college_spg")),
            "college_fg_percent":     safe_str(doc.get("college_fg_percent")),
            "college_three_pt_percent": safe_str(doc.get("college_three_pt_percent")),
            "country_ppg":            safe_str(doc.get("country_ppg")),
            "country_rpg":            safe_str(doc.get("country_rpg")),
            "country_apg":            safe_str(doc.get("country_apg")),
            "country_spg":            safe_str(doc.get("country_spg")),
            "country_fg_percent":     safe_str(doc.get("country_fg_percent")),
            "country_three_pt_percent": safe_str(doc.get("country_three_pt_percent")),
            "ppg":                    safe_str(doc.get("ppg")),
            "rpg":                    safe_str(doc.get("rpg")),
            "apg":                    safe_str(doc.get("apg")),
            "spg":                    safe_str(doc.get("spg")),
            "fg_percent":             safe_str(doc.get("fg_percent")),
            "three_pt_percent":       safe_str(doc.get("three_pt_percent")),
            "school_year":            safe_str(doc.get("school_year")),
            "expected_graduation":    safe_str(doc.get("expected_graduation")),
            "gcse_grades":            safe_str(doc.get("gcse_grades")),
            "a_level_subjects":       safe_str(doc.get("a_level_subjects")),
            "predicted_grades":       safe_str(doc.get("predicted_grades")),
            "gpa_equivalent":         safe_str(doc.get("gpa_equivalent")),
            "sat_score":              safe_str(doc.get("sat_score")),
            "act_score":              safe_str(doc.get("act_score")),
            "ncaa_id":                safe_str(doc.get("ncaa_id")),
            "ncaa_registered":        safe_bool(doc.get("ncaa_registered")),
            "intended_major":         safe_str(doc.get("intended_major")),
            "target_division":        safe_str(doc.get("target_division")),
            "target_start_year":      safe_str(doc.get("target_start_year")),
            "highlight_tape_url":     safe_str(doc.get("highlight_tape_url")),
            "instagram":              safe_str(doc.get("instagram")),
            "twitter":                safe_str(doc.get("twitter")),
            "bio":                    safe_str(doc.get("bio")),
            "updated_at":             safe_str(doc.get("updated_at") or now_iso()),
            "created_at":             safe_str(doc.get("created_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] profiles: skipped {skipped} orphan profile(s) with no matching user")
    ups, errs = upsert(sb, "profiles", rows)
    record("profiles", len(rows), ups, errs)


async def migrate_tracked_colleges(
    db, sb: Client, user_id_map: dict[str, str], college_id_map: dict[str, str]
):
    docs = await db.tracked_colleges.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        cid = college_id_map.get(safe_str(doc.get("college_id")))
        if not uid or not cid:
            skipped += 1
            continue
        key = f"{safe_str(doc.get('user_id'))}:{safe_str(doc.get('college_id'))}"
        fd = doc.get("follow_up_date")
        rows.append({
            "id":               to_uuid("tracked", key),
            "user_id":          uid,
            "college_id":       cid,
            "status":           safe_str(doc.get("status") or "tracked"),
            "reply_outcome":    doc.get("reply_outcome") or None,
            "follow_up_needed": safe_bool(doc.get("follow_up_needed")),
            "follow_up_date":   safe_str(fd) if fd else None,
            "notes":            safe_str(doc.get("notes")),
            "created_at":       safe_str(doc.get("created_at") or now_iso()),
            "updated_at":       safe_str(doc.get("updated_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] tracked_colleges: skipped {skipped} orphan record(s)")
    ups, errs = upsert(sb, "tracked_colleges", rows)
    record("tracked_colleges", len(rows), ups, errs)


async def migrate_emails(
    db, sb: Client, user_id_map: dict[str, str], college_id_map: dict[str, str]
):
    docs = await db.emails.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        cid = college_id_map.get(safe_str(doc.get("college_id")))
        if not uid or not cid:
            skipped += 1
            continue
        mongo_id = str(doc["_id"])
        fd = doc.get("follow_up_date")
        rows.append({
            "id":               to_uuid("email", mongo_id),
            "user_id":          uid,
            "college_id":       cid,
            "direction":        safe_str(doc.get("direction") or "sent"),
            "subject":          safe_str(doc.get("subject")),
            "body":             safe_str(doc.get("body")),
            "coach_name":       safe_str(doc.get("coach_name")),
            "coach_email":      safe_str(doc.get("coach_email")),
            "message_type":     safe_str(doc.get("message_type") or "initial_outreach"),
            "follow_up_needed": safe_bool(doc.get("follow_up_needed")),
            "follow_up_date":   safe_str(fd) if fd else None,
            "created_at":       safe_str(doc.get("created_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] emails: skipped {skipped} orphan record(s)")
    ups, errs = upsert(sb, "emails", rows)
    record("emails", len(rows), ups, errs)


async def migrate_college_reports(
    db, sb: Client, user_id_map: dict[str, str], college_id_map: dict[str, str]
) -> dict[str, str]:
    """Returns {mongo_report_id: supabase_uuid} for notifications FK."""
    docs = await db.college_reports.find({}).to_list(None)
    id_map: dict[str, str] = {}
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        if not uid:
            skipped += 1
            continue
        mongo_id = safe_str(doc.get("id") or str(doc["_id"]))
        supabase_id = to_uuid("report", mongo_id)
        id_map[mongo_id] = supabase_id
        cid = college_id_map.get(safe_str(doc.get("college_id"))) if doc.get("college_id") else None
        rows.append({
            "id":             supabase_id,
            "user_id":        uid,
            "user_name":      safe_str(doc.get("user_name")),
            "user_email":     safe_str(doc.get("user_email")),
            "college_id":     cid,
            "college_name":   safe_str(doc.get("college_name")),
            "coach_name":     safe_str(doc.get("coach_name")),
            "issue_type":     safe_str(doc.get("issue_type")),
            "correct_info":   safe_str(doc.get("correct_info")),
            "notes":          safe_str(doc.get("notes")),
            "status":         safe_str(doc.get("status") or "open"),
            "admin_response": safe_str(doc.get("admin_response")),
            "created_at":     safe_str(doc.get("created_at") or now_iso()),
            "updated_at":     safe_str(doc.get("updated_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] college_reports: skipped {skipped} orphan report(s)")
    ups, errs = upsert(sb, "college_reports", rows)
    record("college_reports", len(rows), ups, errs)
    return id_map


async def migrate_user_notifications(
    db, sb: Client, user_id_map: dict[str, str], report_id_map: dict[str, str]
):
    docs = await db.user_notifications.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        if not uid:
            skipped += 1
            continue
        mongo_id = safe_str(doc.get("id") or str(doc["_id"]))
        report_id_str = safe_str(doc.get("report_id")) if doc.get("report_id") else None
        rid = report_id_map.get(report_id_str) if report_id_str else None
        rows.append({
            "id":           to_uuid("notification", mongo_id),
            "user_id":      uid,
            "report_id":    rid,
            "college_name": safe_str(doc.get("college_name")),
            "message":      safe_str(doc.get("message")),
            "status":       safe_str(doc.get("status") or "open"),
            "read":         safe_bool(doc.get("read")),
            "created_at":   safe_str(doc.get("created_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] user_notifications: skipped {skipped} orphan notification(s)")
    ups, errs = upsert(sb, "user_notifications", rows)
    record("user_notifications", len(rows), ups, errs)


async def migrate_weekly_goals(db, sb: Client, user_id_map: dict[str, str]):
    docs = await db.weekly_goals.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        if not uid:
            skipped += 1
            continue
        key = f"{safe_str(doc.get('user_id'))}:{safe_str(doc.get('week_start'))}"
        rows.append({
            "id":         to_uuid("weekly_goal", key),
            "user_id":    uid,
            "week_start": safe_str(doc.get("week_start")),
            "goals":      doc.get("goals") or {},
            "created_at": safe_str(doc.get("created_at") or now_iso()),
            "updated_at": safe_str(doc.get("updated_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] weekly_goals: skipped {skipped} orphan record(s)")
    ups, errs = upsert(sb, "weekly_goals", rows)
    record("weekly_goals", len(rows), ups, errs)


async def migrate_college_checklists(
    db, sb: Client, user_id_map: dict[str, str], college_id_map: dict[str, str]
):
    docs = await db.college_checklists.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        cid = college_id_map.get(safe_str(doc.get("college_id")))
        if not uid or not cid:
            skipped += 1
            continue
        key = f"{safe_str(doc.get('user_id'))}:{safe_str(doc.get('college_id'))}"
        rows.append({
            "id":         to_uuid("checklist", key),
            "user_id":    uid,
            "college_id": cid,
            "items":      doc.get("items") or [],
            "created_at": safe_str(doc.get("created_at") or now_iso()),
            "updated_at": safe_str(doc.get("updated_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] college_checklists: skipped {skipped} orphan record(s)")
    ups, errs = upsert(sb, "college_checklists", rows)
    record("college_checklists", len(rows), ups, errs)


async def migrate_ai_match_results(db, sb: Client, user_id_map: dict[str, str]):
    docs = await db.ai_match_results.find({}).to_list(None)
    rows = []
    skipped = 0
    for doc in docs:
        uid = user_id_map.get(safe_str(doc.get("user_id")))
        if not uid:
            skipped += 1
            continue
        rows.append({
            "id":      to_uuid("ai_match", safe_str(doc.get("user_id"))),
            "user_id": uid,
            "results": doc.get("results") or {},
            "run_at":  safe_str(doc.get("run_at") or now_iso()),
        })
    if skipped:
        print(f"  [WARN] ai_match_results: skipped {skipped} orphan record(s)")
    ups, errs = upsert(sb, "ai_match_results", rows)
    record("ai_match_results", len(rows), ups, errs)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("CourtBound — MongoDB → Supabase Migration")
    print("=" * 60)

    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client[DB_NAME]

    # Connect to Supabase
    sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("\n[1/15] Migrating colleges …")
    college_id_map = await migrate_colleges(db, sb)

    print("[2/15] Migrating coaches …")
    await migrate_coaches(db, sb, college_id_map)

    print("[3/15] Migrating users …")
    user_id_map = await migrate_users(db, sb)

    print("[4/15] Migrating user_sessions …")
    await migrate_user_sessions(db, sb, user_id_map)

    print("[5/15] Migrating admin_sessions …")
    await migrate_admin_sessions(db, sb)

    print("[6/15] Migrating login_attempts …")
    await migrate_login_attempts(db, sb)

    print("[7/15] Migrating app_settings …")
    await migrate_app_settings(db, sb)

    print("[8/15] Migrating profiles …")
    await migrate_profiles(db, sb, user_id_map)

    print("[9/15] Migrating tracked_colleges …")
    await migrate_tracked_colleges(db, sb, user_id_map, college_id_map)

    print("[10/15] Migrating emails …")
    await migrate_emails(db, sb, user_id_map, college_id_map)

    print("[11/15] Migrating college_reports …")
    report_id_map = await migrate_college_reports(db, sb, user_id_map, college_id_map)

    print("[12/15] Migrating user_notifications …")
    await migrate_user_notifications(db, sb, user_id_map, report_id_map)

    print("[13/15] Migrating weekly_goals …")
    await migrate_weekly_goals(db, sb, user_id_map)

    print("[14/15] Migrating college_checklists …")
    await migrate_college_checklists(db, sb, user_id_map, college_id_map)

    print("[15/15] Migrating ai_match_results …")
    await migrate_ai_match_results(db, sb, user_id_map)

    mongo_client.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    total_attempted = total_upserted = total_errors = 0
    for table, s in stats.items():
        a, u, e = s["attempted"], s["upserted"], s["errors"]
        total_attempted += a
        total_upserted  += u
        total_errors    += e
        status = "OK" if e == 0 else "ERRORS"
        print(f"  {table:<25} {a:>5} attempted  {u:>5} upserted  {e:>3} errors  [{status}]")
    print("-" * 60)
    print(f"  {'TOTAL':<25} {total_attempted:>5} attempted  {total_upserted:>5} upserted  {total_errors:>3} errors")
    print("=" * 60)

    if total_errors > 0:
        print("\n⚠  Some records had errors. Re-run the script to retry.")
        sys.exit(1)
    else:
        print("\n✓  Migration complete — all records upserted successfully.")
        print("   Safe to re-run at any time (fully idempotent).")


if __name__ == "__main__":
    asyncio.run(main())
