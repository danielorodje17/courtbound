# CourtBound — PRD

## Problem Statement
Build "CourtBound," a web app to help UK/European college basketball players track scholarship opportunities at US colleges. Players can track colleges, log email communications with coaches, manage their recruitment profile, and use AI tools for drafting messages and finding matching schools.

## User Personas
- **Primary**: UK/European basketball player (aged 16-21) seeking US college basketball scholarships
- **Secondary**: Admin user managing the college database and user base

## Core Requirements

### Authentication
- Google OAuth via Emergent Auth service
- Admin login via email/password stored in .env
- Session-based auth (Bearer token in Authorization header)

### Colleges
- Browse 500+ US colleges with coach contact info
- Filter by division (D1/D2/D3/NAIA), state, foreign-friendly flag
- Compare up to 3 colleges side-by-side
- Track/untrack colleges per user

### Email Tracking
- Log outbound emails to coaches
- Log inbound replies from coaches
- Bulk email logging
- CSV import of historic emails
- Email templates

### AI Features (via OpenAI via Emergent LLM Key)
- Draft personalised outreach emails
- AI college match scoring
- NCAA eligibility check
- Reply next steps analysis
- Recruitment strategy
- Profile completeness review

### Dashboard
- Stats overview (tracked, emails sent/received)
- Activity heatmap
- Follow-up alerts
- Weekly digest

### Admin Panel
- User management (view, delete, subscription tier)
- College/coach database management (CSV export/import)
- College reports review
- App settings (show_european flag)
- Admin stats with signup trends

---

## Architecture

### Tech Stack
- **Frontend**: React.js (CRA + craco), deployed to Vercel
- **Backend**: FastAPI (Python), hosted on Kubernetes (port 8001)
- **Database**: Supabase (PostgreSQL) — migrated from MongoDB
- **AI**: OpenAI GPT-4.1-mini via emergentintegrations + Emergent LLM Key
- **Auth**: Emergent Google OAuth

### Key Files
```
/app/
├── backend/
│   ├── .env                    # MONGO_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, etc.
│   ├── server.py               # FastAPI app, routes
│   ├── supabase_db.py          # Supabase singleton client
│   ├── auth_utils.py           # get_current_user, UserModel
│   ├── models.py               # Pydantic models
│   └── routers/
│       ├── auth.py             # /api/auth/*
│       ├── colleges.py         # /api/colleges/*
│       ├── tracked.py          # /api/my-colleges/*, /api/checklist/*
│       ├── emails.py           # /api/emails/*, /api/templates/*
│       ├── dashboard.py        # /api/dashboard/*
│       ├── goals.py            # /api/goals/*
│       ├── ai.py               # /api/ai/*
│       ├── profile.py          # /api/profile
│       ├── admin.py            # /api/admin/*
│       └── reports.py          # /api/reports, /api/notifications/*
├── frontend/
│   ├── package.json            # devDep: ajv@^8.11.0 (Vercel build fix)
│   └── src/pages/
└── memory/
    ├── PRD.md                  # This file
    ├── supabase_schema.sql     # Original 15-table schema
    └── supabase_migration_v2.sql  # Required schema additions
```

### Supabase Schema
15 tables: `colleges`, `coaches` (normalized), `users`, `profiles`, `user_sessions`, `admin_sessions`, `login_attempts`, `tracked_colleges`, `emails`, `college_reports`, `user_notifications`, `weekly_goals`, `college_checklists`, `ai_match_results`, `app_settings`

---

## What's Been Implemented

### ✅ Phase 1: Schema Design (DONE)
- 15-table PostgreSQL schema designed and deployed to Supabase
- Reference: `/app/memory/supabase_schema.sql`

### ✅ Phase 2: Data Migration (DONE — 2026-04-23)
- 977 records migrated from MongoDB to Supabase using `migrate_to_supabase.py`
- Deterministic UUIDs generated from MongoDB ObjectIds

### ✅ Phase 3: Backend Swap (DONE — 2026-04-23)
- All 10 routers rewritten to use `supabase-py v2.28.3`
- Pattern: `run_in_threadpool(lambda: supa.table("...").select("*").execute())`
- Coaches now embedded via PostgREST: `select("*, coaches(*)")`
- MongoDB code kept as comments for rollback reference
- 13/13 backend tests passing

### ✅ P0: Vercel Build Fix (DONE — 2026-04-23)
- Fixed `Error: Cannot find module 'ajv/dist/compile/codegen'`
- Solution: Added `"ajv": "^8.11.0"` to devDependencies (NOT via resolutions)
- This hoists ajv@8 for webpack while allowing fork-ts-checker to keep nested ajv@6
- `yarn build` passes locally

### ⚠️ REQUIRED: Run Supabase Migration SQL
**File**: `/app/memory/supabase_migration_v2.sql`
**Where**: Supabase Dashboard → Database → SQL Editor

Features that require this migration before they work:
- Call notes on tracked colleges (`call_notes JSONB`)
- Application & signing deadlines (`application_deadline`, `signing_day DATE`)
- Email outcome field (`outcome TEXT`)
- Email templates (`email_templates` table)
- User activity tracking (`last_active`, `subscription_tier` on `users`)

---

## Prioritized Backlog

### P0 — Must Fix
- None currently

### P1 — Next Sprint
- Phase 4: Remove MongoDB/motor from requirements.txt after Vercel deployment verified
- Run `/app/memory/supabase_migration_v2.sql` in Supabase dashboard

### P2 — Upcoming
- Girls Basketball Support: separate college list for women's basketball
- Important Deadlines/Calendar alerts on Dashboard
- Weekly Digest email (requires Resend API key)
- End-to-end auth flow testing with real Google OAuth session

### P3 — Future/Backlog
- Stats Counter on Landing Page (social proof)
- Push notifications for follow-up reminders
- Mobile app / PWA
- Multi-sport support beyond basketball
