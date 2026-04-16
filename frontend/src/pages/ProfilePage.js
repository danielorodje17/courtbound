import { useState, useEffect } from "react";
import { apiRequest } from "../context/AuthContext";
import {
  User, GraduationCap, Activity, Target, Save, Edit3,
  Youtube, Instagram, Twitter, Link, CheckCircle, AlertCircle,
  ChevronDown, Ruler, Weight
} from "lucide-react";

const POSITIONS = ["Point Guard", "Shooting Guard", "Combo Guard", "Small Forward", "Power Forward", "Center"];
const HANDS = ["Right", "Left", "Both"];
const DIVISIONS = ["Division I", "Division II", "Division III", "NAIA", "JUCO"];
const YEARS = ["2025", "2026", "2027", "2028"];
const SCHOOL_YEARS = ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13", "Sixth Form", "College", "Other"];

const Section = ({ title, icon: Icon, color, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className={`px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5 ${color}`}>
      <Icon className="w-4 h-4" />
      <h2 className="font-bold text-sm tracking-wide" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </h2>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field = ({ label, children, span = 1 }) => (
  <div className={span === 2 ? "md:col-span-2" : ""}>
    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text", testId, disabled }) => (
  <input
    data-testid={testId}
    type={type}
    value={value || ""}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
  />
);

const Select = ({ value, onChange, options, testId }) => (
  <div className="relative">
    <select
      data-testid={testId}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8"
    >
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
    <p className="text-xl font-bold text-slate-900">{value || "—"}</p>
    <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
  </div>
);

export default function ProfilePage() {
  const [profile, setProfile] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tracked: 0, sent: 0, received: 0 });

  useEffect(() => {
    Promise.all([
      apiRequest("get", "/profile"),
      apiRequest("get", "/dashboard/stats")
    ]).then(([pRes, sRes]) => {
      setProfile(pRes.data || {});
      setDraft(pRes.data || {});
      setStats(sRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("put", "/profile", draft);
      setProfile(draft);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const cancel = () => { setDraft(profile); setEditing(false); };

  const p = editing ? draft : profile;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );

  const initials = (p.full_name || "DO").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const completionFields = ["full_name", "date_of_birth", "email", "height_ft", "primary_position", "current_school", "school_year", "gcse_grades", "a_level_subjects", "highlight_tape_url", "ppg", "bio"];
  const filled = completionFields.filter(f => p[f] && String(p[f]).trim()).length;
  const completion = Math.round((filled / completionFields.length) * 100);

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Player Profile</span>
          <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            My Recruitment Profile
          </h1>
          <p className="text-slate-500 mt-1">Your profile powers AI email drafts and strategy suggestions</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button data-testid="profile-cancel-btn" onClick={cancel} className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button data-testid="profile-save-btn" onClick={save} disabled={saving} className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-orange-600 transition-all disabled:opacity-60 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
              </button>
            </>
          ) : (
            <button data-testid="profile-edit-btn" onClick={() => setEditing(true)} className="bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {saved && (
        <div data-testid="profile-saved-msg" className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Profile saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT: Profile Card ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-2xl font-black text-white" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{initials}</span>
            </div>
            <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
              {p.full_name || "Your Name"}
            </h2>
            <p className="text-sm text-orange-600 font-semibold mt-0.5">
              {p.primary_position || p.position || "Position"}
              {(p.secondary_position) && (
                <span className="text-slate-400 font-normal"> / {p.secondary_position}</span>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-200">
                {p.nationality || "British"}
              </span>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
                England U18
              </span>
            </div>
            {p.current_team && (
              <p className="text-xs text-slate-400 mt-2">{p.current_team}</p>
            )}
          </div>

          {/* Profile Completion */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Profile Completion</span>
              <span className="text-sm font-bold text-orange-600">{completion}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            {completion < 100 && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Complete your profile for better AI results
              </p>
            )}
          </div>

          {/* Recruitment Stats */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recruitment Activity</h3>
            <div className="space-y-2.5">
              {[
                { label: "Colleges Tracked", val: stats.tracked_colleges ?? 0, color: "text-blue-600" },
                { label: "Emails Sent", val: stats.emails_sent ?? 0, color: "text-orange-600" },
                { label: "Responses", val: stats.emails_received ?? 0, color: "text-green-600" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{s.label}</span>
                  <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlight Tape */}
          {(p.highlight_tape_url || editing) && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" /> Highlight Tape
              </h3>
              {editing ? (
                <Input value={p.highlight_tape_url} onChange={v => set("highlight_tape_url", v)} placeholder="YouTube / Hudl link" testId="profile-highlight-url" />
              ) : (
                <a href={p.highlight_tape_url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium break-all">
                  <Link className="w-3.5 h-3.5 flex-shrink-0" />
                  {p.highlight_tape_url}
                </a>
              )}
            </div>
          )}

          {/* Social */}
          {(p.instagram || p.twitter || editing) && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Social Media</h3>
              <div className="space-y-2.5">
                {editing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      <Input value={p.instagram} onChange={v => set("instagram", v)} placeholder="@handle" testId="profile-instagram" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Twitter className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <Input value={p.twitter} onChange={v => set("twitter", v)} placeholder="@handle" testId="profile-twitter" />
                    </div>
                  </>
                ) : (
                  <>
                    {p.instagram && <div className="flex items-center gap-2 text-sm text-slate-600"><Instagram className="w-4 h-4 text-pink-500" />{p.instagram}</div>}
                    {p.twitter && <div className="flex items-center gap-2 text-sm text-slate-600"><Twitter className="w-4 h-4 text-sky-500" />{p.twitter}</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: All Sections ────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* PERSONAL INFO */}
          <Section title="Personal Information" icon={User} color="bg-slate-50 text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name">
                <Input value={p.full_name} onChange={v => set("full_name", v)} placeholder="Daniel Orodje" testId="profile-full-name" disabled={!editing} />
              </Field>
              <Field label="Date of Birth">
                <Input value={p.date_of_birth} onChange={v => set("date_of_birth", v)} type="date" testId="profile-dob" disabled={!editing} />
              </Field>
              <Field label="Nationality">
                <Input value={p.nationality} onChange={v => set("nationality", v)} placeholder="e.g. British-Nigerian" testId="profile-nationality" disabled={!editing} />
              </Field>
              <Field label="Hometown / City">
                <Input value={p.hometown} onChange={v => set("hometown", v)} placeholder="e.g. London, UK" testId="profile-hometown" disabled={!editing} />
              </Field>
              <Field label="Email Address">
                <Input value={p.email} onChange={v => set("email", v)} type="email" placeholder="your@email.com" testId="profile-email" disabled={!editing} />
              </Field>
              <Field label="Phone Number">
                <Input value={p.phone} onChange={v => set("phone", v)} placeholder="+44 7..." testId="profile-phone" disabled={!editing} />
              </Field>
              <Field label="Bio / Personal Statement" span={2}>
                {editing ? (
                  <textarea
                    data-testid="profile-bio"
                    value={p.bio || ""}
                    onChange={e => set("bio", e.target.value)}
                    rows={3}
                    placeholder="A short bio about yourself — your background, ambitions, and why you want to play in the USA..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 min-h-12">
                    {p.bio || <span className="text-slate-300 italic">Not set</span>}
                  </p>
                )}
              </Field>
            </div>
          </Section>

          {/* ATHLETIC PROFILE */}
          <Section title="Athletic Profile" icon={Activity} color="bg-orange-50 text-orange-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <Field label="Primary Position">
                {editing
                  ? <Select value={p.primary_position || p.position} onChange={v => set("primary_position", v)} options={POSITIONS} testId="profile-primary-position" />
                  : <div className="py-2.5 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-800">{p.primary_position || p.position || "—"}</div>}
              </Field>
              <Field label="Secondary Position">
                {editing
                  ? <Select value={p.secondary_position} onChange={v => set("secondary_position", v)} options={["None", ...POSITIONS]} testId="profile-secondary-position" />
                  : <div className="py-2.5 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-800">{p.secondary_position || <span className="text-slate-400 italic text-xs">Not set</span>}</div>}
              </Field>
              <Field label="Dominant Hand">
                {editing ? <Select value={p.dominant_hand} onChange={v => set("dominant_hand", v)} options={HANDS} testId="profile-hand" />
                  : <div className="py-2.5 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-800">{p.dominant_hand || "—"}</div>}
              </Field>
              <Field label="Jersey #">
                <Input value={p.jersey_number} onChange={v => set("jersey_number", v)} placeholder="#" testId="profile-jersey" disabled={!editing} />
              </Field>
              <Field label="Height (ft/in)">
                <Input value={p.height_ft} onChange={v => set("height_ft", v)} placeholder={"e.g. 6'2\""} testId="profile-height-ft" disabled={!editing} />
              </Field>
              <Field label="Height (cm)">
                <Input value={p.height_cm} onChange={v => set("height_cm", v)} placeholder="e.g. 188" testId="profile-height-cm" disabled={!editing} />
              </Field>
              <Field label="Weight (kg)">
                <Input value={p.weight_kg} onChange={v => set("weight_kg", v)} placeholder="e.g. 82" testId="profile-weight" disabled={!editing} />
              </Field>
              <Field label="Wingspan (cm)">
                <Input value={p.wingspan_cm} onChange={v => set("wingspan_cm", v)} placeholder="e.g. 195" testId="profile-wingspan" disabled={!editing} />
              </Field>
              <Field label="Years Playing">
                <Input value={p.years_playing} onChange={v => set("years_playing", v)} placeholder="e.g. 8" testId="profile-years" disabled={!editing} />
              </Field>
              <Field label="Club Team">
                <Input value={p.club_team} onChange={v => set("club_team", v)} placeholder="e.g. London Lions U18" testId="profile-club" disabled={!editing} />
              </Field>
              <Field label="National Team" span={2}>
                <Input value={p.current_team} onChange={v => set("current_team", v)} placeholder="e.g. England Under-18" testId="profile-national-team" disabled={!editing} />
              </Field>
            </div>

            {/* Stats row */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Season Statistics</p>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Points Per Game", key: "ppg", placeholder: "e.g. 18.5" },
                    { label: "Assists Per Game", key: "apg", placeholder: "e.g. 6.2" },
                    { label: "Rebounds Per Game", key: "rpg", placeholder: "e.g. 4.1" },
                    { label: "Steals Per Game", key: "spg", placeholder: "e.g. 2.0" },
                    { label: "FG%", key: "fg_percent", placeholder: "e.g. 46%" },
                    { label: "3PT%", key: "three_pt_percent", placeholder: "e.g. 38%" },
                  ].map(s => (
                    <Field key={s.key} label={s.label}>
                      <Input value={p[s.key]} onChange={v => set(s.key, v)} placeholder={s.placeholder} testId={`profile-${s.key}`} />
                    </Field>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <Stat label="PPG" value={p.ppg} />
                  <Stat label="APG" value={p.apg} />
                  <Stat label="RPG" value={p.rpg} />
                  <Stat label="SPG" value={p.spg} />
                  <Stat label="FG%" value={p.fg_percent} />
                  <Stat label="3PT%" value={p.three_pt_percent} />
                </div>
              )}
            </div>
          </Section>

          {/* ACADEMIC PROFILE */}
          <Section title="Academic Profile" icon={GraduationCap} color="bg-blue-50 text-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Current School">
                <Input value={p.current_school} onChange={v => set("current_school", v)} placeholder="e.g. Sixth Form College, London" testId="profile-school" disabled={!editing} />
              </Field>
              <Field label="Year / Form">
                {editing ? <Select value={p.school_year} onChange={v => set("school_year", v)} options={SCHOOL_YEARS} testId="profile-school-year" />
                  : <div className="py-2.5 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-800">{p.school_year || "—"}</div>}
              </Field>
              <Field label="Expected UK Graduation">
                <Input value={p.expected_graduation} onChange={v => set("expected_graduation", v)} placeholder="e.g. June 2026" testId="profile-graduation" disabled={!editing} />
              </Field>
              <Field label="Intended US Major">
                <Input value={p.intended_major} onChange={v => set("intended_major", v)} placeholder="e.g. Business, Sports Science" testId="profile-major" disabled={!editing} />
              </Field>
              <Field label="GCSE Results" span={2}>
                <Input value={p.gcse_grades} onChange={v => set("gcse_grades", v)} placeholder="e.g. English 7, Maths 6, Science 6, PE 8, History 5..." testId="profile-gcse" disabled={!editing} />
              </Field>
              <Field label="A-Level Subjects" span={2}>
                <Input value={p.a_level_subjects} onChange={v => set("a_level_subjects", v)} placeholder="e.g. PE, Business Studies, Psychology" testId="profile-alevels" disabled={!editing} />
              </Field>
              <Field label="Predicted A-Level Grades" span={2}>
                <Input value={p.predicted_grades} onChange={v => set("predicted_grades", v)} placeholder="e.g. PE: A*, Business: B, Psychology: B" testId="profile-predicted" disabled={!editing} />
              </Field>
              <Field label="SAT Score">
                <Input value={p.sat_score} onChange={v => set("sat_score", v)} placeholder="e.g. 1200 (if taken)" testId="profile-sat" disabled={!editing} />
              </Field>
              <Field label="ACT Score">
                <Input value={p.act_score} onChange={v => set("act_score", v)} placeholder="e.g. 24 (if taken)" testId="profile-act" disabled={!editing} />
              </Field>
            </div>
          </Section>

          {/* RECRUITMENT TARGETS */}
          <Section title="Recruitment Targets" icon={Target} color="bg-green-50 text-green-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Target Enrolment Year">
                {editing ? <Select value={p.target_start_year} onChange={v => set("target_start_year", v)} options={YEARS} testId="profile-target-year" />
                  : <div className="py-2.5 px-3 bg-slate-50 rounded-lg text-sm font-semibold text-slate-800">{p.target_start_year || "—"}</div>}
              </Field>
              <Field label="Target Division(s)">
                <Input value={p.target_division} onChange={v => set("target_division", v)} placeholder="e.g. Division I, Division II, NAIA" testId="profile-target-division" disabled={!editing} />
              </Field>
              <Field label="NCAA Eligibility Centre ID">
                <Input value={p.ncaa_id} onChange={v => set("ncaa_id", v)} placeholder="Your NCAA EC ID number" testId="profile-ncaa-id" disabled={!editing} />
              </Field>
              <Field label="NCAA EC Registration Status">
                {editing ? (
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                    <div
                      onClick={() => set("ncaa_registered", !p.ncaa_registered)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${p.ncaa_registered ? "bg-green-500" : "bg-slate-200"}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${p.ncaa_registered ? "translate-x-5" : ""}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{p.ncaa_registered ? "Registered" : "Not yet registered"}</span>
                  </label>
                ) : (
                  <div className="py-2.5 px-3 bg-slate-50 rounded-lg flex items-center gap-2">
                    {p.ncaa_registered
                      ? <><CheckCircle className="w-4 h-4 text-green-500" /> <span className="text-sm font-semibold text-green-700">Registered with NCAA EC</span></>
                      : <><AlertCircle className="w-4 h-4 text-orange-400" /> <span className="text-sm font-medium text-orange-600">Not yet registered</span></>
                    }
                  </div>
                )}
              </Field>
              <Field label="Highlight Tape Link" span={2}>
                <Input value={p.highlight_tape_url} onChange={v => set("highlight_tape_url", v)} placeholder="YouTube, Hudl, or FIBA link" testId="profile-tape" disabled={!editing} />
              </Field>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
