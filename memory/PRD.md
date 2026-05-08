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
- [x] CSV standardized headers with Image URL column (DONE May 2026)
- [x] Bulk college import: no overwrite, duplicate detection, pending approval status (DONE May 2026 — requires migration v13)
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

### Promo Codes — Discount Support (May 2026)
- Two code types: "Time Extension" (adds free days) + "% Discount at Checkout"
- Discount codes: `discount_percent` + `applicable_plan_type` (all/annual/monthly)
- Pricing page: real-time discounted price display with strikethrough original
- Admin panel: code type toggle, green badge for discount codes, orange for extension
- Promo code validated at checkout, applied to Stripe session amount, recorded post-payment
- Migrations: v12 (discount_percent, applicable_plan_type columns), extension_days NOT NULL dropped

- Admin verification queue (Coaches tab in Admin Panel) — approve/reject coaches
- Messaging system: coach → player one-way messages with NCAA compliance warnings  
- Coach notifications page (`/coach/notifications`)
- Coach sent messages page (`/coach/messages`)
- Player messages inbox (`/messages`) — read-only, mark as read
- Board upgrade: Move-between-lists and remove actions
- Double `%%` stat display bug fixed

### Phase 3 (upcoming)
- [x] Unread message badges on player nav (DONE)
- [x] Coach Onboarding Sequence (DONE — May 2026)
- [x] Player NCAA Key Dates widget on dashboard (DONE — May 2026)
- [x] Programme Public Page `/coach/program/:slug` (DONE — May 2026)
  - Backend: GET /api/coach/public/:slug (no auth), slug auto-generated from institution_name
  - Frontend: CoachProgramPage.js with header, about, recruiting needs, player CTA card
  - 404 handling for unknown slugs
- [x] Coach Analytics inline on dashboard (DONE — May 2026)
  - Backend: GET /api/coach/analytics — views (7d/30d/all-time), saves by list, top positions, top grad years, daily 14-day view trend
  - Frontend: KPI cards + recharts AreaChart + CSS bar charts at bottom of CoachDashboard
- [x] Coach Marketing/Landing Page redesign (DONE — May 2026)
  - Premium sporty dark aesthetic: gradient hero, stats ribbon (skew), numbered steps with background giant numbers, feature cards with hover glow, angular CTAs
- [x] Player Division Switcher on Profile page (DONE — May 2026)
  - Two dropdowns: "1st Choice Division" + "2nd Choice Division" (options: D1, D2, D3, NAIA, JUCO)
  - `target_division` already in DB; `target_division_2` requires migration v14
- [x] Admin Coach Verification Panel at /admin/coach-verification (DONE — May 2026)
  - Full pending queue with Overdue (>48h) badges, Approve/Reject/Request Info actions with modals
  - Stats bar: Total Pending, Overdue, Approved This Week, Rejected This Week
  - Verified Coaches directory tab (searchable)
  - Admin panel header button with live red badge (pending count)
  - Fixed /api/coach/admin/queue + PATCH endpoints to use require_admin_token dependency
- [x] Social Proof Counters (DONE — May 2026)
  - /api/coach/public/stats now returns: active_coaches, active_coaches_30d, total_verified, verified_coaches, total_programmes
  - CoachLandingPage: Live stats ribbon (Verified Coaches + US Programmes) + hero counter line
  - LandingPage (player): Live "US Coaches Recruiting on CourtBound" counter card
- [x] Google SSO for Coaches (DONE — May 2026)
  - "Continue with Google" button on CoachLoginPage + CoachRegisterPage
  - CoachAuthCallback.js handles PKCE redirect → backend linking
  - POST /api/coach/auth/google: login existing coach (token) or 404+prefill for new coach
  - Coach registration supports Google prefill (email read-only, password fields hidden)
  - Dismissible 2FA nudge banner on CoachDashboard for email/password coaches


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
- `/app/memory/supabase_migration_v14_division_second_choice.sql` — adds `target_division_2 TEXT` to profiles (DONE ✅)
- `/app/memory/supabase_migration_v15_programme_detail_fields.sql` — adds scholarship_type, nil_available, housing_type, f1_visa_support, international_players_count, scholarship_avg_value to coach_accounts (DONE ✅)
- `/app/memory/supabase_migration_v16_player_reply.sql` — adds `player_reply TEXT`, `player_replied_at TIMESTAMPTZ` to coach_messages (**MUST RUN** for player replies to save)
- `/app/memory/supabase_migration_v17_commitment_status.sql` — adds `commitment_status TEXT DEFAULT 'uncommitted'`, `committed_to_institution TEXT` to profiles (**MUST RUN** for commitment status to save)
- `/app/memory/supabase_migration_v18_coach_privacy.sql` — adds `privacy_settings JSONB DEFAULT '{}'`, `is_deleted BOOLEAN DEFAULT FALSE` to coach_accounts (**MUST RUN** for coach privacy settings to save)
- `/app/memory/supabase_migration_v19_programme_views.sql` — creates `coach_programme_views` table (**MUST RUN** for programme page view tracking)

## Phase B Features (Added May 2026)
- [x] Player Replies in Messaging — players can reply once to a coach message; coaches see reply in sent messages (requires v16)
- [x] Player Commitment Status — dropdown on player profile (Uncommitted/Soft Committed/Committed/Withdrawn) with institution field; badge on coach's player profile view (requires v17)
- [x] Coach Privacy Settings — toggles on settings page: profile_visible, hide_recruiting_prefs, hide_contact_info; programme public page respects these (requires v18)
- [x] Programme View Tracking — every `/coach/program/:slug` visit logs a row; analytics dashboard shows Programme Views KPI cards (7d, 30d) (requires v19)
