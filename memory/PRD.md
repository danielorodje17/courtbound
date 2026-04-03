# CourtBound - Basketball Scholarship Tracker PRD

## Problem Statement
An 18-year-old student basketball player from UK (England Under-18) wants to track US college basketball scholarship opportunities. Needs: college directory, coach contacts, AI message drafting, communication log, and strategy advice.

## App: CourtBound
**URL:** https://b-ball-pathway.preview.emergentagent.com

---

## Architecture
- **Frontend:** React + TailwindCSS + shadcn/ui (Manrope + Barlow Condensed fonts)
- **Backend:** FastAPI (Python) on port 8001
- **Database:** MongoDB (`courtbound_db`)
- **AI:** OpenAI gpt-4.1-mini via emergentintegrations library (EMERGENT_LLM_KEY)
- **Auth:** JWT (httpOnly cookies + localStorage fallback), bcrypt passwords

---

## Pages & Features Implemented

### Authentication
- Login / Register split-screen page with basketball hero image
- JWT tokens (access: 60min, refresh: 7 days)
- Brute force protection (5 attempts → 15min lockout)
- Admin seeded: admin@courtbound.com / admin123

### Dashboard
- Stats: Colleges tracked, Emails sent, Responses received, Response rate
- My Colleges list (tracked colleges with status badges)
- Recent emails sidebar
- Quick action buttons (Find Colleges, Draft Email, Strategy)

### College Directory (/colleges)
- 25 pre-loaded US colleges with full details
- Search by name/location
- Filter: Division (I/II/III), Foreign-Friendly, State
- Track/Untrack college with one click
- College cards with images, division badges, "International Friendly" badge

### College Detail (/colleges/:id)
- Hero image with location, division, conference
- Scholarship info & notable alumni
- Coaching staff with Email & Call buttons
- Email history per college
- My Status tracker (Interested/Contacted/Replied/Rejected) + notes
- "Get AI Strategy" button

### AI Message Composer (/compose)
- Select college + coach
- Choose message type: Initial Outreach, Follow-Up, Thank You
- Position & stats input
- AI generates personalised draft email
- Edit, copy, and save to communication log

### Communication Log (/communications)
- All emails (sent + received) with filtering
- Expandable email body view
- Delete emails
- Manual email logging form
- Filter by college, direction (sent/received), search

### AI Strategy Advisor (/strategy)
- Select tracked college
- Set response status (No Response / Replied / Showing Interest)
- Last contact date
- AI generates specific step-by-step recruitment strategy
- Strategy history (last 5 generated)
- Quick tips panel

---

## Data Models
- `users` - email, name, password_hash, role
- `colleges` - full college info with coaches array
- `tracked_colleges` - user → college link with status & notes
- `emails` - communication log (sent/received)
- `login_attempts` - brute force protection

---

## Implementation Date: April 2026

## What's Working
- [x] Full auth flow (register/login/logout)
- [x] 25 colleges pre-seeded (15 Division I, foreign-friendly highlighted)
- [x] College tracking with status management
- [x] AI email drafting (OpenAI gpt-4.1-mini)
- [x] Email communication log
- [x] AI strategy generation
- [x] Responsive navigation

---

## Update: April 2026 - v1.1
- Removed login/authentication — single-user mode (no login screen)
- Added NCAA Eligibility Checker (/ncaa) — AI-powered, UK-specific, covers academics/amateurism/deadlines
- "ENGLAND U18" badge added to top nav

## Prioritised Backlog

### P0 (Critical - core functionality)
- All implemented ✅

### P1 (High value)
- [ ] Highlight tape / video link storage per college
- [ ] Reminder system for follow-ups (e.g. "Follow up with Duke in 3 days")
- [ ] Export communication history to PDF/CSV
- [ ] Email template library (save favourite drafts)

### P2 (Nice to have)
- [ ] Scholarship deadline tracker per college
- [ ] College comparison table
- [ ] Coach profile photos
- [ ] Application checklist per college (SAT scores, visa, academic transcripts)
- [ ] NCAA eligibility tracker

---

## Test Credentials
- Admin: admin@courtbound.com / admin123
- Test User: testplayer2026@test.com / test1234
