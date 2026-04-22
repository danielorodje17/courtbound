# CourtBound - Basketball Scholarship Tracker PRD

## Problem Statement
An 18-year-old student basketball player from UK (England Under-18) wants to track US college basketball scholarship opportunities. Needs: college directory, coach contacts, AI message drafting, communication log, strategy advice, NCAA checker, player profile, and response tracking.

## App: CourtBound
**Stack:** React + TailwindCSS + shadcn/ui + FastAPI (Python) + MongoDB + OpenAI gpt-4.1-mini (Emergent LLM Key)
**Auth:** None — single-user personal tool

---

## Architecture
- **Frontend:** React + TailwindCSS + shadcn/ui (Manrope + Barlow Condensed fonts)
- **Backend:** FastAPI (Python) on port 8001
- **Database:** MongoDB (`courtbound_db`)
- **AI:** OpenAI gpt-4.1-mini via emergentintegrations library (EMERGENT_LLM_KEY)
- **Auth:** REMOVED — single-user mode, no login required

---

## Pages & Features

### Dashboard (/dashboard)
- Stats: Colleges tracked, Emails sent, Responses received, Response rate
- My Colleges list with status badges
- Recent emails sidebar
- Quick action buttons

### College Directory (/colleges)
- 90 pre-loaded US colleges (D1, D2, NAIA, JUCO)
- Search by name/location
- Filter: Division, Foreign-Friendly, State
- Track/Untrack college
- College cards with division badges, "International Friendly" badge

### College Detail (/colleges/:id)
- Hero image with location, division, conference
- Coaching staff with Email & Call buttons
- Email history per college
- My Status tracker (Interested/Contacted/Replied/Rejected) + notes
- "Get AI Strategy" button

### AI Message Composer (/compose)
- Select college + coach
- Choose message type: Initial Outreach, Follow-Up, Thank You
- Auto-fills position/stats from saved Player Profile
- AI generates personalised draft email
- Edit, copy, and save to communication log

### Communication Log (/communications)
- All emails (sent + received) with filtering
- Expandable email body view
- Delete emails
- Manual email logging form
- CSV bulk upload (preserves exact dates, auto-creates colleges)
- Bulk import same email to multiple colleges

### AI Strategy Advisor (/strategy)
- Select tracked college
- Set response status
- Last contact date
- AI generates step-by-step recruitment strategy

### NCAA Eligibility Checker (/ncaa)
- AI-powered, UK-specific eligibility assessment
- Covers academics, amateurism, registration steps
- Division recommendations (D1/D2/D3/NAIA/JUCO)

### Player Profile (/profile)
- Personal info (name, DOB, nationality, hometown, email, phone, bio)
- Athletic profile (position, height, weight, wingspan, stats: PPG/APG/RPG/SPG/FG%/3PT%)
- Academic profile (school, year, GCSE results, A-Levels, predicted grades, SAT/ACT)
- Recruitment targets (target division, NCAA EC ID, enrolment year)
- Profile completion % tracker
- Auto-fills Compose page for personalised drafts

### Response Tracker (/responses) ← NEW
- Stats: Colleges contacted, Awaiting Reply, Received Reply, Response Rate
- Filter tabs: All Contacted / Awaiting Reply / Received Reply
- "Log Reply" flow: log coach's reply text, auto-updates college status to "Replied"
- "AI Follow-up" button: analyzes coach's reply, generates tailored next-step strategy
- Reply preview per college
- Days-waiting counter with follow-up reminder (>21 days)
- "Draft Follow-up Email" shortcut to Compose page

---

## Data Models
- `colleges` - college info with coaches array
- `tracked_colleges` - user → college link (status: interested/contacted/replied/rejected)
- `emails` - communication log (sent/received, direction, subject, body)
- `profiles` - player profile (all personal/athletic/academic fields)

---

## Key API Endpoints
- `GET /api/colleges`, `GET /api/my-colleges`
- `POST /api/my-colleges`, `DELETE /api/my-colleges/{id}`, `PATCH /api/my-colleges/{id}/status`
- `GET /api/emails`, `POST /api/emails`, `DELETE /api/emails/{id}`
- `POST /api/emails/bulk` — bulk import same email to multiple colleges
- `POST /api/emails/import-csv` — CSV bulk upload
- `POST /api/emails/log-reply` — log coach reply + auto-update status to replied
- `GET /api/responses/summary` — response tracker data with email aggregates
- `POST /api/ai/draft-message` — AI email draft
- `POST /api/ai/strategy` — AI recruitment strategy
- `POST /api/ai/follow-up` — AI follow-up advice based on coach reply
- `POST /api/ai/ncaa-check` — NCAA eligibility assessment
- `GET /api/profile`, `PUT /api/profile` — player profile CRUD
- `GET /api/dashboard/stats`

---

## Implementation Log

### v1.0 - Initial MVP (Apr 2026)
- [x] Full app scaffold (React + FastAPI + MongoDB)
- [x] 90 colleges seeded (D1, D2, NAIA, JUCO)
- [x] College tracking with status management
- [x] AI email drafting (OpenAI gpt-4.1-mini)
- [x] Email communication log (single + bulk)
- [x] AI strategy generation
- [x] Responsive navigation

### v1.1 - Auth Removed + NCAA Checker (Apr 2026)
- [x] Removed JWT auth — single-user mode
- [x] NCAA Eligibility Checker (/ncaa) — UK-specific AI assessment

### v1.2 - CSV Import (Apr 2026)
- [x] CSV bulk email import (preserves dates, auto-creates colleges)
- [x] Character encoding fixes for CSV subjects

### v1.3 - Player Profile (Apr 2026)
- [x] Player Profile page with all personal/athletic/academic fields
- [x] Profile completion tracker
- [x] Profile data auto-fills Compose page

### v1.4 - Response Tracker (Apr 2026)
- [x] Response Tracker page (/responses)
- [x] Log coach replies with auto status update
- [x] AI follow-up strategy based on coach reply content
- [x] Days-waiting counter and follow-up reminders
- [x] Navigation updated with Responses link

### v1.6 - Google Auth + Multi-user + Profile Wipe Fix (Apr 2026)
- [x] Google OAuth login via Emergent-managed Google Auth
- [x] Multi-user support — each user has completely separate data (tracked colleges, emails, profile)
- [x] LoginPage.js — "Continue with Google" sign-in page with CourtBound branding
- [x] AuthCallback.js — handles OAuth redirect, exchanges session_id for httpOnly cookie
- [x] ProtectedRoute — all app routes redirect to /login when not authenticated
- [x] User menu in navbar — shows avatar, name, and sign out button
- [x] Profile wipe fix — profile save now uses merge update (only saves non-empty fields, preserves existing data)
- [x] All backend endpoints use user_id from JWT session instead of hardcoded OWNER_ID
- [x] UK / International Friendly Badge overhaul — green "UK PICK" badges on college cards, "UK / International Friendly" note in College Detail explaining why it's a good target for UK players
- [x] UK Recommended Banner on Colleges page — clickable green banner showing count, activates UK-friendly filter
- [x] Prominent "UK Friendly" filter button (replaces old checkbox)
- [x] Follow-up Scheduler — set follow-up date per college in College Detail sidebar, shown with countdown badge
- [x] Scholarship Deadline Tracker — Application Deadline + Signing Day fields per college, countdown badges (red/orange/yellow based on urgency)
- [x] Dashboard Priority Actions widget — shows overdue follow-ups (red), upcoming within 7 days (orange), deadlines within 30 days (blue) with college name and date. Clicking navigates to college detail
- [x] Dashboard green "on track" banner when no urgent actions needed
- [x] Follow-up date badges on Dashboard My Colleges list

### v1.7 - Clickable Stats, AI Match, Analytics Charts, Application Checklist (Apr 2026)
- [x] Dashboard stat cards clickable: Colleges Tracked → /colleges, Emails Sent → /communications, Responses Received → /responses
- [x] AI Match feature (/ai-match) — AI analyses player profile vs all 90+ colleges, categorises as Excellent/Good/Possible Fit with % + narrative
- [x] AI Match added to navigation bar (Sparkles icon)
- [x] Dashboard Analytics section: 14-day email activity area chart (recharts), recruitment funnel bar chart, division breakdown
- [x] College Application Checklist on College Detail page — 10-item pre-loaded checklist with progress bar, auto-saves on toggle
- [x] GET /api/ai/match, GET /api/dashboard/analytics, GET/PUT /api/checklist/{college_id} endpoints

### v1.8 - Export, Template Library, Coach Notes (Apr 2026)
- [x] Export CSV: one-click download of filtered email history as .csv
- [x] Export PDF: opens formatted print-ready HTML view for browser print-to-PDF
- [x] Email Template Library: save/load/delete templates in ComposePage. 'Save as Template' is optional
- [x] Coach Call Notes: timestamped call/meeting log per college in CollegeDetailPage sidebar
- [x] GET/POST /api/templates, DELETE /api/templates/{id}
- [x] POST/DELETE /api/my-colleges/{college_id}/call-note endpoints

### v1.9 - Highlight Tape Auto-Include (Apr 2026)
- [x] highlight_tape_url from player profile auto-injected into every AI email draft
- [x] ComposePage shows green "Highlight tape auto-included" indicator
- [x] CollegeDetailPage sidebar shows "Your Highlight Tape" quick-link card

### v1.10 - College Comparison Table (Apr 2026)
- [x] Compare toggle on every college card — select up to 3 colleges
- [x] Sticky comparison bar: Clear + "Compare →" button
- [x] /compare page: side-by-side table with 10 rows (Division, Location, Conference, UK Friendly, Acceptance Rate, Ranking, Scholarship, Coaches, Your Status, Website)
- [x] Best-value highlighting: top division highlighted orange, most selective acceptance rate highlighted blue
- [x] GET /api/colleges/compare?ids=... endpoint (auth-protected)

### v1.11 - Recruitment Progress Score (Apr 2026)
- [x] Progress score (0-100%) calculated per tracked college in GET /api/my-colleges
- [x] Scoring: tracked(10) + email sent(15) + status advanced(10) + replied(20) + follow-up set(5) + deadline set(5) + call notes(10) + checklist ≥50%(15) + checklist 100%(+10)
- [x] CollegesPage: colored badge pill on tracked college card images
- [x] Dashboard My Colleges: thin animated progress bar below each list item
- [x] CollegeDetailPage sidebar: SVG ring gauge + status label + contextual improvement tip

### v1.12 - Intentional Tracking UX (Apr 2026)
- [x] CollegesPage: small icon button → full-width "Add to My List" / "Tracking ✓" button per card
- [x] CollegeDetailPage sidebar: prominent "Track This College" card with explanation when not yet tracked
- [x] CollegeDetailPage header: button relabeled "Add to My List" with shadow when untracked
- [x] All sidebar features (status, progress score, checklist, call notes) only shown when tracking

### v1.13 - European Scholarship Programmes + Weekly Digest (Apr 2026)
- [x] 31 European colleges seeded: Spain, France, Germany, Netherlands, Italy, Czech Republic, Denmark, Norway, Sweden, Finland
- [x] EU colleges include: region, country, language_of_study, scholarship_type fields
- [x] GET /colleges projection updated to return all 4 European fields
- [x] Auto-seeds European colleges on startup (_seed_european_colleges_startup)
- [x] CollegesPage Region filter: USA / Europe tabs, EU cards show Country + Language + Scholarship Type
- [x] CollegeDetailPage: European info panel (Country, Language of Study, Scholarship Type)
- [x] In-app Weekly Digest widget on Dashboard: emails sent (vs last week trend), responses in, new colleges tracked, overdue count, top progress college, recommended action CTA
- [x] GET /api/dashboard/weekly-digest endpoint

### v1.14 - Weekly Goals + 8-Week Achievement History (Apr 2026)
- [x] WeeklyGoalsWidget component on Dashboard (below stat cards)
- [x] 4 trackable metrics: Emails Sent, Follow-Ups, New Colleges, Coach Calls
- [x] Set Goals modal: +/- stepper inputs, save/cancel
- [x] Live progress bars updating from real DB data (email counts, tracked colleges, call notes)
- [x] Follow-up tracking: emails now store message_type in DB
- [x] 8-week achievement history (expandable): shows each week's progress vs goals, colour-coded achievement % (green=100%, amber=50-99%, red=<50%)
- [x] GET /api/goals/current, PUT /api/goals/current, GET /api/goals/history endpoints

### v1.15 - Smart Goal Suggestions (Apr 2026)
- [x] GET /api/goals/current now returns `suggestions` (avg of last 4 weeks + 1 nudge) and `has_history` flag
- [x] Default suggestions when no history: emails_sent=3, follow_ups=2, new_tracks=1, calls=1
- [x] Empty state: suggestion preview chips per metric + "Use Suggestions" one-click save + "Customise" to open modal
- [x] Modal: "Apply all" banner button + per-metric sparkle chip to fill individual inputs
- [x] Modal auto-pre-fills with suggestions when no goals are set yet
- [x] Active goals view: inline sparkle hint shows if suggestion exceeds current goal

---

### v1.16 - Open in Gmail + Auto Follow-Up (Apr 2026)
- [x] "Open in Gmail" button on ComposePage — opens Gmail compose in new tab with coach email, subject, body pre-filled
- [x] On click: logs email (POST /api/emails), auto-tracks college if not tracked, sets status=contacted + follow_up_date=today+7
- [x] Success banner confirms: "[College] marked as Contacted with follow-up reminder set for 7 days"
### v1.37 - Email Verified Migration Fix (Feb 2026)
- [x] Added `_stamp_verified_coaches()` startup migration in server.py: runs on every boot, idempotent, stamps `last_verified: "2026-04-22"` on any coach missing the field — fixes deployed databases that were seeded without verification dates
- [x] Root cause: previous agent stamped preview DB via one-off Python script but deployed DB was seeded fresh from seed_data.py (no last_verified). Migration now handles both on startup.

### v1.36 - Closed Tab in Response Tracker (Feb 2026)
- [x] Added "CLOSED" filter tab next to "RECEIVED REPLY" in Responses page — matches user screenshot request
- [x] Closed tab shows all colleges with reply_outcome="closed" in the main list view (with opacity styling and Reopen button)
- [x] Clicking Reopen moves college back to "Received Reply" view (resets reply_outcome to no_interest)
- [x] Compose button hidden for closed colleges
- [x] Removed old collapsible closed section at page bottom — replaced by proper tab
- [x] "All Contacted" tab count now uses active.length (excludes closed, consistent with displayed list)

### v1.35 - Email Verified Filter Fix + College Import Removal (Feb 2026)
- [x] Fixed "Email Verified" filter: verifiedOnly and foreignOnly now override trackedOnly — clicking "Email Verified" from the tracked pipeline view correctly shows all 273 verified colleges
- [x] Fixed race-condition flash: removed direct setColleges(data) call in fetchAllColleges so filters always apply consistently via applyFilters
- [x] Added `tracked` to applyFilters useEffect dependency array (was missing, could cause stale filter on tracked view)
- [x] Removed user ability to import/create colleges via CSV: import-csv endpoint now skips unknown colleges (admin-only function)
- [x] Updated CSV import UI to reflect new behaviour (no more "colleges added automatically" copy)

### v1.18 - Help & Support Widget (Apr 2026)
- [x] Floating `?` button fixed bottom-right, visible on every page
- [x] Opens a 600px panel with searchable FAQ (27 questions across 7 sections)
- [x] Sections: Getting Started, Finding Colleges, Tracking Colleges, Emails & Outreach, Weekly Goals, AI Features, Dashboard
- [x] Search filters questions in real time; section nav pills for quick browsing
## Backlog

### Coach Profile Photos (P2)
- [ ] Show coach images on College Detail page

### Refactoring
- [x] server.py split into modular FastAPI routers (v1.17, Apr 2026):
  - database.py, auth_utils.py, models.py, seed_data.py
  - routers/auth.py, colleges.py, tracked.py, emails.py, dashboard.py, goals.py, ai.py, profile.py
  - server.py reduced from 1,823 lines to 56-line entry point

### v1.19 - European College Email Update + Contact Tips (Apr 2026)
- [x] Researched & verified real contact emails for all 31 European colleges/clubs via web search
- [x] Updated MongoDB coaches arrays with verified emails (club primary + university secondary where available)
- [x] Updated seed_data.py EUROPEAN_COLLEGES list so future re-seeds use correct emails
- [x] 18 colleges now have 2 contacts (club + university/academy); 13 have 1 verified contact
- Notable updates: INSEP→international@insep.fr, ALBA→info@albaberlin.de, ERA Nymburk→team@nymburk.basketball, Olimpia→olimpia@olimpiamilano.com, Bakken Bears→info@bakkenbears.com, Torpan Pojat→info@topo.fi
- [x] European Contact Tips panel added to CollegeDetailPage — shows only for European colleges, with 4 actionable tips (admin inboxes, short emails, Player Profile reference, follow-up timing) + "Draft AI Email" shortcut button

### v1.20 - Euro Friendly Audit + D2/NAIA/JUCO Expansion (Apr 2026)
- [x] Removed Euro Friendly badge from 34 colleges (14 DII, 13 NAIA, 6 JUCO) — rural/isolated/religious schools with no international infrastructure
- [x] Added 50 new colleges: 18 Division II, 17 NAIA, 15 JUCO
- [x] Grand total: 274 colleges (55 D1, 74 DII, 53 NAIA, 48 JUCO, 43 European)
- [x] Synced all changes to seed_data.py (foreign_friendly flags + new college entries)
- [x] Cleanup script: /app/backend/euro_audit_and_expand.py (executed, data persisted)

### v1.27 - Landing Page Redesign (Apr 2026)
- [x] Full rewrite based on user's conversion copy
- [x] Hero: "The System That Gets You Replies From US College Coaches" + pain point line
- [x] Process bar: Build Profile → AI Matching → Send Outreach → Get Replies → Land Offers
- [x] Social proof section with real testimonial quotes
- [x] Why athletes fail (4-point problem list + fix statement)
- [x] Stats grid: 274 colleges, 43 Euro-friendly, 7 email types, 5min to first match
- [x] Features in plain English (4 cards)
- [x] Agency comparison: £3,000-£10,000+ vs CourtBound
- [x] Real story section (built by a UK parent)
- [x] Final CTA: "Start Free Trial"

### v1.26 - Landing Page + Onboarding Flow (Apr 2026)
- [x] LandingPage.js — dark basketball arena hero, ticker bar, feature bento grid, how-it-works 3 steps, final CTA. Shown at `/` for unauthenticated users
- [x] OnboardingPage.js — 4-step split-screen wizard (left: changing image, right: form). Step 1: name/positions, Step 2: stats/teams/tape, Step 3: academics/goals, Step 4: auto-runs AI match and shows 3 matched colleges as the "aha moment"
- [x] First-time user detection: checks localStorage + profile API; new users redirected to `/onboarding` after Google login
- [x] Existing users land directly on Dashboard (no disruption)

### v1.25 - AI Recruitment Intelligence (Apr 2026)
- [x] GET /api/ai/profile-review — returns score (0-100), grade, 3 strengths, 3 prioritised improvements, 10-item coaches checklist, response insights, top 3 actions. Retry on JSON parse failure
- [x] POST /api/ai/reply-next-steps — given reply + outcome, returns urgency (immediate/soon/low), headline, 3 numbered steps, what-to-avoid list, UK player tip
- [x] RecruitmentScore.js component on ProfilePage — SVG score gauge, grade, top-priority actions panel, strengths/improvements side-by-side, response insights, collapsible coaches checklist with progress bar
- [x] ResponseTrackerPage — "AI Next Steps" button on ALL replied colleges (replaces outcome-specific buttons); modal shows urgency banner, numbered steps, avoid list, UK tip, compose shortcut

### v1.24 - Primary & Secondary Position (Apr 2026)
- [x] ProfilePage: "Position" split into "Primary Position" + "Secondary Position" dropdowns; sidebar card shows both (e.g. "Point Guard / Shooting Guard")
- [x] ComposePage: two position selectors; secondary is optional with a hint note; both passed to AI draft API
- [x] AI email draft: position line becomes "Point Guard / Shooting Guard (versatile, can play both)" — positional versatility highlighted as a selling point
- [x] AI match prompt: uses primary_position with secondary_position fallback; shown as combined string to LLM
- [x] Backward compat: existing profiles with only `position` field still load/display correctly

### v1.23 - Reality Check Labels on AI Match Cards (Apr 2026)
- [x] Added plain-English badge alongside match %: Strong Target (82-86%), Good Target (72-79%), Realistic Reach (63-71%), Worth Trying (50-62%), Long Shot (40-49%), Ambitious (30-39%)
- [x] Legend shown on intro/empty state so users understand labels before running analysis

### v1.22 - AI Match Score Tightening (Apr 2026)
- [x] Lowered score bands: excellent_fit 72-86% (was 88-100%), good_fit 50-71% (was 65-87%), possible_fit 30-49% (was 45-64%)
- [x] Added explicit prompt guardrails: never exceed 86%, be conservative, note one real challenge in each "why" field
- [x] Frontend safety clamp: `Math.min(pct, 86)` on CollegeCard
- [x] Updated page description to show honest score ranges (72-86%, 50-71%, 30-49%)

### v1.21 - Recruiting Activity Heatmap (Apr 2026)
- [x] GitHub-style activity heatmap on Dashboard — 52-week grid of email outreach activity
- [x] 3 summary stats: Emails sent (year), Active days, Current streak
- [x] Day labels (Mon/Wed/Fri), month labels, orange intensity color scale, today border highlight
- [x] Hover tooltip: date + email count
- [x] GET /api/dashboard/heatmap endpoint — 365-day dataset with week/day structure

### v1.34 - Admin User Detail + College Report System (Feb 2026)
- [x] Admin 3-tab dashboard: Overview, Users (with View button per row), Reports
- [x] Admin user detail page /admin/users/:userId — profile card, 5 stat pills (emails sent, replies, reply rate, colleges tracked, positive outcomes), Copy Promo Summary button, Activity Timeline tab, All Colleges tab
- [x] College detail: flag icon on every coach card opens Report Issue modal (issue type, correct info, notes)
- [x] Backend: POST /reports/college, GET /reports/my, GET /notifications, POST /notifications/read-all
- [x] Admin: GET /admin/reports, PATCH /admin/reports/{id} — update status + send user notification
- [x] Notification bell in main nav with red unread dot + dropdown showing admin responses

### v1.33 - Admin Dashboard with Separate Login (Feb 2026)
- [x] Separate admin login at /admin/login — email + password form (dark theme, no Google OAuth)
- [x] Admin credentials validated against ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env
- [x] Admin session stored in MongoDB `admin_sessions` collection with 24h expiry
- [x] Admin dashboard at /admin: 4 stat cards, signup trend chart, subscription breakdown, email activity chart, top 10 colleges, full users table
- [x] Tier management: change users between Free / Pro / Elite from the users table
- [x] Logout button clears admin session from DB + localStorage
- [x] Auth tracking: `created_at` (first login) and `last_active` (every login) on all users

### v1.32 - Stats Preview Card on Compose Page (Feb 2026)
- [x] Compact preview card above "Generate Draft" button shows all 3 stat contexts (College/School, Academy/Club, Country/National) with colour-coded dots — only renders when at least one context has data
- [x] Each row shows only the stats the player has filled in — no empty/zero clutter

### v1.31 - All 3 Stats Contexts in AI Emails (Feb 2026)
- [x] ComposePage auto-populates stats field from all 3 profile contexts: College/School, Academy/Club, Country/National — each on its own line
- [x] Falls back to legacy ppg/apg/rpg if new fields are empty; also appends National Team + Club names
- [x] AI draft prompt updated to instruct model to weave the most impressive numbers naturally rather than listing them as a table
- [x] Removed hardcoded "England U18 Player" / "England Under-18" from subject lines and user_name defaults in ComposePage

### v1.30 - Per-Competition Stats on Profile + Model Defaults Fix (Feb 2026)
- [x] Athletic Profile: 3 separate stat blocks (College/School Team, Academy/Club, Country/National) each with PPG/APG/RPG/SPG/FG%/3PT%
- [x] New DB fields: college_ppg/apg/rpg/spg/fg_percent/three_pt_percent, academy_*, country_*
- [x] AI prompts (profile review, AI match) use all 3 stat contexts with graceful fallback to legacy fields
- [x] PlayerProfile model defaults cleared: full_name, nationality, current_team, target_division etc no longer hardcoded to specific user's data
- [x] Profile sidebar badges only show nationality/current_team when user has actually set them

### v1.29 - AI Assumption Fixes + Onboarding Step 4 Removed (Feb 2026)
- [x] Removed hardcoded "England Under-18" from all AI prompts (match, profile review, ncaa check, strategy, email draft) — now uses player's actual `current_team` / `club_team` fields from profile
- [x] AI email draft changed from "UK basketball player" to "international basketball player" — no nationality assumed
- [x] College cards: removed "% accept" display for US colleges — no more confusing acceptance rate %
- [x] Onboarding Step 4 ("Your First Matches / AI is scanning...") removed — wizard now 3 steps, saves profile and goes to dashboard on step 3
- [x] College cards (CollegesPage) use deterministic hash-based images from 20-image pool — no more repeated stock images
- [x] College detail hero images also use same pool — each college always shows its own unique image
- [x] Coach cards on CollegeDetailPage show colored initials avatars (e.g. "JD" circle) — color deterministic by name hash
- [x] Onboarding redirect applies to ALL protected routes (not just /dashboard) — new users forced through /onboarding on any page

### When ready
- [ ] Weekly Digest email (deferred — needs Resend API key from user)

### P2
- [ ] Stats Counter on Landing Page (social proof: "412 coaches contacted this month")
- [ ] Important Deadlines / Calendar alerts on Dashboard

### Post-Trial: Women's Basketball (Option B — Separate College List)
- [ ] Separate seeded college list for women's programmes (own coaches, emails, contacts)
- [ ] Player profile "Programme" field: Men's / Women's
- [ ] College directory filters by programme type
- [ ] Admin Colleges tab shows programme column with Men/Women tag
- [ ] AI email prompts adapt language/tone for women's outreach
- [ ] Same tracking, compose, heatmap, admin tools work for both — no structural change needed
