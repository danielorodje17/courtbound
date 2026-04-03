from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, BeforeValidator
from typing import Annotated, Optional
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ─── DB ────────────────────────────────────────────────────────────────────────
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Single-user mode: fixed owner ID
OWNER_ID = "courtbound_owner"

# ─── App & Router ──────────────────────────────────────────────────────────────
app = FastAPI(title="CourtBound API")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Models ────────────────────────────────────────────────────────────────────
class CollegeTrackedCreate(BaseModel):
    college_id: str
    notes: Optional[str] = ""

class EmailLogCreate(BaseModel):
    college_id: str
    direction: str
    subject: str
    body: str
    coach_name: Optional[str] = ""
    coach_email: Optional[str] = ""

class AIMessageRequest(BaseModel):
    college_name: str
    coach_name: str
    division: str
    user_name: str = "Player"
    user_position: str = "point guard"
    user_stats: Optional[str] = ""
    message_type: str = "initial_outreach"

class AIStrategyRequest(BaseModel):
    college_name: str
    coach_name: str
    last_contact_date: Optional[str] = ""
    response_status: str = "no_response"

class NCAACHeckRequest(BaseModel):
    # Academic
    gcse_grades: Optional[str] = ""
    a_level_grades: Optional[str] = ""
    predicted_grades: Optional[str] = ""
    core_subjects_completed: bool = True
    # Athletic
    competitive_level: str = "national"  # local, regional, national, international
    years_played: int = 5
    has_club_team: bool = True
    paid_to_play: bool = False
    # Amateurism
    received_award_money: bool = False
    played_on_pro_contract: bool = False
    agent_representation: bool = False
    social_media_monetised: bool = False

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    count = await db.colleges.count_documents({})
    if count == 0:
        await seed_colleges()

async def seed_colleges():
    colleges = [
        {"name": "Duke University", "location": "Durham, NC", "state": "North Carolina", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships available. Strong international student support.", "acceptance_rate": "6%", "notable_alumni": "Zion Williamson, Grant Hill", "ranking": 1, "website": "https://goduke.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Jon Scheyer", "title": "Head Coach", "email": "jscheyer@duke.edu", "phone": "+1-919-613-7500"}]},
        {"name": "University of Kentucky", "location": "Lexington, KY", "state": "Kentucky", "division": "Division I", "conference": "SEC", "foreign_friendly": True, "scholarship_info": "Full scholarships. International student office provides dedicated support.", "acceptance_rate": "95%", "notable_alumni": "Anthony Davis, John Wall", "ranking": 2, "website": "https://ukathletics.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "John Calipari", "title": "Head Coach", "email": "jcalipari@uky.edu", "phone": "+1-859-257-3838"}]},
        {"name": "University of Kansas", "location": "Lawrence, KS", "state": "Kansas", "division": "Division I", "conference": "Big 12", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. History of recruiting international talent.", "acceptance_rate": "88%", "notable_alumni": "Andrew Wiggins, Joel Embiid", "ranking": 3, "website": "https://kuathletics.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Bill Self", "title": "Head Coach", "email": "bself@ku.edu", "phone": "+1-785-864-3151"}]},
        {"name": "Gonzaga University", "location": "Spokane, WA", "state": "Washington", "division": "Division I", "conference": "WCC", "foreign_friendly": True, "scholarship_info": "Very international-friendly. Multiple foreign players each year.", "acceptance_rate": "71%", "notable_alumni": "Adam Morrison, Kelly Olynyk", "ranking": 4, "website": "https://gozags.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Mark Few", "title": "Head Coach", "email": "mfew@gonzaga.edu", "phone": "+1-509-313-4220"}]},
        {"name": "University of North Carolina", "location": "Chapel Hill, NC", "state": "North Carolina", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full scholarships available. Strong academic support for international students.", "acceptance_rate": "24%", "notable_alumni": "Michael Jordan, Vince Carter", "ranking": 5, "website": "https://goheels.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Hubert Davis", "title": "Head Coach", "email": "hdavis@unc.edu", "phone": "+1-919-962-2117"}]},
        {"name": "Villanova University", "location": "Villanova, PA", "state": "Pennsylvania", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Scholarships available. Dedicated international student resources.", "acceptance_rate": "26%", "notable_alumni": "Kris Jenkins, Mikal Bridges", "ranking": 6, "website": "https://villanova.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Kyle Neptune", "title": "Head Coach", "email": "kneptune@villanova.edu", "phone": "+1-610-519-4120"}]},
        {"name": "Michigan State University", "location": "East Lansing, MI", "state": "Michigan", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full scholarships. International friendly environment.", "acceptance_rate": "76%", "notable_alumni": "Magic Johnson, Draymond Green", "ranking": 7, "website": "https://msuspartans.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Tom Izzo", "title": "Head Coach", "email": "izzo@msu.edu", "phone": "+1-517-355-1623"}]},
        {"name": "Arizona University", "location": "Tucson, AZ", "state": "Arizona", "division": "Division I", "conference": "Pac-12", "foreign_friendly": True, "scholarship_info": "Strong scholarship program for international athletes.", "acceptance_rate": "85%", "notable_alumni": "Deandre Ayton, Jason Terry", "ranking": 8, "website": "https://arizonawildcats.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Tommy Lloyd", "title": "Head Coach", "email": "tlloyd@arizona.edu", "phone": "+1-520-621-4102"}]},
        {"name": "Connecticut University (UConn)", "location": "Storrs, CT", "state": "Connecticut", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Actively recruits international players. Full scholarships available.", "acceptance_rate": "56%", "notable_alumni": "Ray Allen, Kemba Walker", "ranking": 9, "website": "https://uconnhuskies.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Dan Hurley", "title": "Head Coach", "email": "dhurley@uconn.edu", "phone": "+1-860-486-2723"}]},
        {"name": "Purdue University", "location": "West Lafayette, IN", "state": "Indiana", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Strong STEM-focused international support.", "acceptance_rate": "67%", "notable_alumni": "E'Twaun Moore, Robbie Hummel", "ranking": 10, "website": "https://purduesports.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Matt Painter", "title": "Head Coach", "email": "mpainter@purdue.edu", "phone": "+1-765-494-3220"}]},
        {"name": "Creighton University", "location": "Omaha, NE", "state": "Nebraska", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Welcomes international players. Strong Jesuit educational environment.", "acceptance_rate": "76%", "notable_alumni": "Kyle Korver, Doug McDermott", "ranking": 11, "website": "https://gocreighton.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Greg McDermott", "title": "Head Coach", "email": "gmcdermott@creighton.edu", "phone": "+1-402-280-2720"}]},
        {"name": "Baylor University", "location": "Waco, TX", "state": "Texas", "division": "Division I", "conference": "Big 12", "foreign_friendly": False, "scholarship_info": "Full scholarships. Limited international scholarship history.", "acceptance_rate": "38%", "notable_alumni": "Brittney Griner, Scott Drew", "ranking": 12, "website": "https://baylorbears.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Scott Drew", "title": "Head Coach", "email": "sdrew@baylor.edu", "phone": "+1-254-710-3030"}]},
        {"name": "UCLA", "location": "Los Angeles, CA", "state": "California", "division": "Division I", "conference": "Pac-12", "foreign_friendly": True, "scholarship_info": "Strong international student support. Academic excellence.", "acceptance_rate": "12%", "notable_alumni": "Kareem Abdul-Jabbar, Bill Walton", "ranking": 13, "website": "https://uclabruins.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Mick Cronin", "title": "Head Coach", "email": "mcronin@ucla.edu", "phone": "+1-310-825-8699"}]},
        {"name": "Ohio State University", "location": "Columbus, OH", "state": "Ohio", "division": "Division I", "conference": "Big Ten", "foreign_friendly": True, "scholarship_info": "Full scholarships available. Strong big-school resources.", "acceptance_rate": "54%", "notable_alumni": "Evan Turner, Mike Conley Jr.", "ranking": 14, "website": "https://ohiostatebuckeyes.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Jake Diebler", "title": "Head Coach", "email": "jdiebler@osu.edu", "phone": "+1-614-292-1033"}]},
        {"name": "Indiana University", "location": "Bloomington, IN", "state": "Indiana", "division": "Division I", "conference": "Big Ten", "foreign_friendly": False, "scholarship_info": "Full athletic scholarships. Traditional basketball powerhouse.", "acceptance_rate": "82%", "notable_alumni": "Isiah Thomas, Victor Oladipo", "ranking": 15, "website": "https://iuhoosiers.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Mike Woodson", "title": "Head Coach", "email": "mwoodson@indiana.edu", "phone": "+1-812-855-2138"}]},
        {"name": "St. John's University", "location": "Queens, NY", "state": "New York", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Strong NYC recruiting. Very welcoming to international students.", "acceptance_rate": "63%", "notable_alumni": "Chris Mullin, Mark Jackson", "ranking": 16, "website": "https://redstormsports.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Rick Pitino", "title": "Head Coach", "email": "rpitino@stjohns.edu", "phone": "+1-718-990-6367"}]},
        {"name": "Louisville University", "location": "Louisville, KY", "state": "Kentucky", "division": "Division I", "conference": "ACC", "foreign_friendly": True, "scholarship_info": "Full scholarships. Actively recruits internationally.", "acceptance_rate": "68%", "notable_alumni": "Donovan Mitchell, Darrell Griffith", "ranking": 17, "website": "https://gocards.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Pat Kelsey", "title": "Head Coach", "email": "pkelsey@louisville.edu", "phone": "+1-502-852-5732"}]},
        {"name": "Tennessee University", "location": "Knoxville, TN", "state": "Tennessee", "division": "Division I", "conference": "SEC", "foreign_friendly": False, "scholarship_info": "Full scholarships. Some international players historically.", "acceptance_rate": "67%", "notable_alumni": "Grant Williams, Jordan Bone", "ranking": 18, "website": "https://utsports.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Rick Barnes", "title": "Head Coach", "email": "rbarnes@utk.edu", "phone": "+1-865-974-1212"}]},
        {"name": "Xavier University", "location": "Cincinnati, OH", "state": "Ohio", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Jesuit values support international students. Strong scholarship program.", "acceptance_rate": "69%", "notable_alumni": "Channing Frye, Jordan Crawford", "ranking": 19, "website": "https://goxavier.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Sean Miller", "title": "Head Coach", "email": "smiller@xavier.edu", "phone": "+1-513-745-3413"}]},
        {"name": "Marquette University", "location": "Milwaukee, WI", "state": "Wisconsin", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "History of international players. Catholic university with strong support.", "acceptance_rate": "84%", "notable_alumni": "Dwyane Wade, Doc Rivers", "ranking": 20, "website": "https://gomarquette.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Shaka Smart", "title": "Head Coach", "email": "ssmart@marquette.edu", "phone": "+1-414-288-7447"}]},
        {"name": "Butler University", "location": "Indianapolis, IN", "state": "Indiana", "division": "Division I", "conference": "Big East", "foreign_friendly": True, "scholarship_info": "Mid-major with excellent academics. International students welcome.", "acceptance_rate": "77%", "notable_alumni": "Shelvin Mack, Gordon Hayward", "ranking": 21, "website": "https://butlersports.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Thad Matta", "title": "Head Coach", "email": "tmatta@butler.edu", "phone": "+1-317-940-9375"}]},
        {"name": "San Diego State University", "location": "San Diego, CA", "state": "California", "division": "Division I", "conference": "Mountain West", "foreign_friendly": True, "scholarship_info": "Strong mid-major program. California sunshine and diverse student body.", "acceptance_rate": "37%", "notable_alumni": "Kawhi Leonard, Steve Fisher", "ranking": 22, "website": "https://goaztecs.com", "image_url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400", "coaches": [{"name": "Brian Dutcher", "title": "Head Coach", "email": "bdutcher@sdsu.edu", "phone": "+1-619-594-5200"}]},
        {"name": "Colorado State University", "location": "Fort Collins, CO", "state": "Colorado", "division": "Division I", "conference": "Mountain West", "foreign_friendly": True, "scholarship_info": "Open to international athletes. Great mountain setting.", "acceptance_rate": "84%", "notable_alumni": "Manny Adur, Niek Maarse", "ranking": 23, "website": "https://csurams.com", "image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400", "coaches": [{"name": "Niko Medved", "title": "Head Coach", "email": "nmedved@colostate.edu", "phone": "+1-970-491-5065"}]},
        {"name": "Drexel University", "location": "Philadelphia, PA", "state": "Pennsylvania", "division": "Division I", "conference": "CAA", "foreign_friendly": True, "scholarship_info": "Strong co-op program. Excellent for academic + athletic balance.", "acceptance_rate": "76%", "notable_alumni": "Michael Anderson, Daryl Strawberry", "ranking": 24, "website": "https://drexeldragons.com", "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "coaches": [{"name": "Zach Spiker", "title": "Head Coach", "email": "zspiker@drexel.edu", "phone": "+1-215-895-2000"}]},
        {"name": "Belmont University", "location": "Nashville, TN", "state": "Tennessee", "division": "Division I", "conference": "Missouri Valley", "foreign_friendly": True, "scholarship_info": "Smaller school, more personal attention. International students supported.", "acceptance_rate": "79%", "notable_alumni": "Taylor Morgan, Dylan Windler", "ranking": 25, "website": "https://belmontbruins.com", "image_url": "https://images.unsplash.com/photo-1562774053-701939374585?w=400", "coaches": [{"name": "Casey Alexander", "title": "Head Coach", "email": "calexander@belmont.edu", "phone": "+1-615-460-5500"}]},
    ]
    for c in colleges:
        c["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.colleges.insert_many(colleges)
    logger.info(f"Seeded {len(colleges)} colleges")

# ─── Colleges ──────────────────────────────────────────────────────────────────
@api_router.get("/colleges")
async def get_colleges(search: Optional[str] = None, division: Optional[str] = None, foreign_friendly: Optional[bool] = None, state: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"location": {"$regex": search, "$options": "i"}}]
    if division:
        query["division"] = division
    if foreign_friendly is not None:
        query["foreign_friendly"] = foreign_friendly
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    colleges = await db.colleges.find(query, {"_id": 1, "name": 1, "location": 1, "state": 1, "division": 1, "conference": 1, "foreign_friendly": 1, "ranking": 1, "acceptance_rate": 1, "coaches": 1, "image_url": 1, "scholarship_info": 1, "notable_alumni": 1, "website": 1}).sort("ranking", 1).to_list(200)
    for c in colleges:
        c["id"] = str(c.pop("_id"))
    return colleges

@api_router.get("/colleges/{college_id}")
async def get_college(college_id: str):
    try:
        college = await db.colleges.find_one({"_id": ObjectId(college_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid college ID")
    if not college:
        raise HTTPException(status_code=404, detail="College not found")
    college["id"] = str(college.pop("_id"))
    return college

# ─── Tracked Colleges (no auth) ───────────────────────────────────────────────
@api_router.get("/my-colleges")
async def get_my_colleges():
    tracked = await db.tracked_colleges.find({"user_id": OWNER_ID}).to_list(200)
    result = []
    for t in tracked:
        try:
            college = await db.colleges.find_one({"_id": ObjectId(t["college_id"])})
            if college:
                college["id"] = str(college.pop("_id"))
                t["id"] = str(t.pop("_id"))
                t["college"] = college
                result.append(t)
        except Exception:
            pass
    return result

@api_router.post("/my-colleges")
async def track_college(data: CollegeTrackedCreate):
    existing = await db.tracked_colleges.find_one({"user_id": OWNER_ID, "college_id": data.college_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already tracking this college")
    doc = {"user_id": OWNER_ID, "college_id": data.college_id, "notes": data.notes, "status": "interested", "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.tracked_colleges.insert_one(doc)
    doc.pop("_id", None)
    return {"id": str(result.inserted_id), **doc}

@api_router.delete("/my-colleges/{college_id}")
async def untrack_college(college_id: str):
    await db.tracked_colleges.delete_one({"user_id": OWNER_ID, "college_id": college_id})
    return {"message": "Removed from tracking"}

@api_router.patch("/my-colleges/{college_id}/status")
async def update_tracked_status(college_id: str, body: dict):
    await db.tracked_colleges.update_one(
        {"user_id": OWNER_ID, "college_id": college_id},
        {"$set": {"status": body.get("status", "interested"), "notes": body.get("notes", "")}}
    )
    return {"message": "Updated"}

# ─── Emails (no auth) ─────────────────────────────────────────────────────────
@api_router.get("/emails")
async def get_emails(college_id: Optional[str] = None):
    query = {"user_id": OWNER_ID}
    if college_id:
        query["college_id"] = college_id
    emails = await db.emails.find(query).sort("created_at", -1).to_list(500)
    for e in emails:
        e["id"] = str(e.pop("_id"))
    return emails

@api_router.post("/emails")
async def log_email(data: EmailLogCreate):
    doc = {"user_id": OWNER_ID, "college_id": data.college_id, "direction": data.direction, "subject": data.subject, "body": data.body, "coach_name": data.coach_name, "coach_email": data.coach_email, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.emails.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.delete("/emails/{email_id}")
async def delete_email(email_id: str):
    await db.emails.delete_one({"_id": ObjectId(email_id), "user_id": OWNER_ID})
    return {"message": "Deleted"}

# ─── Dashboard Stats ───────────────────────────────────────────────────────────
@api_router.get("/dashboard/stats")
async def get_stats():
    tracked = await db.tracked_colleges.count_documents({"user_id": OWNER_ID})
    emails_sent = await db.emails.count_documents({"user_id": OWNER_ID, "direction": "sent"})
    emails_received = await db.emails.count_documents({"user_id": OWNER_ID, "direction": "received"})
    recent_emails = await db.emails.find({"user_id": OWNER_ID}).sort("created_at", -1).to_list(5)
    for e in recent_emails:
        e["id"] = str(e.pop("_id"))
    return {"tracked_colleges": tracked, "emails_sent": emails_sent, "emails_received": emails_received, "recent_emails": recent_emails}

# ─── AI Message Composer ───────────────────────────────────────────────────────
@api_router.post("/ai/draft-message")
async def draft_message(data: AIMessageRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    message_prompts = {
        "initial_outreach": f"Draft a professional initial outreach email from a UK basketball player seeking a scholarship at {data.college_name}.",
        "follow_up": f"Draft a follow-up email for a UK basketball player who already contacted {data.college_name} but hasn't heard back.",
        "thank_you": f"Draft a thank you email after a call or meeting with {data.college_name} coaches."
    }
    prompt = f"""You are an expert college basketball recruitment advisor helping an 18-year-old UK basketball player (England Under-18 national team) get a US college scholarship.

{message_prompts.get(data.message_type, message_prompts["initial_outreach"])}

Details:
- Player Name: {data.user_name}
- Position: {data.user_position}
- Stats/Highlights: {data.user_stats or 'England Under-18 player, strong all-round player'}
- Target College: {data.college_name}
- Division: {data.division}
- Coach Name: {data.coach_name}
- Message Type: {data.message_type}

Write a compelling, personal, and professional email. Include:
1. Strong opening that catches attention
2. Brief introduction mentioning England U18 status
3. Why this specific college/program appeals to them
4. Key athletic highlights
5. Academic commitment mention
6. Clear call to action
7. Professional sign-off

Keep it concise (200-300 words). Make it feel authentic and personal, not generic."""
    chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an expert college basketball recruitment advisor.").with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    return {"draft": response, "message_type": data.message_type}

@api_router.post("/ai/strategy")
async def get_strategy(data: AIStrategyRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    prompt = f"""You are an expert college basketball recruitment strategist helping an 18-year-old UK player (England Under-18) get a US college scholarship.

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

# ─── NCAA Eligibility Checker ─────────────────────────────────────────────────
@api_router.post("/ai/ncaa-check")
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
2. **ACADEMIC ELIGIBILITY** - How UK qualifications (GCSEs, A-Levels) convert for NCAA requirements, what's needed
3. **AMATEURISM STATUS** - Any red flags or concerns based on answers above
4. **NCAA ELIGIBILITY CENTER** - Exact steps to register at eligibilitycenter.org, what documents to submit
5. **DIVISION RECOMMENDATIONS** - Which NCAA Division (I, II, III) best suits this profile
6. **NAIA OPTION** - Whether NAIA schools could be a great alternative (often more accessible for UK players)
7. **IMMEDIATE ACTION ITEMS** - Numbered list of what to do right now, in priority order
8. **TIMELINE** - Key deadlines and when to start the eligibility process

Be specific about UK qualifications. Mention that UK GCSEs/A-Levels are generally well-received by the NCAA Eligibility Center. Be encouraging but honest about any risks."""

    chat = LlmChat(api_key=api_key, session_id=str(uuid.uuid4()), system_message="You are an NCAA eligibility expert for international student athletes.").with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))
    return {"assessment": response}

# ─── Root ──────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "CourtBound API v1.0"}

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown():
    client.close()
