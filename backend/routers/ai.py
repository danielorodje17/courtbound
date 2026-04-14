import os
import uuid
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth_utils import UserModel, get_current_user
from models import AIMessageRequest, AIStrategyRequest, NCAACHeckRequest, FollowUpRequest

router = APIRouter(tags=["ai"])


@router.post("/ai/draft-message")
async def draft_message(data: AIMessageRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    type_map = {
        "initial_outreach": "initial scholarship inquiry",
        "follow_up": "follow-up after no response",
        "thank_you": "thank you after a call/visit",
        "update": "athletic/academic update",
    }
    msg_type_label = type_map.get(data.message_type, data.message_type)
    highlight_section = f"\n\nHighlight Tape: {data.highlight_tape_url}" if data.highlight_tape_url else ""
    prompt = f"""Write a professional {msg_type_label} email from a UK basketball player to a college coach.

Player: {data.user_name}
Position: {data.user_position}
Stats: {data.user_stats or 'Not specified'}
Contact: {data.user_email or 'N/A'} | {data.user_phone or 'N/A'}{highlight_section}

College: {data.college_name} ({data.division})
Coach: {data.coach_name}

Write a compelling, personalised email. Reference the specific college and division. Keep it under 300 words.
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
    prompt = f"""You are an expert college basketball recruitment strategist helping an 18-year-old UK player get a US college scholarship.

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
    prompt = f"""You are an NCAA eligibility expert specifically helping a UK/international basketball player understand their eligibility status for US college basketball.

Analyse the following profile for an 18-year-old UK basketball player (England Under-18 national team) and provide a detailed NCAA eligibility assessment:

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


@router.get("/ai/match/saved")
async def get_saved_match(current_user: UserModel = Depends(get_current_user)):
    """Return the last saved AI match result for this user without re-running."""
    saved = await db.ai_match_results.find_one(
        {"user_id": current_user.user_id}, {"_id": 0}
    )
    if not saved:
        return {"results": None, "run_at": None}
    return {"results": saved["results"], "run_at": saved.get("run_at")}


@router.get("/ai/match")
async def ai_match(current_user: UserModel = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your player profile first")
    colleges = await db.colleges.find(
        {}, {"_id": 1, "name": 1, "division": 1, "foreign_friendly": 1, "acceptance_rate": 1, "scholarship_info": 1}
    ).to_list(200)
    college_lines = []
    for c in colleges:
        ff = "UK-Friendly" if c.get("foreign_friendly") else "Standard"
        college_lines.append(f"{str(c['_id'])}|{c.get('name','?')}|{c.get('division','?')}|{ff}|{c.get('acceptance_rate','?')}")
    name = profile.get("full_name", current_user.name or "Player")
    position = profile.get("position", "Not specified")
    ppg = profile.get("ppg", "N/A")
    rpg = profile.get("rpg", "N/A")
    apg = profile.get("apg", "N/A")
    height_ft = profile.get("height_ft", "")
    height_cm = profile.get("height_cm", "")
    height = f"{height_ft} / {height_cm}cm" if height_ft or height_cm else "Not specified"
    target_div = profile.get("target_division", "Any Division")
    gcse = profile.get("gcse_results", "N/A")
    predicted = profile.get("predicted_grades", profile.get("a_level_grades", "N/A"))
    bio = profile.get("bio", "")
    prompt = f"""You are a college basketball recruitment AI. Analyse this UK player profile and categorize ALL the colleges listed.

PLAYER PROFILE:
- Name: {name}
- Position: {position}
- Height: {height}
- Stats: PPG {ppg} | RPG {rpg} | APG {apg}
- Target Division: {target_div}
- Academic: GCSEs {gcse} | Predicted {predicted}
- Background: England Under-18 national team player{', ' + bio[:120] if bio else ''}

COLLEGES (format: id|name|division|UK-Friendly|acceptance_rate):
{chr(10).join(college_lines)}

Categorise each college as excellent_fit, good_fit, or possible_fit.

Rules:
- excellent_fit (88-100%): UK-Friendly + division matches target + feasible for player level
- good_fit (65-87%): UK-Friendly OR division is close match + reasonable path
- possible_fit (45-64%): Achievable with effort, different division or less UK-friendly

Include at most 10 per category. Prioritise UK-Friendly colleges.

Return ONLY valid JSON — no markdown, no explanation:
{{"excellent_fit":[{{"id":"...","name":"...","division":"...","pct":92,"why":"One sentence max 20 words"}}],"good_fit":[...],"possible_fit":[...]}}"""
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

    # Persist results so the user sees them on next visit
    from datetime import datetime, timezone
    await db.ai_match_results.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"user_id": current_user.user_id, "results": result, "run_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"results": result, "run_at": datetime.now(timezone.utc).isoformat()}
