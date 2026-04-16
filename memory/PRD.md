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

### v1.21 - Recruiting Activity Heatmap (Apr 2026)
- [x] GitHub-style activity heatmap on Dashboard — 52-week grid of email outreach activity
- [x] 3 summary stats: Emails sent (year), Active days, Current streak
- [x] Day labels (Mon/Wed/Fri), month labels, orange intensity color scale, today border highlight
- [x] Hover tooltip: date + email count
- [x] GET /api/dashboard/heatmap endpoint — 365-day dataset with week/day structure

### When ready
- [ ] Weekly Digest email (deferred — needs Resend API key from user)

### P2
- [ ] Coach profile photos
