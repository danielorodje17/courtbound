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

### v1.9 - Highlight Tape Auto-Include (Apr 2026)
- [x] `highlight_tape_url` from player profile auto-injected into every AI email draft
- [x] ComposePage shows green "Highlight tape auto-included" indicator (with link) when tape URL is saved; orange hint if missing
- [x] CollegeDetailPage sidebar shows "Your Highlight Tape" quick-link card (or amber prompt to add one if missing)
- [x] AI prompt updated: tape link is explicitly placed in email body by the AI

---

## Prioritised Backlog

### P1
- [ ] College comparison table side-by-side

### P2
- [ ] Coach profile photos
- [x] Export CSV: one-click download of filtered email history as .csv
- [x] Export PDF: opens formatted print-ready HTML view for browser print-to-PDF
- [x] Email Template Library: save/load/delete templates in ComposePage. 'Save as Template' is optional
- [x] Coach Call Notes: timestamped call/meeting log per college in CollegeDetailPage sidebar
- [x] GET/POST /api/templates, DELETE /api/templates/{id}
- [x] POST/DELETE /api/my-colleges/{college_id}/call-note endpoints

---

## Prioritised Backlog

### P1
- [ ] College comparison table side-by-side

### P2
- [ ] Coach profile photos
- [ ] Highlight tape links on college cards (Hudl/YouTube)
- [ ] Coach notes field (quick notes after a call/meeting)
- [ ] Highlight tape links on college cards (Hudl/YouTube)
