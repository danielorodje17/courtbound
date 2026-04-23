import os
import uuid
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from supabase_db import supa
from auth_utils import UserModel, get_current_user
from models import AIMessageRequest, AIStrategyRequest, NCAACHeckRequest, FollowUpRequest, ReplyNextStepsRequest

router = APIRouter(tags=["ai"])


@router.post("/ai/draft-message")
async def draft_message(data: AIMessageRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    type_map = {
        "initial_outreach":  "initial scholarship inquiry",
        "follow_up":         "follow-up after no response to an initial email",
        "second_follow_up":  "second follow-up after still no response — polite, brief, shows continued interest",
        "reply_to_interest": "reply to a coach who has expressed genuine interest in the player — enthusiastic, builds on their interest, proposes next steps",
        "reply_to_offer":    "reply to a formal scholarship offer — grateful and professional, asks key questions about the offer terms, timeline and next steps",
        "after_call":        "thank you email written SPECIFICALLY after a phone or video call with the coach — must reference that a call just took place, recap key points discussed on the call, and confirm any agreed next steps",
        "after_visit":       "thank you email written SPECIFICALLY after a campus visit — must reference that the player recently visited the campus, mention genuine impressions of the facilities and the programme, and confirm enthusiasm for the school",
        "thank_you":         "thank you after a call or visit",
        "no_interest":       "gracious, professional reply to a college coach who has expressed no interest — thank them for their time, keep the door open for future consideration, and leave a positive lasting impression",
    }
    msg_type_label = type_map.get(data.message_type, data.message_type)
    highlight_section = f"\n\nHighlight Tape: {data.highlight_tape_url}" if data.highlight_tape_url else ""
    position_line = data.user_position
    if data.user_secondary_position:
        position_line = f"{data.user_position} / {data.user_secondary_position} (versatile, can play both)"

    context_types = {"second_follow_up", "reply_to_interest", "reply_to_offer", "after_call", "after_visit", "no_interest"}
    reply_section = ""
    if data.message_type in context_types:
        if data.college_reply_body:
            reply_section = f"\n\nCOLLEGE'S REPLY (most recent message from the coach — the drafted email MUST directly respond to this):\n\"{data.college_reply_body}\""
        elif data.college_reply_outcome:
            outcome_labels = {
                "interested": "The coach expressed interest in the player",
                "call_requested": "The coach requested a phone/video call",
                "scholarship_offered": "The college has offered a scholarship",
                "after_call": "A call has already taken place between the player and coach",
                "after_visit": "The player has visited the campus",
                "no_interest": "The college has expressed no interest in recruiting the player",
                "second_follow_up": "No response yet after an initial follow-up",
            }
            outcome_desc = outcome_labels.get(data.college_reply_outcome, data.college_reply_outcome)
            reply_section = f"\n\nCOLLEGE STATUS: {outcome_desc}. The drafted email must be fully consistent with this context."

    prompt = f"""Write a professional {msg_type_label} email from an international basketball player to a college coach.

Player: {data.user_name}
Position: {position_line}
Statistics across competition levels:
{data.user_stats or 'Not specified'}
Contact: {data.user_email or 'N/A'} | {data.user_phone or 'N/A'}{highlight_section}

College: {data.college_name} ({data.division})
Coach: {data.coach_name}{reply_section}

Write a compelling, personalised email. Reference the specific college and division.{' The email must directly acknowledge and respond to the college reply shown above — do not ignore it.' if reply_section else ''} If multiple stat contexts are provided (College/School, Academy/Club, Country/National), weave the most impressive numbers naturally into the email — do not list them as a table. If the player has a secondary position, mention their positional versatility. Keep it under 300 words.
Format: Subject: [subject line]\\n\\n[email body]"""
    chat = LlmChat(
        api_key=api_key, session_id=str(uuid.uuid4()),
        system_message="You are an expert college basketball recruitment advisor helping UK players write compelling emails to US college coaches."
    ).with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    subject, body = "", response
    if response.startswith("Subject:"):
        lines = response.split("\n", 2)
        subject = lines[0].replace("Subject:", "").strip()
        body = "\n".join(lines[2:]).strip() if len(lines) > 2 else response
    return {"draft": body, "subject": subject, "message_type": data.message_type}


@router.post("/ai/strategy")
async def get_strategy(data: AIStrategyRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    prompt = f"""You are an expert college basketball recruitment strategist helping a player get a US college scholarship.

Provide specific, actionable recruitment strategy advice for:
- College: {data.college_name}
- Coach: {data.coach_name}
- Last Contact: {data.last_contact_date or 'Not yet contacted'}
- Response Status: {data.response_status}

Give:
1. Immediate next action (what to do TODAY)
2. Follow-up timeline (specific dates/intervals)
3. Content suggestions (what to include in next communication)
4. Alternative approaches if no response
5. Red flags to avoid
6. Tips specific to UK/international players approaching US coaches

Format as clear numbered action items. Be specific and practical."""
    chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an expert college basketball recruitment strategist.").with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    return {"strategy": response, "college": data.college_name}


@router.post("/ai/ncaa-check")
async def ncaa_eligibility_check(data: NCAACHeckRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    prompt = f"""You are an NCAA eligibility expert specifically helping an international basketball player understand their eligibility status for US college basketball.

Analyse the following profile and provide a detailed NCAA eligibility assessment:

ACADEMIC PROFILE:
- GCSE Grades: {data.gcse_grades or 'Not specified'}
- A-Level / Predicted Grades: {data.a_level_grades or data.predicted_grades or 'Not specified'}
- Core academic subjects completed: {data.core_subjects_completed}

ATHLETIC PROFILE:
- Competitive level: {data.competitive_level}
- Years playing organised basketball: {data.years_played}
- Club team participation: {data.has_club_team}
- Ever paid to play: {data.paid_to_play}

AMATEURISM STATUS:
- Received award money for sport: {data.received_award_money}
- Played on a professional contract: {data.played_on_pro_contract}
- Has had agent representation: {data.agent_representation}
- Monetised social media related to sport: {data.social_media_monetised}

Please provide:
1. **OVERALL ELIGIBILITY STATUS** - Likely Eligible / Needs Review / At Risk (with confidence level)
2. **ACADEMIC ELIGIBILITY** - How UK qualifications (GCSEs, A-Levels) convert for NCAA requirements
3. **AMATEURISM STATUS** - Any red flags or concerns
4. **NCAA ELIGIBILITY CENTER** - Exact steps to register at eligibilitycenter.org
5. **DIVISION RECOMMENDATIONS** - Which NCAA Division best suits this profile
6. **NAIA OPTION** - Whether NAIA schools could be a great alternative
7. **IMMEDIATE ACTION ITEMS** - Numbered list in priority order
8. **TIMELINE** - Key deadlines and when to start the eligibility process"""
    chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an NCAA eligibility expert for international student athletes.").with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    return {"assessment": response}


@router.post("/ai/follow-up")
async def generate_follow_up(data: FollowUpRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    prompt = f"""You are an expert college basketball recruitment advisor helping an 18-year-old UK player respond to a coach's reply.

Coach Reply from {data.college_name} (Coach: {data.coach_name}):
"{data.reply_content}"

Original Subject: {data.original_subject or 'Basketball Scholarship Inquiry'}

Provide:
1. **SENTIMENT ANALYSIS** - Is this positive, neutral, or a polite rejection? (1-2 sentences)
2. **RECOMMENDED ACTION** - Exactly what to do next (specific and actionable)
3. **REPLY TIMING** - When to respond and urgency level
4. **KEY POINTS TO INCLUDE** - 3-4 bullet points for your response
5. **THINGS TO AVOID** - Common mistakes UK players make when replying to US coaches
6. **QUICK WIN** - One thing you can do RIGHT NOW to strengthen your position

Be specific for UK/international players. Encouraging but realistic."""
    chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an expert college basketball recruitment advisor.").with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    return {"suggestion": response, "college": data.college_name}


@router.post("/ai/reply-next-steps")
async def reply_next_steps(data: ReplyNextStepsRequest, current_user: UserModel = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    outcome_context = {
        "interested":          "The coach has expressed genuine interest in the player",
        "schedule_call":       "The coach has requested a call or campus visit — this is a strong signal",
        "scholarship_offered": "The coach has made a formal scholarship offer — critical decision point",
        "rejected":            "The coach has politely declined — not interested at this time",
    }.get(data.outcome or "", "The outcome of this reply is unclear and needs your assessment")
    prompt = f"""You are a college basketball recruitment advisor for an international player.

CONTEXT:
- College: {data.college_name} ({data.division})
- Coach: {data.coach_name}
- Outcome: {outcome_context}
- Coach's reply: "{data.reply_body[:500] if data.reply_body else 'No reply text provided'}"

Provide structured, specific next steps. Return ONLY valid JSON:
{{
  "urgency": "<immediate|soon|low>",
  "urgency_label": "<e.g. Reply within 24 hours>",
  "urgency_colour": "<red|orange|green>",
  "headline": "<One punchy sentence summarising the situation and opportunity>",
  "next_steps": [
    {{"step": 1, "action": "<short action title>", "detail": "<specific advice 1-2 sentences>"}},
    {{"step": 2, "action": "<short action title>", "detail": "<specific advice>"}},
    {{"step": 3, "action": "<short action title>", "detail": "<specific advice>"}}
  ],
  "what_to_avoid": ["<common mistake 1>", "<common mistake 2>"],
  "uk_player_tip": "<One specific tip for UK/European players in exactly this situation>"
}}"""
    chat = LlmChat(
        api_key=api_key, session_id=str(uuid.uuid4()),
        system_message="You are a college basketball recruitment advisor. Return only valid JSON."
    ).with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        return json.loads(json_match.group()) if json_match else json.loads(response)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not parse AI response. Please try again.")


@router.get("/ai/profile-review")
async def ai_profile_review(current_user: UserModel = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")

    profile_r = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", current_user.user_id).execute()
    )
    if not profile_r.data:
        raise HTTPException(status_code=400, detail="Please complete your player profile first")
    profile = profile_r.data[0]

    emails_r = await run_in_threadpool(
        lambda: supa.table("emails").select("direction,college_id").eq("user_id", current_user.user_id).execute()
    )
    emails = emails_r.data or []
    sent_ids = list({e["college_id"] for e in emails if e.get("direction") == "sent"})
    replied_ids = list({e["college_id"] for e in emails if e.get("direction") == "received"})

    response_context = ""
    if replied_ids:
        resp_r = await run_in_threadpool(
            lambda: supa.table("colleges").select("name,division").in_("id", replied_ids[:10]).execute()
        )
        names = [f"{c['name']} ({c.get('division','')})" for c in (resp_r.data or [])]
        response_context = f"\nColleges that replied: {', '.join(names)}"

    primary_pos = profile.get("primary_position") or profile.get("position", "Not set")
    secondary_pos = profile.get("secondary_position", "")
    position = f"{primary_pos} / {secondary_pos}" if secondary_pos and secondary_pos != "None" else primary_pos
    p = profile

    def stat_line(prefix):
        fields = [
            (f"{prefix}_ppg", "PPG"), (f"{prefix}_apg", "APG"), (f"{prefix}_rpg", "RPG"),
            (f"{prefix}_spg", "SPG"), (f"{prefix}_fg_percent", "FG%"), (f"{prefix}_three_pt_percent", "3PT%"),
        ]
        set_vals = [(lbl, p.get(key, "")) for key, lbl in fields if p.get(key)]
        return " | ".join(f"{lbl} {v}" for lbl, v in set_vals) if set_vals else "Not set"

    profile_text = f"""
Name: {p.get('full_name', 'Not set')}
Position: {position}
Height: {p.get('height_ft', 'Not set')} / {p.get('height_cm', 'Not set')}cm | Weight: {p.get('weight_kg', 'Not set')}kg | Wingspan: {p.get('wingspan_cm', 'Not set')}cm
College/School Stats: {stat_line('college')}
Academy/Club Stats: {stat_line('academy')}
National Team Stats: {stat_line('country')}
National Team: {p.get('current_team', 'Not set')} | Club Team: {p.get('club_team', 'Not set')}
Highlight Tape: {'SET — ' + p['highlight_tape_url'] if p.get('highlight_tape_url') else 'NOT SET — critical missing item'}
Bio: {'Set (' + str(len(p.get('bio',''))) + ' chars)' if p.get('bio') else 'Not set'}
Academic — GCSEs: {p.get('gcse_grades', 'Not set')}
Academic — A-Levels: {p.get('a_level_subjects', 'Not set')} | Predicted: {p.get('predicted_grades', 'Not set')}
Intended Major: {p.get('intended_major', 'Not set')}
Target Division: {p.get('target_division', 'Not set')} | Target Year: {p.get('target_start_year', 'Not set')}
NCAA EC Registered: {'YES' if p.get('ncaa_registered') else 'NO — action needed'} | NCAA ID: {p.get('ncaa_id', 'Not set')}
Contact: Email {'set' if p.get('email') else 'NOT set'} | Phone {'set' if p.get('phone') else 'NOT set'}
Social: Instagram {'set' if p.get('instagram') else 'not set'} | Twitter {'set' if p.get('twitter') else 'not set'}
Colleges emailed: {len(sent_ids)} | Colleges that replied: {len(replied_ids)}{response_context}
"""
    prompt = f"""You are a college basketball recruitment expert analysing a player's recruitment readiness.

PLAYER PROFILE:
{profile_text}

Score this player's recruitment readiness 0-100. Be honest and critical — a 100 is impossible, 85+ means genuinely outstanding.

Return ONLY valid JSON:
{{
  "score": <integer 0-100>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D>",
  "summary": "<2 sentences: current standing and single biggest opportunity>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": [
    {{"priority": "critical", "label": "<short label>", "suggestion": "<specific actionable advice>"}},
    {{"priority": "high",     "label": "<short label>", "suggestion": "<specific actionable advice>"}},
    {{"priority": "medium",   "label": "<short label>", "suggestion": "<specific actionable advice>"}}
  ],
  "coach_checklist": [
    {{"item": "Highlight tape (YouTube/Hudl)", "completed": <bool>, "importance": "critical", "tip": "Coaches will not pursue a player they have not seen. Upload today."}},
    {{"item": "NCAA Eligibility Center registration", "completed": <bool>, "importance": "critical", "tip": "Must be done before any scholarship can be formally offered."}},
    {{"item": "Season statistics (PPG/APG/RPG)", "completed": <bool>, "importance": "high", "tip": "Numbers give coaches an instant read on your output level."}},
    {{"item": "Academic results (GCSEs + A-Levels)", "completed": <bool>, "importance": "high", "tip": "Academic eligibility is non-negotiable — coaches need this early."}},
    {{"item": "Physical measurements (height/weight)", "completed": <bool>, "importance": "high", "tip": "Coaches have positional size requirements — missing this raises doubts."}},
    {{"item": "Personal bio / statement", "completed": <bool>, "importance": "medium", "tip": "Coaches recruit the person, not just the player. Tell your story."}},
    {{"item": "National or club team credentials", "completed": <bool>, "importance": "high", "tip": "Your national/club team tells coaches your competitive level instantly."}},
    {{"item": "Target division(s) selected", "completed": <bool>, "importance": "medium", "tip": "Targeting the right division saves time and improves response rates."}},
    {{"item": "Contact details (email + phone)", "completed": <bool>, "importance": "medium", "tip": "Coaches need a direct line to reach you after initial interest."}},
    {{"item": "Social media (clean, basketball-focused)", "completed": <bool>, "importance": "low", "tip": "Many coaches check social media — make sure it reflects well on you."}}
  ],
  "response_insights": "<2-3 sentences: based on the response data and profile, what patterns exist and what should the player focus on next. Be specific.>",
  "top_actions": ["<most urgent action>", "<second action>", "<third action>"]
}}"""

    chat = LlmChat(
        api_key=api_key, session_id=str(uuid.uuid4()),
        system_message="You are a college basketball recruitment expert. Return only valid JSON."
    ).with_model("openai", "gpt-4.1-mini")
    for attempt in range(2):
        response = await chat.send_message(UserMessage(text=prompt))
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            return json.loads(json_match.group()) if json_match else json.loads(response)
        except Exception:
            if attempt == 1:
                raise HTTPException(status_code=500, detail="Could not parse AI response. Please try again.")


@router.get("/ai/match/saved")
async def get_saved_match(current_user: UserModel = Depends(get_current_user)):
    saved_r = await run_in_threadpool(
        lambda: supa.table("ai_match_results").select("results,run_at")
        .eq("user_id", current_user.user_id).execute()
    )
    if not saved_r.data:
        return {"results": None, "run_at": None}
    return {"results": saved_r.data[0]["results"], "run_at": saved_r.data[0].get("run_at")}


@router.get("/ai/match")
async def ai_match(current_user: UserModel = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from datetime import datetime, timezone
    api_key = os.environ.get("EMERGENT_LLM_KEY")

    profile_r = await run_in_threadpool(
        lambda: supa.table("profiles").select("*").eq("user_id", current_user.user_id).execute()
    )
    if not profile_r.data:
        raise HTTPException(status_code=400, detail="Please complete your player profile first")
    profile = profile_r.data[0]

    colleges_r = await run_in_threadpool(
        lambda: supa.table("colleges")
        .select("id,name,division,foreign_friendly,acceptance_rate,scholarship_info")
        .execute()
    )
    colleges = colleges_r.data or []

    college_lines = []
    for c in colleges:
        ff = "UK-Friendly" if c.get("foreign_friendly") else "Standard"
        college_lines.append(f"{c['id']}|{c.get('name','?')}|{c.get('division','?')}|{ff}|{c.get('acceptance_rate','?')}")

    name = profile.get("full_name") or current_user.name or "Player"
    primary_pos = profile.get("primary_position") or profile.get("position", "Not specified")
    secondary_pos = profile.get("secondary_position", "")
    position = f"{primary_pos} / {secondary_pos} (versatile)" if secondary_pos else primary_pos
    ppg = profile.get("college_ppg") or profile.get("academy_ppg") or profile.get("ppg", "N/A")
    rpg = profile.get("college_rpg") or profile.get("academy_rpg") or profile.get("rpg", "N/A")
    apg = profile.get("college_apg") or profile.get("academy_apg") or profile.get("apg", "N/A")
    height_ft = profile.get("height_ft", "")
    height_cm = profile.get("height_cm", "")
    height = f"{height_ft} / {height_cm}cm" if height_ft or height_cm else "Not specified"
    target_div = profile.get("target_division", "Any Division")
    gcse = profile.get("gcse_grades", "N/A")
    predicted = profile.get("predicted_grades", profile.get("a_level_grades", "N/A"))
    bio = profile.get("bio", "")
    current_team = profile.get("current_team", "")
    club_team = profile.get("club_team", "")
    team_line = " / ".join(t for t in [current_team, club_team] if t) or "Not specified"

    prompt = f"""You are a college basketball recruitment AI. Analyse this player profile and categorize ALL the colleges listed.

PLAYER PROFILE:
- Name: {name}
- Position: {position}
- Height: {height}
- Stats: PPG {ppg} | RPG {rpg} | APG {apg}
- Target Division: {target_div}
- Academic: GCSEs {gcse} | Predicted {predicted}
- Current Team(s): {team_line}{(', ' + bio[:120]) if bio else ''}

COLLEGES (format: id|name|division|UK-Friendly|acceptance_rate):
{chr(10).join(college_lines)}

Categorise each college as excellent_fit, good_fit, or possible_fit.

SCORING RULES — BE CONSERVATIVE AND REALISTIC:
- A European player always faces real barriers: visa/immigration hurdles, stiff scholarship competition from US players, cultural adjustment, athletic level differences, and distance. No college is ever a perfect match.
- NEVER assign a score above 86%. Scores of 84-86% should be rare and reserved for genuinely exceptional alignment.
- Vary scores meaningfully within each band — do not cluster scores together.

BANDS:
- excellent_fit (72-86%): UK-Friendly + division matches target + realistic for player level. Hard ceiling 86%.
- good_fit (50-71%): UK-Friendly OR division is close match + reasonable path forward
- possible_fit (30-49%): Achievable but significant work required

Include at most 10 per category. Prioritise UK-Friendly colleges.
The "why" field must be honest — mention at least one realistic challenge the player will face at that college.

Return ONLY valid JSON — no markdown, no explanation:
{{"excellent_fit":[{{"id":"...","name":"...","division":"...","pct":79,"why":"One sentence max 25 words, noting one challenge"}}],"good_fit":[...],"possible_fit":[...]}}"""

    chat = LlmChat(
        api_key=api_key, session_id=str(uuid.uuid4()),
        system_message="You are a college basketball recruitment AI. Return only valid JSON."
    ).with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        result = json.loads(json_match.group()) if json_match else json.loads(response)
    except Exception:
        raise HTTPException(status_code=500, detail="AI response could not be parsed. Please try again.")

    run_at = datetime.now(timezone.utc).isoformat()
    await run_in_threadpool(
        lambda: supa.table("ai_match_results").upsert(
            {"user_id": current_user.user_id, "results": result, "run_at": run_at},
            on_conflict="user_id",
        ).execute()
    )
    return {"results": result, "run_at": run_at}
