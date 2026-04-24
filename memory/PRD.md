# CourtBound — Product Requirements Document

## Original Problem Statement
Build "CourtBound," a web app to track USA and UK college basketball scholarships. Allow players to track colleges, log communications with coaches, use AI tools for recruitment strategy, and manage their scholarship journey.

## Tech Stack
- **Frontend**: React.js (CRA + CRACO), Tailwind CSS, Recharts
- **Backend**: FastAPI (Python), Supabase (PostgreSQL via supabase-py v2)
- **Auth**: Supabase Auth (Google OAuth PKCE flow)
- **Storage**: Supabase Storage (bucket: college-images, public)
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
- [x] Google OAuth login via Supabase Auth (PKCE flow) — replaces Emergent Auth
- [x] Email address reporting (wrong email clears verification badge)
- [x] Subscription/Trial system (14-day free trial)
- [x] Pricing page (/pricing) with 3-tier comparison
- [x] Trial countdown banner on dashboard
- [x] Admin pricing management (requires migration v3)
- [x] Background scheduler for trial email reminders (day 7 + day 11)
- [x] Admin college image upload → Supabase Storage (bucket: college-images, public)

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
- POST /auth/session — legacy Emergent Auth exchange (preview fallback)
- POST /auth/google-callback — **NEW** Supabase OAuth callback (used by live site)
- GET /auth/me — get current user (includes subscription_tier, trial_end_date)
- GET /subscription/plans — public pricing plans
- GET /subscription/status — user's trial/subscription status
- POST /subscription/checkout — coming soon placeholder
- GET /admin/pricing — admin get pricing plans
- PUT /admin/pricing/{tier} — admin update pricing plan
- POST /admin/colleges/{id}/upload-image — upload to Supabase Storage bucket `college-images`
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
2. **Run supabase_migration_v4.sql** in Supabase Dashboard → SQL Editor (adds basketball_gender to profiles, program_gender to colleges)
3. **Provide Resend API key** (re_...) for trial email reminders
4. **Set SENDER_EMAIL** in backend/.env for email from address
5. **Set FRONTEND_URL** in backend/.env (e.g., https://your-app.vercel.app)

## Women's Basketball Division (Added Feb 2026)
- Gender selector on onboarding step 0 (Men's / Women's)
- Women's theme: rose accent (#e11d48), indigo sidebar (#1e1b4b), Outfit/DM Sans fonts, pill-shaped buttons
- Men's theme: orange accent (#f97316), slate sidebar, Barlow Condensed font, sharp buttons
- ThemeContext persists division in localStorage; reads basketball_gender from profile on login
- Social media step (Instagram + X/Twitter) on onboarding step 4
- CollegesPage + Dashboard are fully theme-aware
- program_gender column on colleges table (default 'both') enables future women's-only college tagging by admin
