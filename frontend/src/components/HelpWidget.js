import { useState, useMemo } from "react";
import {
  HelpCircle, X, Search, ChevronDown, ChevronRight,
  BookOpen, Mail, Target, BarChart2, Globe, User, Zap, MessageSquare
} from "lucide-react";

const SECTIONS = [
  {
    id: "getting-started",
    icon: Zap,
    title: "Getting Started",
    color: "text-orange-500",
    items: [
      {
        q: "How do I get started?",
        a: "1. Go to the Profile page and fill in your player details (position, stats, academic grades, highlight tape URL). This powers the AI email drafts.\n2. Browse colleges on the Colleges page — use filters for Division, Region, or UK Friendly.\n3. Click 'Add to My List' on any college to start tracking it.\n4. Use Compose to draft and send emails to coaches."
      },
      {
        q: "How do I set up my player profile?",
        a: "Go to Profile in the navigation. Fill in your stats (PPG, APG, RPG), academic information (GCSEs, A-Levels, predicted grades), height, position, and your Hudl or YouTube highlight tape URL. The more you fill in, the better the AI email drafts will be."
      },
      {
        q: "Where is my data stored?",
        a: "All your data is stored securely in the cloud and tied to your Google account. It is only visible to you — no other user can see your tracked colleges, emails, or goals."
      },
    ]
  },
  {
    id: "colleges",
    icon: Globe,
    title: "Finding Colleges",
    color: "text-blue-500",
    items: [
      {
        q: "How do I find colleges?",
        a: "Go to the Colleges page. You can:\n• Search by college name\n• Filter by Division (D1, D2, NAIA, JUCO)\n• Toggle the USA / Europe tab to switch regions\n• Turn on 'UK Friendly Only' to show colleges that actively recruit UK players"
      },
      {
        q: "What does 'UK Friendly' mean?",
        a: "'UK Friendly' means the college actively recruits UK and international players. They are experienced with the visa process (F-1), NCAA Eligibility Center registration, and supporting international student-athletes. These are your best-fit targets."
      },
      {
        q: "What are the European university programmes?",
        a: "CourtBound includes 31 European basketball scholarship programmes across Spain, France, Germany, Netherlands, Italy, Czech Republic, Denmark, Norway, Sweden, and Finland. Switch to the 'Europe' tab on the Colleges page to browse them. Each listing shows the scholarship type, language of instruction, and country."
      },
      {
        q: "How do I compare colleges side by side?",
        a: "On the Colleges page, click the compare icon (⊕) on up to 3 college cards to select them, then click 'Compare Selected'. This opens a side-by-side table showing Division, acceptance rate, scholarship info, UK Friendly status, and more."
      },
    ]
  },
  {
    id: "tracking",
    icon: BookOpen,
    title: "Tracking Colleges",
    color: "text-purple-500",
    items: [
      {
        q: "How do I add a college to my list?",
        a: "On the Colleges page, click the 'Add to My List' button on any college card. It will appear in 'My Colleges' on the Dashboard and in the Response Tracker. You can also add it from the college's detail page."
      },
      {
        q: "What is the progress score?",
        a: "Each tracked college gets a progress score (0–100%) based on actions you have taken: tracking (+10), sending an email (+15), getting a reply (+20), updating status (+10), setting a follow-up date (+5), completing checklist items (up to +25), and logging coach call notes (+10)."
      },
      {
        q: "How do I update my status for a college?",
        a: "Open the college's detail page (click on it from the Colleges page or Dashboard). In the right-hand sidebar, you will see a status dropdown (Interested → Contacted → Replied → Rejected → Committed). Update it as your recruitment progresses."
      },
      {
        q: "What is the checklist on the college detail page?",
        a: "Each tracked college has a 10-item recruitment checklist: sending the initial email, requesting programme info, sending highlight tape, gathering transcripts, registering with the NCAA Eligibility Center, completing SAT/ACT, submitting application, financial aid, visa, and signing the NLI. Tick items off as you complete them."
      },
      {
        q: "How do I log coach call notes?",
        a: "On the college detail page, scroll to the 'Coach Call Notes' section in the sidebar. Add a date and note for any phone or video call with a coach. These are timestamped and saved to your profile for that college."
      },
    ]
  },
  {
    id: "emails",
    icon: Mail,
    title: "Emails & Outreach",
    color: "text-green-500",
    items: [
      {
        q: "How do I draft an email to a coach?",
        a: "Go to Compose. Select the college, choose a message type (Initial Outreach, Follow-Up, Thank You, or Update), then click 'Generate AI Draft'. The AI will use your player profile to write a personalised email. You can edit the draft freely before sending."
      },
      {
        q: "How do I send an email?",
        a: "After drafting, click 'Open in Gmail'. This opens Gmail in a new tab with the coach's email, subject, and body pre-filled. Send the email from Gmail as normal. When you return to CourtBound, a confirmation card will appear — click 'Yes, Email Sent' to log it."
      },
      {
        q: "Why do I need to confirm the email was sent?",
        a: "CourtBound opens Gmail for you, but cannot detect whether you actually sent the email from Gmail. Your confirmation is what triggers: logging the email to your Sent history, marking the college as 'Contacted', and setting a 7-day follow-up reminder in Priority Actions."
      },
      {
        q: "How do I log a reply from a coach?",
        a: "Go to the Response Tracker page (or the college's detail page). There is a 'Log Reply' option where you can paste the coach's reply. This updates the college status to 'Replied' and records the communication in your log."
      },
      {
        q: "What is the Email Template Library?",
        a: "On the Compose page, you can save any draft as a reusable template. Next time you compose, select a saved template to pre-fill the subject and body. Great for building a library of successful outreach messages."
      },
    ]
  },
  {
    id: "goals",
    icon: Target,
    title: "Weekly Goals",
    color: "text-orange-500",
    items: [
      {
        q: "How do I set weekly goals?",
        a: "On the Dashboard, find the Weekly Goals widget. Click the pencil icon or 'Set This Week's Goals'. Use the +/− buttons to set targets for: Emails Sent, Follow-Ups, New Colleges Tracked, and Coach Calls. Click Save — your progress bars will update in real time throughout the week."
      },
      {
        q: "What are the suggested goals?",
        a: "CourtBound looks at your last 4 weeks of activity and suggests targets that are slightly higher (average + 1) to keep you progressing. If you are new, starter goals are shown (3 emails / 2 follow-ups / 1 college / 1 call). You can always customise them."
      },
      {
        q: "What is the achievement history?",
        a: "Expand 'Achievement History' in the Weekly Goals widget to see the last 7 weeks. Each week shows your goals vs actual numbers. Green = all goals met, amber = more than half met, red = less than half met. A great way to spot patterns in your recruiting effort."
      },
    ]
  },
  {
    id: "ai",
    icon: Zap,
    title: "AI Features",
    color: "text-amber-500",
    items: [
      {
        q: "What is the AI Match feature?",
        a: "AI Match (on the Colleges page) analyses your player profile and scores every college in the database as Excellent Fit, Good Fit, or Possible Fit. It prioritises UK Friendly colleges that match your division target and academic profile. Run it after completing your profile."
      },
      {
        q: "How does the AI email draft work?",
        a: "The AI uses your player profile (name, position, stats, grades, highlight tape URL) and the coach's details (name, college, division) to write a personalised recruitment email. It tailors the tone and content to the message type (initial outreach, follow-up, etc.)."
      },
      {
        q: "What is AI Strategy?",
        a: "On the Response Tracker page, each college has an 'AI Strategy' button. It analyses your current communication status with that college and gives you specific, actionable advice — what to do today, when to follow up, what to include, and how to stand out."
      },
    ]
  },
  {
    id: "dashboard",
    icon: BarChart2,
    title: "Dashboard",
    color: "text-slate-600",
    items: [
      {
        q: "What does the Dashboard show?",
        a: "The Dashboard is your home base. It shows: total colleges tracked, emails sent and received, Priority Actions (overdue follow-ups and deadlines), Weekly Goals progress, Weekly Digest (this week's activity summary), your tracked colleges list, and 30-day email activity charts."
      },
      {
        q: "What are Priority Actions?",
        a: "Priority Actions appear on the Dashboard when you have overdue follow-ups (follow-up date has passed) or upcoming deadlines (application/signing day within 7–30 days). They are automatically generated from the dates you set on each tracked college."
      },
      {
        q: "What is the Weekly Digest?",
        a: "The Weekly Digest gives you a snapshot of this week vs last week: emails sent (with trend arrow), coach responses received, new colleges tracked, and overdue follow-ups. It also shows your top-progress college and a recommended next action."
      },
    ]
  },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const q = search.toLowerCase();
    return SECTIONS.map(s => ({
      ...s,
      items: s.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q))
    })).filter(s => s.items.length > 0);
  }, [search]);

  const toggleItem = (key) => setExpanded(prev => prev === key ? null : key);

  return (
    <>
      {/* Floating button */}
      <button
        data-testid="help-widget-btn"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-50 w-13 h-13 rounded-full bg-slate-900 hover:bg-orange-500 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 group"
        style={{ width: "52px", height: "52px" }}
        title="Help & Support"
      >
        <HelpCircle className="w-6 h-6" />
        <span className="absolute right-14 bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Help & Support
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Panel */}
          <div
            className="absolute bottom-20 right-6 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 48px)", height: "600px" }}
            data-testid="help-panel"
          >
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-orange-400" />
                  <h2 className="font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "1.1rem" }}>
                    Help & Support
                  </h2>
                </div>
                <button
                  data-testid="help-panel-close"
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  data-testid="help-search-input"
                  type="text"
                  placeholder="Search for help..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setActiveSection(null); }}
                  className="w-full bg-slate-800 text-white placeholder-slate-400 text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Section nav pills (hidden when searching) */}
            {!search && (
              <div className="flex gap-1.5 px-4 py-3 overflow-x-auto flex-shrink-0 border-b border-slate-100 scrollbar-hide">
                {SECTIONS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(prev => prev === s.id ? null : s.id)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0 transition-colors ${activeSection === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      <Icon className={`w-3 h-3 ${s.color}`} />
                      {s.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No results for "<strong>{search}</strong>"</p>
                  <p className="text-xs text-slate-400 mt-1">Try different keywords</p>
                </div>
              ) : (
                filtered
                  .filter(s => !activeSection || s.id === activeSection)
                  .map(section => {
                    const Icon = section.icon;
                    return (
                      <div key={section.id} className="border-b border-slate-50 last:border-0">
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50">
                          <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</span>
                        </div>
                        {/* Items */}
                        {section.items.map((item, idx) => {
                          const key = `${section.id}-${idx}`;
                          const isOpen = expanded === key;
                          return (
                            <div key={key} className="border-t border-slate-50 first:border-0">
                              <button
                                data-testid={`help-item-${key}`}
                                onClick={() => toggleItem(key)}
                                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                              >
                                <span className="text-sm font-medium text-slate-800">{item.q}</span>
                                {isOpen
                                  ? <ChevronDown className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                }
                              </button>
                              {isOpen && (
                                <div className="px-5 pb-4">
                                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3.5">
                                    {item.a.split("\n").map((line, i) => (
                                      <p key={i} className={`text-xs text-slate-700 leading-relaxed ${i > 0 ? "mt-1.5" : ""}`}>{line}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
              )}

              {/* Footer */}
              <div className="px-5 py-5 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  CourtBound helps European basketball players find and secure college scholarships in the USA and Europe.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
