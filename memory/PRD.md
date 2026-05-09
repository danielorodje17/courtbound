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

## Phase C Features (Added May 2026)

### P0 — Board Enhancements (DONE ✅)
- [x] Table view for recruiting board — Kanban ↔ Table toggle, persisted in localStorage; sortable columns (Player, Pos, Height, Club, Grad, PPG, Match %, List)
- [x] CSV export — "Export CSV" button downloads `courtbound-recruiting-board.csv` with all player fields
- [x] PDF export — "PDF" button calls `window.print()` with print-optimised CSS (`@media print`)

### P1 — Messaging Enhancements (DONE ✅)
- [x] Committed player messaging block — Backend 403 with institution name; sticky bar shows locked "Committed" button; modal shows lock screen if somehow opened
- [x] Scheduled message send — "Schedule for later" toggle in compose modal; datetime-local picker; `POST /coach/messages/{id}` accepts `scheduled_at`; scheduler job dispatches every 15 min; filter tabs (All/Sent/Scheduled) on messages page; "Scheduled for [date]" badge on pending messages
  - Requires migration v21: `scheduled_at TIMESTAMPTZ`, `status TEXT DEFAULT 'sent'` on coach_messages
  - Backend has graceful pre-v21 fallbacks on both INSERT and SELECT

### P2 — Custom Lists (DONE ✅)
- [x] Custom list names on board — stored as JSONB `custom_lists` in `coach_accounts` (requires migration v20)
  - GET/POST/PATCH/DELETE /api/coach/custom-lists endpoints
  - Violet-styled columns in Kanban alongside default 5; violet badge in Table view
  - Rename inline (pencil icon), delete with confirmation (moves players to Watch List)
  - Up to 10 custom lists; validation blocks default list names and duplicates

### Phase E — UX Gaps (Added Feb 2026)

#### Gap 1 — Full Thread View (DONE ✅)
- [x] Slide-in thread panel on `/coach/messages` — clicking a message row opens a right-side panel
- [x] ThreadPanel shows: full coach message body, sent date + NCAA period + read status, player reply bubble (if exists) with replied date
- [x] Close on backdrop click, Escape key, or X button; "View Full Profile" button navigates to player profile
- [x] Reply teaser on message cards: italic preview + "click to expand" hint

#### Gap 2 — Message Template Library (DONE ✅)
- [x] `coach_message_templates` table (migration v23 — already run by user)
- [x] 3 default templates backfilled for all existing coaches via v23 migration
- [x] "Use Template" dropdown button in SendMessageModal — lists templates with name/subject/body preview
- [x] Clicking a template populates Subject + Body fields and closes dropdown
- [x] "Save as template" toggle reveals inline name input + Save button → POST /api/coach/messages/templates
- [x] Delete custom templates (Trash icon on hover, hidden for default templates)
- [x] Backend: GET/POST/DELETE /api/coach/messages/templates (all coaches, requires auth)

### Phase D Features (Added May 2026)

#### P0 — Quick Wins (DONE ✅)
- [x] Inline Notes on Board Cards — per-card sticky note with 300-char limit; amber edit UI; persists via PATCH /api/coach/players/{uid}/save; saves on blur or Cmd+Enter
- [x] Within-Column Card Reordering — @dnd-kit/sortable + SortableContext per column; drag handles; PATCH /api/coach/board/reorder bulk endpoint; sort_order column via migration v22

#### P1 — Advanced Player Search Filters + Bulk Message (DONE ✅)
- [x] Nationality filter — text input (ilike match) in filters panel; nationality badge on player cards
- [x] Commitment Status filter — Uncommitted/Committed/Any dropdown; "Uncommitted" quick toggle pill; "Committed" badge on cards
- [x] Active filter chips — dismissable tags for nationality, commitment, PPG, GPA, height range
- [x] URL params persistence — all filters sync to URL query string (shareable, survives page reload)
- [x] Filter count badge on Filters button
- [x] Clear All now resets URL too
- [x] Bulk Message ("Message All") — Send icon on each board column header (except Committed); BulkMessageModal with eligible/skipped count, subject + body compose, success state; POST /api/coach/messages/bulk skips committed players; routing conflict resolved (bulk before parameterized route)

#### P2 — "Who Viewed My Profile" + Programme Discovery (DONE ✅)
- [x] GET /api/player/profile-views — deduplicated by coach, sorted newest-first; returns view_count, last_viewed_at, coach details, programme_slug, is_verified
- [x] PlayerMessagesPage split into two tabs: "Messages" + "Profile Views" (with unread badge on Messages tab)
- [x] Profile view card: coach avatar, name, institution/division, Verified badge, view count, date, Programme external link
- [x] Programme Discovery (`/programmes`) — public directory page; GET /api/coach/public/programmes with search/division/sport/nil_available/f1_visa filters; quick division pills + NIL/F-1 toggle pills; URL-persisted state; individual slug route unaffected (ordering fix); "Programmes" nav item added to player nav

#### P3 — Video Reel Preview + Analytics CSV Export (DONE ✅)
- [x] VideoModal component (`/components/coach/VideoModal.js`) — parses YouTube (youtu.be/watch?v=) and Hudl (hudl.com/video/ → embed/video/) URLs; fallback external link for unsupported URLs; backdrop click to close
- [x] Reel button on player search cards (`CoachPlayersPage`) opens VideoModal with player name in header
- [x] CoachPlayerProfile inline reel section uses `getEmbedUrl()` — handles both YouTube and Hudl iframes
- [x] Analytics CSV Export — GET /api/coach/analytics/export (StreamingResponse); sections: Summary KPIs, Daily Views (14d), Saves by List, Top Positions, Top Grad Years
- [x] "Export CSV" button on dashboard analytics header — JS fetch with auth header, blob download

### P3 — Drag-and-Drop Kanban (DONE ✅)
- [x] True drag-and-drop on Kanban board using `@dnd-kit/core` (v6.3.1)
  - `useDraggable` on cards with GripVertical drag handle; `useDroppable` on columns
  - `DragOverlay` ghost card with slight rotation + blue ring while dragging
  - Optimistic update on drop with backend error revert
  - Drop zone blue ring highlight; "Drop here" placeholder in empty columns
  - `PointerSensor` (distance: 8px) + `TouchSensor` (delay: 200ms) for mouse + mobile
  - All previous board features intact (Table view, CSV, PDF, Custom Lists, color labels)
