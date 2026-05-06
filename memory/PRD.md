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
- [x] College browsing with search/filter (USA only — European colleges permanently removed)
- [x] College tracking (bookmark colleges)
- [x] Coach contact directory with verified badges
- [x] Email logging & response tracking
- [x] AI tools: Email Compose, Strategy, NCAA Eligibility, AI Match, Reply Analysis
- [x] Dashboard with stats, heatmap, weekly goals
- [x] Profile management
- [x] College comparison tool
- [x] Admin panel: user management, reports, settings, college management
- [x] Email/Password auth + Emergent-managed Google Auth
- [x] Email address reporting (wrong email clears verification badge)
- [x] Subscription/Trial system (14-day free trial, Stripe live keys)
- [x] Pricing page (/pricing) with Monthly/Annual/Season Pass tiers
- [x] Trial countdown banner on dashboard
- [x] Admin pricing management
- [x] Background scheduler for trial email reminders
- [x] Admin college image upload → Supabase Storage
- [x] Legal Documents (Privacy Policy / Terms of Use) — admin editor + public pages
- [x] Promo Code system — admin generation, user redemption to extend trial/sub
- [x] **European universities permanently removed** (43 DB entries deleted, all UI/backend code cleaned)

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

## Coach Portal (Phase 1 — added May 2026)
### Routes
- `/coach` — public landing page
- `/coach/login` — coach login
- `/coach/register` — 3-step registration (email, programme, sport)
- `/coach/dashboard` — main dashboard (protected)
- `/coach/players` — player search with filters (protected, verified only)
- `/coach/players/:userId` — full player profile with AI summary (protected, verified only)
- `/coach/board` — recruiting board / saved players in 4 lists (protected)
- `/coach/settings` — profile + recruiting preferences editor (protected)

### Key Rules
- Coaches only see players matching their `primary_sport` (Men's vs Women's Basketball)
- Unverified coaches get dashboard access but player search/profile is locked
- Match score (0–100) calculated from coach's recruiting preferences vs player stats
- AI summary (Claude) generated per player on profile view

### DB Tables (v10 migration — user must run)
- `coach_accounts` — coach user records with session token auth
- `ncaa_institutions` — known email domains for auto-verification
- `coach_saved_players` — saved players with list assignment
- `coach_notifications` — in-app notification feed
- `coach_player_views` — view tracking

### Phase 2 (completed)
- Admin verification queue (Coaches tab in Admin Panel) — approve/reject coaches
- Messaging system: coach → player one-way messages with NCAA compliance warnings  
- Coach notifications page (`/coach/notifications`)
- Coach sent messages page (`/coach/messages`)
- Player messages inbox (`/messages`) — read-only, mark as read
- Board upgrade: Move-between-lists and remove actions
- Double `%%` stat display bug fixed

### Phase 3 (upcoming)
- Coach analytics
- Onboarding sequence
- Programme public page
- Unread message badges on player nav


- Gender selector on onboarding step 0 (Men's / Women's)
- Women's theme: rose accent (#e11d48), indigo sidebar (#1e1b4b), Outfit/DM Sans fonts, pill-shaped buttons
- Men's theme: orange accent (#f97316), slate sidebar, Barlow Condensed font, sharp buttons
- ThemeContext persists division in localStorage; reads basketball_gender from profile on login
- Social media step (Instagram + X/Twitter) on onboarding step 4
- CollegesPage + Dashboard are fully theme-aware
- program_gender column on colleges table (default 'both') enables future women's-only college tagging by admin

## Lead Source Tracking (Added Feb 2026)
- "How did you hear about CourtBound?" field on Onboarding Step 1 (required)
- Options: Instagram, Clubs, Direct, Referral, Other (pill-button UI)
- Saved to `profiles.lead_source` (TEXT column) — requires migration v5
- Admin Funnel tab: "Acquisition Channels" horizontal bar chart shows breakdown
- Backend: `/api/admin/funnel` returns `lead_sources` array with count per source

## Stripe Payments (Added May 2026)
### Plans
| Plan key | Amount | Tier granted | Access |
|---|---|---|---|
| recruit_monthly | £9.99 | basic | 30 days |
| recruit_annual | £79 | basic | 365 days |
| scholarship_monthly | £19.99 | premium | 30 days |
| scholarship_annual | £159 | premium | 365 days |
| season_pass | £49 | premium | 120 days |

### Backend endpoints
- `POST /api/subscription/checkout` — creates Stripe checkout session
- `GET /api/subscription/checkout/status/{session_id}` — polls Stripe, activates tier on success
- `POST /api/webhook/stripe` — Stripe webhook handler (backup to polling)

### DB changes
- `users.subscription_expires_at TIMESTAMPTZ` — added by migration v6
- `payment_transactions` table — added by migration v6

### Env vars added
- `STRIPE_API_KEY` (sandbox secret key) in backend/.env
- `STRIPE_PUBLISHABLE_KEY` in backend/.env
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` in frontend/.env

### Migration required
- `/app/memory/supabase_migration_v6.sql` — run in Supabase SQL Editor

### Go-live steps (user must do)
1. Run supabase_migration_v6.sql in Supabase Dashboard → SQL Editor
2. Swap sandbox keys for live keys in backend/.env once ready to charge real money
3. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://getcourtbound.com/api/webhook/stripe`
   - Events: `checkout.session.completed`

## Landing Page Copy (Updated Feb 2026)
- Hero tagline: "Built for UK Basketball Players" (was "European Basketball Players")
- Stats grid: "300+" Colleges in our Database (was 274), "50+" UK-Friendly Programs (was 43)
- Agency comparison price: "£2,000 – £4,000+" (was £3,000 – £10,000+)
- Feature body: "over 300 US programmes" (was 274)

## Pending Migrations (User Must Run in Supabase SQL Editor)
- `/app/memory/supabase_migration_v5.sql` — adds `lead_source TEXT` to profiles table
