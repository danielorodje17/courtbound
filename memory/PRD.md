# CourtBound — Product Requirements Document

## Original Problem Statement
Build "CourtBound," a web app to track USA and UK college basketball scholarships. Allow players to track colleges, log communications with coaches, use AI tools for recruitment strategy, and manage their scholarship journey.

## Tech Stack
- **Frontend**: React.js (CRA + CRACO), Tailwind CSS, Recharts
- **Backend**: FastAPI (Python), Supabase (PostgreSQL via supabase-py v2)
- **Auth**: Emergent-managed Google OAuth
- **AI**: Emergent LLM Key (OpenAI/Anthropic)
- **Email**: Resend (API key pending from user)
- **Scheduler**: APScheduler (trial email reminders)
- **Deployment**: Vercel (frontend), Render/cloud (backend)

## User Personas
- **Players**: High school basketball players seeking college scholarships
- **Admin**: CourtBound admin managing users, colleges, and settings

## Core Features Implemented
- [x] College browsing with search/filter (USA + optional UK/European)
- [x] College tracking (bookmark colleges)
- [x] Coach contact directory with verified badges
- [x] Email logging & response tracking
- [x] AI tools: Email Compose, Strategy, NCAA Eligibility, AI Match, Reply Analysis
- [x] Dashboard with stats, heatmap, weekly goals
- [x] Profile management
- [x] College comparison tool
- [x] Admin panel: user management, reports, settings, college management
- [x] Google OAuth login via Emergent Auth
- [x] Email address reporting (wrong email clears verification badge)
- [x] Subscription/Trial system (14-day free trial)
- [x] Pricing page (/pricing) with 3-tier comparison
- [x] Trial countdown banner on dashboard
- [x] Admin pricing management (requires migration v3)
- [x] Background scheduler for trial email reminders (day 7 + day 11)

## Database Schema (Supabase/PostgreSQL)
### users
- id (UUID PK), google_id (TEXT UNIQUE), email (TEXT UNIQUE), name (TEXT), picture (TEXT)
- password_hash (TEXT), role (TEXT default 'player'), created_at (TIMESTAMPTZ)
- subscription_tier (TEXT default 'free') — values: free | trial | basic | premium
- trial_start_date (TIMESTAMPTZ) — added in migration v3
- trial_end_date (TIMESTAMPTZ) — added in migration v3
- last_active (TIMESTAMPTZ), subscription_tier (TEXT)

### user_sessions
- session_token (TEXT PK), user_id (UUID FK), expires_at (TIMESTAMPTZ)

### admin_sessions
- token (TEXT PK), admin_email (TEXT), expires_at (TIMESTAMPTZ)

### pricing_plans (added in migration v3)
- tier (TEXT PK): 'basic' | 'premium'
- name, price_monthly (NUMERIC), currency (TEXT), description (TEXT), features (JSONB), updated_at

### trial_email_reminders (added in migration v3)
- id (UUID PK), user_id (UUID FK), reminder_type (TEXT), sent_at (TIMESTAMPTZ)
- UNIQUE(user_id, reminder_type)

### colleges, coaches, tracked_colleges, emails, college_reports
(existing, see migration v1+v2 for details)

## Subscription Tier Features
| Feature | Free | Basic | Premium | Trial |
|---|---|---|---|---|
| Browse colleges | ✓ (limited) | ✓ | ✓ | ✓ |
| Track colleges | 3 max | unlimited | unlimited | unlimited |
| Email logging | ✗ | ✓ | ✓ | ✓ |
| Response tracker | ✗ | ✓ | ✓ | ✓ |
| Profile management | ✗ | ✓ | ✓ | ✓ |
| College comparison | ✗ | ✓ | ✓ | ✓ |
| AI tools | ✗ | ✗ | ✓ | ✓ |
| Bulk email/CSV | ✗ | ✗ | ✓ | ✓ |

## Migration Files
- `/app/memory/supabase_migration_v2.sql` — Base schema migration
- `/app/memory/supabase_migration_v3.sql` — **PENDING (user must run)**: trial columns, pricing_plans, trial_email_reminders

## Backend Routes (all prefixed /api)
- POST /auth/session — exchange Google OAuth session token
- GET /auth/me — get current user (now includes subscription_tier, trial_end_date)
- GET /subscription/plans — public pricing plans
- GET /subscription/status — user's trial/subscription status
- POST /subscription/checkout — coming soon placeholder
- GET /admin/pricing — admin get pricing plans
- PUT /admin/pricing/{tier} — admin update pricing plan
- (all other routes: /colleges, /tracked, /emails, /dashboard, /goals, /ai, /profile, /reports)

## Environment Variables Required
### backend/.env
- MONGO_URL, DB_NAME (legacy, preserved)
- SUPABASE_URL, SUPABASE_SERVICE_KEY
- JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
- RESEND_API_KEY (PENDING — user to provide)
- SENDER_EMAIL (PENDING — user to provide)
- FRONTEND_URL (for email links)
- OPENAI_API_KEY (Emergent LLM Key)

## Pending Actions (User Must Do)
1. **Run supabase_migration_v3.sql** in Supabase Dashboard → SQL Editor
2. **Provide Resend API key** (re_...) for trial email reminders
3. **Set SENDER_EMAIL** in backend/.env for email from address
4. **Set FRONTEND_URL** in backend/.env (e.g., https://your-app.vercel.app)
