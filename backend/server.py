from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException, UploadFile, File, Depends, Response, Cookie, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, BeforeValidator
from typing import Annotated, Optional, List
import os
import logging
import uuid
import csv
import io
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import defaultdict

# ─── DB ────────────────────────────────────────────────────────────────────────
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Single-user mode: fixed owner ID (kept for CSV import backward compatibility)
OWNER_ID = "courtbound_owner"

# ─── Auth Models & Dependency ─────────────────────────────────────────────────
class UserModel(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""

async def get_current_user(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> UserModel:
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return UserModel(**user)


# ─── Auth Endpoints ─── (registered after api_router below)


# ─── App & Router ──────────────────────────────────────────────────────────────
app = FastAPI(title="CourtBound API")
api_router = APIRouter(prefix="/api")

FRONTEND_ORIGIN = os.environ.get("FRONTEND_URL", "https://b-ball-pathway.preview.emergentagent.com")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Auth Endpoints ───────────────────────────────────────────────────────────
@api_router.post("/auth/session")
async def exchange_session(body: dict, response: Response):
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session from auth provider")
    data = resp.json()
    email = data["email"]
    name = data["name"]
    picture = data.get("picture", "")
    session_token = data["session_token"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60,
    )
    return {"user_id": user_id, "email": email, "name": name, "picture": picture, "session_token": session_token}

@api_router.get("/auth/me")
async def auth_me(current_user: UserModel = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def auth_logout(
    response: Response,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = session_token or (authorization.replace("Bearer ", "").strip() if authorization else None)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out"}

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
    user_email: Optional[str] = ""
    user_phone: Optional[str] = ""
    highlight_tape_url: Optional[str] = ""
    message_type: str = "initial_outreach"

class AIStrategyRequest(BaseModel):
    college_name: str
    coach_name: str
    last_contact_date: Optional[str] = ""
    response_status: str = "no_response"

class BulkEmailImport(BaseModel):
    college_ids: list
    direction: str = "sent"
    subject: str
    body: str
    coach_name: Optional[str] = ""
    sent_date: Optional[str] = ""

class ReplyLogRequest(BaseModel):
    college_id: str
    subject: Optional[str] = ""
    body: str
    coach_name: Optional[str] = ""
    coach_email: Optional[str] = ""
    received_date: Optional[str] = ""

class FollowUpRequest(BaseModel):
    college_name: str
    coach_name: str
    reply_content: str
    original_subject: Optional[str] = ""

class PlayerProfile(BaseModel):
    # Personal
    full_name: Optional[str] = "Daniel Orodje"
    date_of_birth: Optional[str] = ""
    nationality: Optional[str] = "British-Nigerian"
    hometown: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    # Physical
    height_ft: Optional[str] = ""
    height_cm: Optional[str] = ""
    weight_kg: Optional[str] = ""
    wingspan_cm: Optional[str] = ""
    position: Optional[str] = "Point Guard"
    dominant_hand: Optional[str] = "Right"
    # Athletic
    current_team: Optional[str] = "England Under-18"
    club_team: Optional[str] = ""
    jersey_number: Optional[str] = ""
    years_playing: Optional[str] = ""
    # Stats
    ppg: Optional[str] = ""
    apg: Optional[str] = ""
    rpg: Optional[str] = ""
    spg: Optional[str] = ""
    fg_percent: Optional[str] = ""
    three_pt_percent: Optional[str] = ""
    # Academic
    current_school: Optional[str] = ""
    school_year: Optional[str] = ""
    expected_graduation: Optional[str] = ""
    gcse_grades: Optional[str] = ""
    a_level_subjects: Optional[str] = ""
    predicted_grades: Optional[str] = ""
    gpa_equivalent: Optional[str] = ""
    intended_major: Optional[str] = ""
    sat_score: Optional[str] = ""
    act_score: Optional[str] = ""
    # Recruitment
    target_start_year: Optional[str] = "2026"
    target_division: Optional[str] = "Division I, Division II, NAIA"
    ncaa_id: Optional[str] = ""
    ncaa_registered: Optional[bool] = False
    highlight_tape_url: Optional[str] = ""
    bio: Optional[str] = ""
    # Social
    instagram: Optional[str] = ""
    twitter: Optional[str] = ""

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
    # Always seed extended colleges if they're missing (by name check)
    await seed_extended_colleges()

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

async def seed_extended_colleges():
    """Seed Division II, NAIA, and JUCO colleges — skips any already in DB by name."""
    img1 = "https://images.unsplash.com/photo-1562774053-701939374585?w=400"
    img2 = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400"
    img3 = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"
    img4 = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"
    ts = datetime.now(timezone.utc).isoformat()

    extended = [
        # ── DIVISION II ──────────────────────────────────────────────────────────
        {"name": "Drury University", "location": "Springfield, MO", "state": "Missouri", "division": "Division II", "conference": "GLVC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Highly ranked D2 program; welcomes international players.", "acceptance_rate": "66%", "notable_alumni": "Scott Pioli", "ranking": 101, "website": "https://druryathletics.com", "image_url": img2, "coaches": [{"name": "Steve Hesser", "title": "Head Coach", "email": "shesser@drury.edu", "phone": "+1-417-873-7350"}]},
        {"name": "University of Findlay", "location": "Findlay, OH", "state": "Ohio", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "Full D2 athletic scholarships. International student community.", "acceptance_rate": "68%", "notable_alumni": "Various NBA G-League players", "ranking": 102, "website": "https://findlayoilers.com", "image_url": img3, "coaches": [{"name": "Rod Blackwell", "title": "Head Coach", "email": "blackwellr@findlay.edu", "phone": "+1-419-434-4600"}]},
        {"name": "Minnesota State Mankato", "location": "Mankato, MN", "state": "Minnesota", "division": "Division II", "conference": "NSIC", "foreign_friendly": True, "scholarship_info": "Strong scholarship program. International athletes well-supported.", "acceptance_rate": "62%", "notable_alumni": "Tyler Relph", "ranking": 103, "website": "https://mankatomavericks.com", "image_url": img1, "coaches": [{"name": "Mike Hanson", "title": "Head Coach", "email": "mhanson@mnsu.edu", "phone": "+1-507-389-2636"}]},
        {"name": "West Texas A&M University", "location": "Canyon, TX", "state": "Texas", "division": "Division II", "conference": "Lone Star", "foreign_friendly": True, "scholarship_info": "Athletic scholarships available. Competitive Lone Star Conference.", "acceptance_rate": "61%", "notable_alumni": "Bob Knight (attended)", "ranking": 104, "website": "https://wtamu.edu/athletics", "image_url": img4, "coaches": [{"name": "Tom Brown", "title": "Head Coach", "email": "tbrown@wtamu.edu", "phone": "+1-806-651-2690"}]},
        {"name": "Metro State University of Denver", "location": "Denver, CO", "state": "Colorado", "division": "Division II", "conference": "RMAC", "foreign_friendly": True, "scholarship_info": "Strong urban program. Diverse student body. Full D2 scholarships.", "acceptance_rate": "100%", "notable_alumni": "Mack Tuck", "ranking": 105, "website": "https://roadrunnersports.com", "image_url": img2, "coaches": [{"name": "Derrick Clark", "title": "Head Coach", "email": "dclark@msudenver.edu", "phone": "+1-303-615-0600"}]},
        {"name": "Bentley University", "location": "Waltham, MA", "state": "Massachusetts", "division": "Division II", "conference": "NE10", "foreign_friendly": True, "scholarship_info": "Business-focused university. Athletic scholarships + strong career prospects.", "acceptance_rate": "50%", "notable_alumni": "Various business executives", "ranking": 106, "website": "https://bentleyfalcons.com", "image_url": img3, "coaches": [{"name": "Jay Lawson", "title": "Head Coach", "email": "jlawson@bentley.edu", "phone": "+1-781-891-2187"}]},
        {"name": "Adelphi University", "location": "Garden City, NY", "state": "New York", "division": "Division II", "conference": "NE10", "foreign_friendly": True, "scholarship_info": "D2 scholarships available. New York area — great exposure.", "acceptance_rate": "72%", "notable_alumni": "Randy Wittman", "ranking": 107, "website": "https://athletics.adelphi.edu", "image_url": img1, "coaches": [{"name": "Dan Solomito", "title": "Head Coach", "email": "dsolomito@adelphi.edu", "phone": "+1-516-877-4242"}]},
        {"name": "Ferris State University", "location": "Big Rapids, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Great Lakes region school.", "acceptance_rate": "88%", "notable_alumni": "Rodney Hendricks", "ranking": 108, "website": "https://ferrisbulldogs.com", "image_url": img4, "coaches": [{"name": "Andy Bronkema", "title": "Head Coach", "email": "abronkema@ferris.edu", "phone": "+1-231-591-2311"}]},
        {"name": "Grand Valley State University", "location": "Allendale, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "One of the top D2 programs in the country. Strong academics.", "acceptance_rate": "83%", "notable_alumni": "Kirk Cousins (football)", "ranking": 109, "website": "https://gvsulakers.com", "image_url": img2, "coaches": [{"name": "Ric Wesley", "title": "Head Coach", "email": "wesleyr@gvsu.edu", "phone": "+1-616-331-3259"}]},
        {"name": "Ashland University", "location": "Ashland, OH", "state": "Ohio", "division": "Division II", "conference": "G-MAC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Strong Christian university environment.", "acceptance_rate": "69%", "notable_alumni": "Nate Archibald (connection)", "ranking": 110, "website": "https://goashlandeagles.com", "image_url": img3, "coaches": [{"name": "John Gatens", "title": "Head Coach", "email": "jgatens@ashland.edu", "phone": "+1-419-289-5470"}]},
        {"name": "University of Indianapolis", "location": "Indianapolis, IN", "state": "Indiana", "division": "Division II", "conference": "GLVC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Located in NBA city — great basketball culture.", "acceptance_rate": "71%", "notable_alumni": "Peyton Manning (connection)", "ranking": 111, "website": "https://uindy.edu/athletics", "image_url": img1, "coaches": [{"name": "Stan Gouard", "title": "Head Coach", "email": "sgouard@uindy.edu", "phone": "+1-317-788-3318"}]},
        {"name": "Florida Southern College", "location": "Lakeland, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Full scholarships. Sunshine State — great for international players.", "acceptance_rate": "52%", "notable_alumni": "Multiple NBA draftees", "ranking": 112, "website": "https://fscmocs.com", "image_url": img4, "coaches": [{"name": "Linc Darner", "title": "Head Coach", "email": "ldarner@flsouthern.edu", "phone": "+1-863-680-4269"}]},
        {"name": "Nova Southeastern University", "location": "Fort Lauderdale, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Large international student body. Athletic scholarships available.", "acceptance_rate": "52%", "notable_alumni": "Various South Florida athletes", "ranking": 113, "website": "https://nsusharks.com", "image_url": img2, "coaches": [{"name": "Kyle Church", "title": "Head Coach", "email": "kchurch@nova.edu", "phone": "+1-954-262-8250"}]},
        {"name": "University of Tampa", "location": "Tampa, FL", "state": "Florida", "division": "Division II", "conference": "SSC", "foreign_friendly": True, "scholarship_info": "Strong D2 program. Located in major city with great basketball culture.", "acceptance_rate": "54%", "notable_alumni": "Various SSC champions", "ranking": 114, "website": "https://ut.edu/athletics", "image_url": img3, "coaches": [{"name": "Tom Carlin", "title": "Head Coach", "email": "tcarlin@ut.edu", "phone": "+1-813-253-6226"}]},
        {"name": "Fort Hays State University", "location": "Hays, KS", "state": "Kansas", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Very international-friendly. Large international enrollment. Scholarships available.", "acceptance_rate": "90%", "notable_alumni": "Chadron State rival", "ranking": 115, "website": "https://fhsutgers.com", "image_url": img1, "coaches": [{"name": "Mark Johnson", "title": "Head Coach", "email": "mjohnson@fhsu.edu", "phone": "+1-785-628-4050"}]},
        {"name": "Washburn University", "location": "Topeka, KS", "state": "Kansas", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Affordable tuition. Athletic scholarships. Welcoming to international players.", "acceptance_rate": "100%", "notable_alumni": "Bob Boozer", "ranking": 116, "website": "https://washburnathletics.com", "image_url": img4, "coaches": [{"name": "Brett Ballard", "title": "Head Coach", "email": "brett.ballard@washburn.edu", "phone": "+1-785-670-1740"}]},
        {"name": "Nebraska-Kearney", "location": "Kearney, NE", "state": "Nebraska", "division": "Division II", "conference": "MIAA", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Safe midwest city. Strong international student office.", "acceptance_rate": "88%", "notable_alumni": "Various Heartland Conference athletes", "ranking": 117, "website": "https://unklopers.com", "image_url": img2, "coaches": [{"name": "Kevin Lofton", "title": "Head Coach", "email": "klofton@unk.edu", "phone": "+1-308-865-8519"}]},
        {"name": "Lincoln Memorial University", "location": "Harrogate, TN", "state": "Tennessee", "division": "Division II", "conference": "SAC", "foreign_friendly": True, "scholarship_info": "Full D2 scholarships. Rural campus — tight-knit community.", "acceptance_rate": "67%", "notable_alumni": "Various SAC champions", "ranking": 118, "website": "https://lmuathletics.com", "image_url": img3, "coaches": [{"name": "Phillip Cunningham", "title": "Head Coach", "email": "pcunningham@lmunet.edu", "phone": "+1-423-869-6215"}]},
        {"name": "Wingate University", "location": "Wingate, NC", "state": "North Carolina", "division": "Division II", "conference": "SAC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Close to Charlotte NBA market.", "acceptance_rate": "61%", "notable_alumni": "Various SAC standouts", "ranking": 119, "website": "https://bulldogsports.com", "image_url": img1, "coaches": [{"name": "Shay Sellers", "title": "Head Coach", "email": "ssellers@wingate.edu", "phone": "+1-704-233-8200"}]},
        {"name": "Lenoir-Rhyne University", "location": "Hickory, NC", "state": "North Carolina", "division": "Division II", "conference": "SAC", "foreign_friendly": True, "scholarship_info": "Scholarships available. SAC competitive program.", "acceptance_rate": "58%", "notable_alumni": "Various SAC stars", "ranking": 120, "website": "https://lrbears.com", "image_url": img4, "coaches": [{"name": "Chris Raber", "title": "Head Coach", "email": "craber@lr.edu", "phone": "+1-828-328-7195"}]},
        {"name": "Augustana University", "location": "Sioux Falls, SD", "state": "South Dakota", "division": "Division II", "conference": "NSIC", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Strong academic reputation. Nordic heritage — very international-open.", "acceptance_rate": "61%", "notable_alumni": "Various NSIC standouts", "ranking": 121, "website": "https://augustanaviking.com", "image_url": img2, "coaches": [{"name": "Tom Billeter", "title": "Head Coach", "email": "tbilleter@augie.edu", "phone": "+1-605-274-4620"}]},
        {"name": "Cal State San Marcos", "location": "San Marcos, CA", "state": "California", "division": "Division II", "conference": "CCAA", "foreign_friendly": True, "scholarship_info": "California sunshine and diverse campus. D2 scholarship opportunities.", "acceptance_rate": "63%", "notable_alumni": "Various CCAA athletes", "ranking": 122, "website": "https://athletics.csusm.edu", "image_url": img3, "coaches": [{"name": "Brian Newhall", "title": "Head Coach", "email": "bnewhall@csusm.edu", "phone": "+1-760-750-4707"}]},
        {"name": "Northern Michigan University", "location": "Marquette, MI", "state": "Michigan", "division": "Division II", "conference": "GLIAC", "foreign_friendly": True, "scholarship_info": "Full scholarships. Beautiful Great Lakes campus.", "acceptance_rate": "72%", "notable_alumni": "Steve Mariucci (connection)", "ranking": 123, "website": "https://goNMU.com", "image_url": img1, "coaches": [{"name": "Trevor Nordmann", "title": "Head Coach", "email": "tnordmann@nmu.edu", "phone": "+1-906-227-2270"}]},
        {"name": "Valdosta State University", "location": "Valdosta, GA", "state": "Georgia", "division": "Division II", "conference": "GSC", "foreign_friendly": True, "scholarship_info": "Full athletic scholarships. Warm Southern city.", "acceptance_rate": "56%", "notable_alumni": "Various GSC standouts", "ranking": 124, "website": "https://vstateblazers.com", "image_url": img4, "coaches": [{"name": "Mike Helfer", "title": "Head Coach", "email": "mhelfer@valdosta.edu", "phone": "+1-229-333-5892"}]},
        {"name": "Tiffin University", "location": "Tiffin, OH", "state": "Ohio", "division": "Division II", "conference": "G-MAC", "foreign_friendly": True, "scholarship_info": "Very international-friendly campus. Athletic scholarships. UK players have succeeded here.", "acceptance_rate": "65%", "notable_alumni": "Various G-MAC athletes", "ranking": 125, "website": "https://godragonathletics.com", "image_url": img2, "coaches": [{"name": "Damon Goodwin", "title": "Head Coach", "email": "dgoodwin@tiffin.edu", "phone": "+1-419-448-3375"}]},

        # ── NAIA ────────────────────────────────────────────────────────────────
        {"name": "Indiana Wesleyan University", "location": "Marion, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Flagship NAIA basketball program. Full scholarships. Multiple national championships.", "acceptance_rate": "67%", "notable_alumni": "Various NAIA All-Americans", "ranking": 201, "website": "https://indwes.edu/athletics", "image_url": img1, "coaches": [{"name": "Chad Briscoe", "title": "Head Coach", "email": "chad.briscoe@indwes.edu", "phone": "+1-765-677-2352"}]},
        {"name": "Oklahoma City University", "location": "Oklahoma City, OK", "state": "Oklahoma", "division": "NAIA", "conference": "Sooner Athletic", "foreign_friendly": True, "scholarship_info": "Top NAIA program. Full scholarships. Strong history of recruiting international talent.", "acceptance_rate": "82%", "notable_alumni": "Wayman Tisdale", "ranking": 202, "website": "https://ocusports.com", "image_url": img4, "coaches": [{"name": "Craig Coley", "title": "Head Coach", "email": "ccoley@okcu.edu", "phone": "+1-405-208-5988"}]},
        {"name": "The Master's University", "location": "Santa Clarita, CA", "state": "California", "division": "NAIA", "conference": "GSAC", "foreign_friendly": True, "scholarship_info": "Strong Christian university. Full NAIA scholarships. Multiple national titles.", "acceptance_rate": "72%", "notable_alumni": "Various GSAC champions", "ranking": 203, "website": "https://masters.edu/athletics", "image_url": img3, "coaches": [{"name": "Kelvin Starr", "title": "Head Coach", "email": "kstarr@masters.edu", "phone": "+1-661-362-2211"}]},
        {"name": "Vanguard University", "location": "Costa Mesa, CA", "state": "California", "division": "NAIA", "conference": "GSAC", "foreign_friendly": True, "scholarship_info": "Coastal California location. NAIA scholarships available.", "acceptance_rate": "58%", "notable_alumni": "Various Southern California NAIA stars", "ranking": 204, "website": "https://vanguardathletics.com", "image_url": img2, "coaches": [{"name": "Brian Gates", "title": "Head Coach", "email": "bgates@vanguard.edu", "phone": "+1-714-556-3610"}]},
        {"name": "Bethel University (Indiana)", "location": "Mishawaka, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Athletic scholarships. Christian environment. Strong NAIA basketball tradition.", "acceptance_rate": "68%", "notable_alumni": "Various Crossroads League stars", "ranking": 205, "website": "https://bethelpilots.com", "image_url": img1, "coaches": [{"name": "Mike Lightfoot", "title": "Head Coach", "email": "mlightfoot@betheluniversity.edu", "phone": "+1-574-807-7315"}]},
        {"name": "Spring Arbor University", "location": "Spring Arbor, MI", "state": "Michigan", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Full NAIA scholarships. Strong academic program.", "acceptance_rate": "70%", "notable_alumni": "Various Crossroads athletes", "ranking": 206, "website": "https://gosaucougars.com", "image_url": img4, "coaches": [{"name": "Kyle Manns", "title": "Head Coach", "email": "kmanns@arbor.edu", "phone": "+1-517-750-6520"}]},
        {"name": "Morningside University", "location": "Sioux City, IA", "state": "Iowa", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Very strong NAIA program. Full scholarships. Heartland of America.", "acceptance_rate": "64%", "notable_alumni": "Various GPAC All-Americans", "ranking": 207, "website": "https://morningsidemustangs.com", "image_url": img2, "coaches": [{"name": "Shane Dreyer", "title": "Head Coach", "email": "sdreyer@morningside.edu", "phone": "+1-712-274-5305"}]},
        {"name": "Grand View University", "location": "Des Moines, IA", "state": "Iowa", "division": "NAIA", "conference": "HAAC", "foreign_friendly": True, "scholarship_info": "Capital city location. Full NAIA scholarships. Welcoming to international players.", "acceptance_rate": "66%", "notable_alumni": "Various HAAC standouts", "ranking": 208, "website": "https://grandviewvikings.com", "image_url": img3, "coaches": [{"name": "Duane Dolezal", "title": "Head Coach", "email": "ddolezal@grandview.edu", "phone": "+1-515-263-2856"}]},
        {"name": "Dordt University", "location": "Sioux Center, IA", "state": "Iowa", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Christian Reformed university. Full scholarships. International students very welcome.", "acceptance_rate": "70%", "notable_alumni": "Various GPAC champions", "ranking": 209, "website": "https://dordt.edu/athletics", "image_url": img1, "coaches": [{"name": "Ross Douma", "title": "Head Coach", "email": "rDouma@dordt.edu", "phone": "+1-712-722-6233"}]},
        {"name": "Concordia University (Nebraska)", "location": "Seward, NE", "state": "Nebraska", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Lutheran university. Athletic scholarships. Strong GPAC program.", "acceptance_rate": "97%", "notable_alumni": "Various GPAC standouts", "ranking": 210, "website": "https://cune.edu/athletics", "image_url": img4, "coaches": [{"name": "Grant Schmidt", "title": "Head Coach", "email": "gschmidt@cune.edu", "phone": "+1-402-643-7472"}]},
        {"name": "Hastings College", "location": "Hastings, NE", "state": "Nebraska", "division": "NAIA", "conference": "GPAC", "foreign_friendly": True, "scholarship_info": "Full NAIA scholarships. Small college feel with big basketball tradition.", "acceptance_rate": "74%", "notable_alumni": "Various Nebraska athletes", "ranking": 211, "website": "https://hastingsbroncos.com", "image_url": img2, "coaches": [{"name": "Craig Smith", "title": "Head Coach", "email": "csmith@hastings.edu", "phone": "+1-402-461-7391"}]},
        {"name": "Rocky Mountain College", "location": "Billings, MT", "state": "Montana", "division": "NAIA", "conference": "Frontier", "foreign_friendly": True, "scholarship_info": "Montana big sky country. NAIA scholarships. Excellent for outdoors-loving international players.", "acceptance_rate": "51%", "notable_alumni": "Various Frontier Conference athletes", "ranking": 212, "website": "https://rocky.edu/athletics", "image_url": img3, "coaches": [{"name": "Bill Dreikosen", "title": "Head Coach", "email": "bdreikosen@rocky.edu", "phone": "+1-406-657-1064"}]},
        {"name": "Carroll College", "location": "Helena, MT", "state": "Montana", "division": "NAIA", "conference": "Frontier", "foreign_friendly": True, "scholarship_info": "Montana capital city. Full scholarships. Beautiful mountain setting.", "acceptance_rate": "57%", "notable_alumni": "Various Frontier Conference standouts", "ranking": 213, "website": "https://carroll.edu/athletics", "image_url": img1, "coaches": [{"name": "Patrick Mullen", "title": "Head Coach", "email": "pmullen@carroll.edu", "phone": "+1-406-447-4380"}]},
        {"name": "Valley City State University", "location": "Valley City, ND", "state": "North Dakota", "division": "NAIA", "conference": "NSAA", "foreign_friendly": True, "scholarship_info": "Full NAIA scholarships. Safe small college town.", "acceptance_rate": "100%", "notable_alumni": "Various NSAA athletes", "ranking": 214, "website": "https://vcstatevikings.com", "image_url": img4, "coaches": [{"name": "Ryan Thompson", "title": "Head Coach", "email": "rthompson@vcsu.edu", "phone": "+1-701-845-7706"}]},
        {"name": "Eastern Oregon University", "location": "La Grande, OR", "state": "Oregon", "division": "NAIA", "conference": "Cascade", "foreign_friendly": True, "scholarship_info": "Pacific Northwest. NAIA scholarships. International students supported.", "acceptance_rate": "100%", "notable_alumni": "Various Cascade Conference players", "ranking": 215, "website": "https://eou.edu/athletics", "image_url": img2, "coaches": [{"name": "Paul Caudell", "title": "Head Coach", "email": "pcaudell@eou.edu", "phone": "+1-541-962-3523"}]},
        {"name": "Saint Francis University (Indiana)", "location": "Fort Wayne, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Full scholarships. Franciscan values — compassionate international support.", "acceptance_rate": "70%", "notable_alumni": "Various Crossroads League stars", "ranking": 216, "website": "https://sfcougars.com", "image_url": img3, "coaches": [{"name": "Jake Talbott", "title": "Head Coach", "email": "jtalbott@sf.edu", "phone": "+1-260-399-7700"}]},
        {"name": "Marian University (Indiana)", "location": "Indianapolis, IN", "state": "Indiana", "division": "NAIA", "conference": "Crossroads League", "foreign_friendly": True, "scholarship_info": "Indianapolis location. Full NAIA scholarships. Welcoming to UK players.", "acceptance_rate": "68%", "notable_alumni": "Various Indianapolis NAIA athletes", "ranking": 217, "website": "https://marianknights.com", "image_url": img1, "coaches": [{"name": "Steve McKinley", "title": "Head Coach", "email": "smckinley@marian.edu", "phone": "+1-317-955-6000"}]},
        {"name": "Southwestern Assemblies of God University", "location": "Waxahachie, TX", "state": "Texas", "division": "NAIA", "conference": "RRAC", "foreign_friendly": True, "scholarship_info": "Faith-based university. Full NAIA scholarships. Texas location.", "acceptance_rate": "45%", "notable_alumni": "Various RRAC athletes", "ranking": 218, "website": "https://sagu.edu/athletics", "image_url": img4, "coaches": [{"name": "Aaron Burks", "title": "Head Coach", "email": "aburks@sagu.edu", "phone": "+1-972-825-4700"}]},
        {"name": "Oregon Tech", "location": "Klamath Falls, OR", "state": "Oregon", "division": "NAIA", "conference": "Cascade", "foreign_friendly": True, "scholarship_info": "STEM-focused university. Great for athlete-engineers. NAIA scholarships.", "acceptance_rate": "71%", "notable_alumni": "Various Pacific NW athletes", "ranking": 219, "website": "https://oit.edu/athletics", "image_url": img2, "coaches": [{"name": "Danny Miles", "title": "Head Coach", "email": "dmiles@oit.edu", "phone": "+1-541-885-1750"}]},
        {"name": "Jamestown University", "location": "Jamestown, ND", "state": "North Dakota", "division": "NAIA", "conference": "NSAA", "foreign_friendly": True, "scholarship_info": "Full scholarships. Safe college town. North Dakota open to international athletes.", "acceptance_rate": "78%", "notable_alumni": "Various NSAA standouts", "ranking": 220, "website": "https://jimmies.com", "image_url": img3, "coaches": [{"name": "Dennis Kallenbach", "title": "Head Coach", "email": "dkallenbach@uj.edu", "phone": "+1-701-252-3467"}]},

        # ── JUCO ──────────────────────────────────────────────────────────────
        {"name": "Coffeyville Community College", "location": "Coffeyville, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "One of the most famous JUCO basketball programs in America. Full ride scholarships. Pipeline to D1.", "acceptance_rate": "100%", "notable_alumni": "Many NBA players passed through", "ranking": 301, "website": "https://coffeyville.edu", "image_url": img1, "coaches": [{"name": "Kyle Johnson", "title": "Head Coach", "email": "kjohnson@coffeyville.edu", "phone": "+1-620-252-7021"}]},
        {"name": "Tyler Junior College", "location": "Tyler, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Div I", "foreign_friendly": True, "scholarship_info": "Elite JUCO program. Full scholarships. Strong D1 transfer pipeline. International players welcome.", "acceptance_rate": "100%", "notable_alumni": "Various NBA/D1 transfers", "ranking": 302, "website": "https://tjc.edu/athletics", "image_url": img4, "coaches": [{"name": "Brad Shorten", "title": "Head Coach", "email": "bshorten@tjc.edu", "phone": "+1-903-510-2400"}]},
        {"name": "Navarro College", "location": "Corsicana, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Div I", "foreign_friendly": True, "scholarship_info": "Famous JUCO (Last Chance U). Full scholarships. Excellent D1 transfer pipeline.", "acceptance_rate": "100%", "notable_alumni": "Multiple NBA players via transfers", "ranking": 303, "website": "https://navarrocollege.edu/athletics", "image_url": img2, "coaches": [{"name": "David Cook", "title": "Head Coach", "email": "dcook@navarrocollege.edu", "phone": "+1-903-875-7578"}]},
        {"name": "South Plains College", "location": "Levelland, TX", "state": "Texas", "division": "JUCO", "conference": "WJCAC", "foreign_friendly": True, "scholarship_info": "Top NJCAA program. Full scholarships. Very competitive basketball.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 304, "website": "https://southplainscollege.edu", "image_url": img3, "coaches": [{"name": "Steve Green", "title": "Head Coach", "email": "sgreen@southplainscollege.edu", "phone": "+1-806-894-9611"}]},
        {"name": "Hutchinson Community College", "location": "Hutchinson, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Strong NJCAA program. Full scholarships. Kansas JUCO powerhouse.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer athletes", "ranking": 305, "website": "https://hutchinson.edu/athletics", "image_url": img1, "coaches": [{"name": "Brian Ostermann", "title": "Head Coach", "email": "bostermann@hutchinson.edu", "phone": "+1-620-665-3536"}]},
        {"name": "Barton County Community College", "location": "Great Bend, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Strong basketball program. Full NJCAA scholarships. Kansas JUCO.", "acceptance_rate": "100%", "notable_alumni": "Various KJCCC standouts", "ranking": 306, "website": "https://bartonccc.edu/athletics", "image_url": img4, "coaches": [{"name": "James Garrison", "title": "Head Coach", "email": "jgarrison@bartonccc.edu", "phone": "+1-620-792-2701"}]},
        {"name": "Seward County Community College", "location": "Liberal, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "NJCAA basketball powerhouse. Full scholarships. Recruits internationally.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 307, "website": "https://sccc.edu/athletics", "image_url": img2, "coaches": [{"name": "Jason Sautter", "title": "Head Coach", "email": "jsautter@sccc.edu", "phone": "+1-620-629-2736"}]},
        {"name": "Garden City Community College", "location": "Garden City, KS", "state": "Kansas", "division": "JUCO", "conference": "KJCCC", "foreign_friendly": True, "scholarship_info": "Top NJCAA program. Full scholarships. History of producing D1 transfers.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfers", "ranking": 308, "website": "https://gcccks.edu/athletics", "image_url": img3, "coaches": [{"name": "Vance Walberg", "title": "Head Coach", "email": "vwalberg@gcccks.edu", "phone": "+1-620-276-7611"}]},
        {"name": "Kilgore College", "location": "Kilgore, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_info": "Strong East Texas JUCO. Full scholarships. Solid D1 pipeline.", "acceptance_rate": "100%", "notable_alumni": "Various D1/professional players", "ranking": 309, "website": "https://kilgore.edu/athletics", "image_url": img1, "coaches": [{"name": "Tony Hooper", "title": "Head Coach", "email": "thooper@kilgore.edu", "phone": "+1-903-983-8238"}]},
        {"name": "Trinity Valley Community College", "location": "Athens, TX", "state": "Texas", "division": "JUCO", "conference": "NJCAA Region XIV", "foreign_friendly": True, "scholarship_info": "Texas JUCO powerhouse. Full scholarships. Great transfer record.", "acceptance_rate": "100%", "notable_alumni": "Various NBA/D1 transfers", "ranking": 310, "website": "https://tvcc.edu/athletics", "image_url": img4, "coaches": [{"name": "Jamie Dement", "title": "Head Coach", "email": "jdement@tvcc.edu", "phone": "+1-903-675-6352"}]},
        {"name": "Northeastern Oklahoma A&M College", "location": "Miami, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Strong Oklahoma JUCO. Full scholarships. Good D2/NAIA pipeline.", "acceptance_rate": "100%", "notable_alumni": "Various NAIA/D2 transfers", "ranking": 311, "website": "https://neo.edu/athletics", "image_url": img2, "coaches": [{"name": "Vince Menz", "title": "Head Coach", "email": "vmenz@neo.edu", "phone": "+1-918-540-6297"}]},
        {"name": "Northern Oklahoma College", "location": "Tonkawa, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Full NJCAA scholarships. Strong Oklahoma JUCO basketball.", "acceptance_rate": "100%", "notable_alumni": "Various D1/D2 transfer athletes", "ranking": 312, "website": "https://noc.edu/athletics", "image_url": img3, "coaches": [{"name": "Willie Sherrod", "title": "Head Coach", "email": "wsherrod@noc.edu", "phone": "+1-580-628-6226"}]},
        {"name": "Iowa Western Community College", "location": "Council Bluffs, IA", "state": "Iowa", "division": "JUCO", "conference": "ICCAC", "foreign_friendly": True, "scholarship_info": "Strong NJCAA Div I program. Full scholarships. Midwest JUCO powerhouse.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer players", "ranking": 313, "website": "https://iowawestern.edu/athletics", "image_url": img1, "coaches": [{"name": "Todd Millikan", "title": "Head Coach", "email": "tmillikan@iwcc.edu", "phone": "+1-712-325-3258"}]},
        {"name": "Wabash Valley College", "location": "Mount Carmel, IL", "state": "Illinois", "division": "JUCO", "conference": "NJCAA Region XXIV", "foreign_friendly": True, "scholarship_info": "Illinois JUCO with full scholarships. Strong transfer record to D1.", "acceptance_rate": "100%", "notable_alumni": "Various Big Ten/Big East transfers", "ranking": 314, "website": "https://wvc.edu/athletics", "image_url": img4, "coaches": [{"name": "Kyle Smithpeters", "title": "Head Coach", "email": "ksmithpeters@wvc.edu", "phone": "+1-618-262-8641"}]},
        {"name": "Vincennes University", "location": "Vincennes, IN", "state": "Indiana", "division": "JUCO", "conference": "NJCAA Region XII", "foreign_friendly": True, "scholarship_info": "One of the top JUCOs in the Midwest. Full scholarships. Strong D1 transfer pipeline.", "acceptance_rate": "100%", "notable_alumni": "Larry Bird attended briefly", "ranking": 315, "website": "https://vincennes.edu/athletics", "image_url": img2, "coaches": [{"name": "Todd Franklin", "title": "Head Coach", "email": "tfrankli@vinu.edu", "phone": "+1-812-888-5376"}]},
        {"name": "Pima Community College", "location": "Tucson, AZ", "state": "Arizona", "division": "JUCO", "conference": "ACCAC", "foreign_friendly": True, "scholarship_info": "Arizona JUCO. Full scholarships. Good pathway to Arizona/Arizona State area D1 programs.", "acceptance_rate": "100%", "notable_alumni": "Various AZ D1 transfers", "ranking": 316, "website": "https://pima.edu/athletics", "image_url": img3, "coaches": [{"name": "Todd Welch", "title": "Head Coach", "email": "twelch@pima.edu", "phone": "+1-520-206-4638"}]},
        {"name": "Carl Albert State College", "location": "Poteau, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Oklahoma JUCO. Full scholarships. Good basketball tradition.", "acceptance_rate": "100%", "notable_alumni": "Various NAIA/D2 transfers", "ranking": 317, "website": "https://carlalbert.edu/athletics", "image_url": img1, "coaches": [{"name": "Seth Williams", "title": "Head Coach", "email": "swilliams@carlalbert.edu", "phone": "+1-918-647-1365"}]},
        {"name": "Connors State College", "location": "Warner, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Full NJCAA scholarships. Oklahoma JUCO basketball program.", "acceptance_rate": "100%", "notable_alumni": "Various Oklahoma D1/NAIA transfers", "ranking": 318, "website": "https://connorsstate.edu/athletics", "image_url": img4, "coaches": [{"name": "Kerry McSpadden", "title": "Head Coach", "email": "kmcspadden@connorsstate.edu", "phone": "+1-918-463-6219"}]},
        {"name": "Iowa Central Community College", "location": "Fort Dodge, IA", "state": "Iowa", "division": "JUCO", "conference": "ICCAC", "foreign_friendly": True, "scholarship_info": "Iowa JUCO powerhouse. Full scholarships. Multiple NJCAA national tournament appearances.", "acceptance_rate": "100%", "notable_alumni": "Various D1 transfer athletes", "ranking": 319, "website": "https://iowacentral.edu/athletics", "image_url": img2, "coaches": [{"name": "Ben Johnson", "title": "Head Coach", "email": "bjohnson@iowacentral.edu", "phone": "+1-515-574-1111"}]},
        {"name": "Eastern Oklahoma State College", "location": "Wilburton, OK", "state": "Oklahoma", "division": "JUCO", "conference": "NJCAA Region II", "foreign_friendly": True, "scholarship_info": "Full scholarships. Oklahoma JUCO. Good pathway to regional D2/NAIA programs.", "acceptance_rate": "100%", "notable_alumni": "Various regional transfers", "ranking": 320, "website": "https://eosc.edu/athletics", "image_url": img3, "coaches": [{"name": "Garrett Cantrell", "title": "Head Coach", "email": "gcantrell@eosc.edu", "phone": "+1-918-465-2361"}]},
    ]

    inserted = 0
    for c in extended:
        exists = await db.colleges.find_one({"name": c["name"]})
        if not exists:
            c["created_at"] = ts
            await db.colleges.insert_one(c)
            inserted += 1
    if inserted:
        logger.info(f"Seeded {inserted} extended colleges (D2/NAIA/JUCO)")


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
    colleges = await db.colleges.find(query, {"_id": 1, "name": 1, "location": 1, "state": 1, "division": 1, "conference": 1, "foreign_friendly": 1, "ranking": 1, "acceptance_rate": 1, "coaches": 1, "image_url": 1, "scholarship_info": 1, "notable_alumni": 1, "website": 1}).sort("ranking", 1).to_list(500)
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
async def get_my_colleges(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return []
    # Bulk fetch all colleges in one query
    college_ids = []
    for t in tracked:
        try:
            college_ids.append(ObjectId(t["college_id"]))
        except Exception:
            pass
    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids}}).to_list(500)
    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    result = []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if college:
            college["id"] = str(college.pop("_id"))
            t["id"] = str(t.pop("_id"))
            t["college"] = college
            result.append(t)
    return result

@api_router.post("/my-colleges")
async def track_college(data: CollegeTrackedCreate, current_user: UserModel = Depends(get_current_user)):
    existing = await db.tracked_colleges.find_one({"user_id": current_user.user_id, "college_id": data.college_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already tracking this college")
    doc = {"user_id": current_user.user_id, "college_id": data.college_id, "notes": data.notes, "status": "interested", "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.tracked_colleges.insert_one(doc)
    doc.pop("_id", None)
    return {"id": str(result.inserted_id), **doc}

@api_router.delete("/my-colleges/{college_id}")
async def untrack_college(college_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.tracked_colleges.delete_one({"user_id": current_user.user_id, "college_id": college_id})
    return {"message": "Removed from tracking"}

@api_router.patch("/my-colleges/{college_id}/status")
async def update_tracked_status(college_id: str, body: dict, current_user: UserModel = Depends(get_current_user)):
    update_fields = {
        "status": body.get("status", "interested"),
        "notes": body.get("notes", ""),
    }
    for key in ("follow_up_date", "application_deadline", "signing_day"):
        if key in body:
            update_fields[key] = body[key]
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$set": update_fields}
    )
    return {"message": "Updated"}


@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: UserModel = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    seven_days = (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat()
    thirty_days = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return {"overdue_followups": [], "upcoming_followups": [], "upcoming_deadlines": []}
    college_ids_obj = []
    for t in tracked:
        try:
            college_ids_obj.append(ObjectId(t["college_id"]))
        except Exception:
            pass
    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids_obj}}).to_list(500)
    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    overdue_followups, upcoming_followups, upcoming_deadlines = [], [], []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if not college:
            continue
        name = college.get("name", "")
        cid = t["college_id"]
        fu = t.get("follow_up_date", "")
        if fu:
            if fu < today:
                overdue_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})
            elif fu <= seven_days:
                upcoming_followups.append({"college_id": cid, "name": name, "date": fu, "status": t.get("status")})
        for dkey, dtype in [("application_deadline", "Application"), ("signing_day", "Signing Day")]:
            dl = t.get(dkey, "")
            if dl and today <= dl <= thirty_days:
                upcoming_deadlines.append({"college_id": cid, "name": name, "deadline": dl, "type": dtype})
    return {
        "overdue_followups": sorted(overdue_followups, key=lambda x: x["date"]),
        "upcoming_followups": sorted(upcoming_followups, key=lambda x: x["date"]),
        "upcoming_deadlines": sorted(upcoming_deadlines, key=lambda x: x["deadline"]),
    }

# ─── Emails (no auth) ─────────────────────────────────────────────────────────
@api_router.get("/emails")
async def get_emails(current_user: UserModel = Depends(get_current_user), college_id: Optional[str] = None):
    query = {"user_id": current_user.user_id}
    if college_id:
        query["college_id"] = college_id
    emails = await db.emails.find(query).sort("created_at", -1).to_list(500)
    for e in emails:
        e["id"] = str(e.pop("_id"))
    return emails

@api_router.post("/emails")
async def log_email(data: EmailLogCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {"user_id": current_user.user_id, "college_id": data.college_id, "direction": data.direction, "subject": data.subject, "body": data.body, "coach_name": data.coach_name, "coach_email": data.coach_email, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.emails.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.delete("/emails/{email_id}")
async def delete_email(email_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.emails.delete_one({"_id": ObjectId(email_id), "user_id": current_user.user_id})
    return {"message": "Deleted"}

@api_router.post("/emails/bulk")
async def bulk_import_emails(data: BulkEmailImport, current_user: UserModel = Depends(get_current_user)):
    """Import the same email sent to multiple colleges at once."""
    if not data.college_ids:
        raise HTTPException(status_code=400, detail="No colleges selected")
    docs = []
    sent_date = data.sent_date or datetime.now(timezone.utc).isoformat()
    for college_id in data.college_ids:
        try:
            college = await db.colleges.find_one({"_id": ObjectId(college_id)})
        except Exception:
            continue
        if not college:
            continue
        coach = (college.get("coaches") or [{}])[0]
        doc = {
            "user_id": current_user.user_id,
            "college_id": college_id,
            "direction": data.direction,
            "subject": data.subject,
            "body": data.body,
            "coach_name": data.coach_name or coach.get("name", ""),
            "coach_email": coach.get("email", ""),
            "created_at": sent_date,
        }
        docs.append(doc)
    if not docs:
        raise HTTPException(status_code=400, detail="No valid colleges found")
    result = await db.emails.insert_many(docs)
    return {"inserted": len(result.inserted_ids), "message": f"Logged email for {len(result.inserted_ids)} colleges"}


def _clean(val: str) -> str:
    if not val:
        return ""
    v = val.strip()
    import re
    v = re.sub(r'[^\x20-\x7E\u00C0-\u024F]', '', v)
    return v.strip()

def _map_type_to_direction(t: str) -> str:
    t = t.lower()
    if "received" in t or "reply" in t or "response" in t or "incoming" in t:
        return "received"
    return "sent"

@api_router.post("/emails/import-csv")
async def import_csv(current_user: UserModel = Depends(get_current_user), file: UploadFile = File(...)):
    """
    Import communications from CSV.
    Expected columns: College Name, Date (YYYY-MM-DD), Type, Coach Name, Coach Email,
    Assistant Coach Name, Assistant Coach Email, Subject, Notes,
    Follow Up Needed (yes/no), Follow Up Date (YYYY-MM-DD)
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = [{k.strip(): v for k, v in row.items()} for row in reader]

    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or unreadable")

    colleges_added = 0
    emails_added = 0
    duplicates_skipped = 0
    ts = datetime.now(timezone.utc).isoformat()
    img_cycle = [
        "https://images.unsplash.com/photo-1562774053-701939374585?w=400",
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400",
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
    ]

    for i, row in enumerate(rows):
        college_name = _clean(row.get("College Name", ""))
        if not college_name:
            continue

        date_str = _clean(row.get("Date (YYYY-MM-DD)", ""))
        comm_type = _clean(row.get("Type", "Email Sent"))
        coach_name = _clean(row.get("Coach Name", ""))
        coach_email = _clean(row.get("Coach Email", ""))
        asst_coach_name = _clean(row.get("Assistant Coach Name", ""))
        asst_coach_email = _clean(row.get("Assistant Coach Email", ""))
        subject = _clean(row.get("Subject", ""))
        notes = _clean(row.get("Notes", ""))
        follow_up_needed = _clean(row.get("Follow Up Needed (yes/no)", "no")).lower() == "yes"
        follow_up_date = _clean(row.get("Follow Up Date (YYYY-MM-DD)", ""))

        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            dt = ts

        direction = _map_type_to_direction(comm_type)

        # Match college by name (fuzzy: strip suffixes like "(D-I)", "– Tigers" etc.)
        name_base = college_name.split("(")[0].split("–")[0].split("-")[0].strip()
        existing_college = await db.colleges.find_one(
            {"name": {"$regex": f"^{name_base}", "$options": "i"}}
        )

        if existing_college:
            college_id = str(existing_college["_id"])
            # Enrich coaches if CSV has better data
            current_names = [c.get("name", "").lower() for c in existing_college.get("coaches", [])]
            new_coaches = []
            if coach_name and "not listed" not in coach_name.lower() and coach_name.lower() not in current_names:
                new_coaches.append({"name": coach_name, "title": "Head Coach", "email": coach_email, "phone": ""})
            if asst_coach_name and asst_coach_name.lower() not in current_names:
                new_coaches.append({"name": asst_coach_name, "title": "Assistant Coach", "email": asst_coach_email, "phone": ""})
            if new_coaches:
                await db.colleges.update_one({"_id": existing_college["_id"]}, {"$push": {"coaches": {"$each": new_coaches}}})
        else:
            coaches = []
            if coach_name and "not listed" not in coach_name.lower():
                coaches.append({"name": coach_name, "title": "Head Coach", "email": coach_email, "phone": ""})
            if asst_coach_name:
                coaches.append({"name": asst_coach_name, "title": "Assistant Coach", "email": asst_coach_email, "phone": ""})
            result = await db.colleges.insert_one({
                "name": college_name, "location": "", "state": "", "division": "Unknown",
                "conference": "", "foreign_friendly": True,
                "scholarship_info": "Contacted — details to be confirmed.",
                "acceptance_rate": "N/A", "notable_alumni": "", "ranking": 900 + i,
                "website": "", "image_url": img_cycle[i % 4], "coaches": coaches,
                "created_at": ts, "from_csv": True,
            })
            college_id = str(result.inserted_id)
            colleges_added += 1

        # Auto-track with status "contacted"
        tracked = await db.tracked_colleges.find_one({"user_id": current_user.user_id, "college_id": college_id})
        follow_note = f" | Follow up by: {follow_up_date}" if follow_up_needed and follow_up_date else ""
        if not tracked:
            await db.tracked_colleges.insert_one({
                "user_id": current_user.user_id, "college_id": college_id,
                "notes": (notes or "") + follow_note, "status": "contacted",
                "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date,
                "created_at": ts,
            })
        else:
            if tracked.get("status") == "interested":
                await db.tracked_colleges.update_one(
                    {"user_id": current_user.user_id, "college_id": college_id},
                    {"$set": {"status": "contacted", "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date}}
                )

        # Log email — skip exact duplicates (same college + subject + date)
        dup = await db.emails.find_one({"user_id": current_user.user_id, "college_id": college_id, "subject": subject, "created_at": dt})
        if not dup:
            await db.emails.insert_one({
                "user_id": current_user.user_id, "college_id": college_id,
                "direction": direction, "subject": subject, "body": notes,
                "coach_name": coach_name if "not listed" not in coach_name.lower() else "",
                "coach_email": coach_email,
                "follow_up_needed": follow_up_needed, "follow_up_date": follow_up_date,
                "created_at": dt,
            })
            emails_added += 1
        else:
            duplicates_skipped += 1

    return {
        "colleges_added": colleges_added,
        "emails_added": emails_added,
        "duplicates_skipped": duplicates_skipped,
        "total_rows": len(rows),
        "message": f"Import complete: {emails_added} emails logged, {colleges_added} new colleges added."
    }


@api_router.get("/dashboard/stats")
async def get_stats(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.count_documents({"user_id": current_user.user_id})
    emails_sent = await db.emails.count_documents({"user_id": current_user.user_id, "direction": "sent"})
    emails_received = await db.emails.count_documents({"user_id": current_user.user_id, "direction": "received"})
    recent_emails = await db.emails.find({"user_id": current_user.user_id}).sort("created_at", -1).to_list(5)
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
{f"- Contact Email: {data.user_email}" if data.user_email else ""}
{f"- Contact Phone: {data.user_phone}" if data.user_phone else ""}
{f"- Highlight Tape: {data.highlight_tape_url}" if data.highlight_tape_url else ""}

Write a compelling, personal, and professional email. Include:
1. Strong opening that catches attention
2. Brief introduction mentioning England U18 status
3. Why this specific college/program appeals to them
4. Key athletic highlights
5. Academic commitment mention
{f"6. Naturally include the highlight tape link: {data.highlight_tape_url}" if data.highlight_tape_url else "6. Encourage the coach to request a highlight tape"}
7. Clear call to action
8. Professional sign-off with the player's full name{', email address' if data.user_email else ''}{' and phone number' if data.user_phone else ''}

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

@api_router.post("/emails/log-reply")
async def log_reply(data: ReplyLogRequest, current_user: UserModel = Depends(get_current_user)):
    received_at = data.received_date or datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": current_user.user_id, "college_id": data.college_id,
        "direction": "received",
        "subject": data.subject or f"Reply from coach",
        "body": data.body, "coach_name": data.coach_name,
        "coach_email": data.coach_email, "created_at": received_at,
    }
    result = await db.emails.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": data.college_id, "status": {"$in": ["interested", "contacted"]}},
        {"$set": {"status": "replied", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return doc


@api_router.get("/responses/summary")
async def get_response_summary(current_user: UserModel = Depends(get_current_user)):
    tracked = await db.tracked_colleges.find({"user_id": current_user.user_id}).to_list(500)
    if not tracked:
        return []
    college_ids_str = [t["college_id"] for t in tracked]
    college_ids_obj = []
    for cid in college_ids_str:
        try:
            college_ids_obj.append(ObjectId(cid))
        except Exception:
            pass
    colleges_cursor = await db.colleges.find({"_id": {"$in": college_ids_obj}}).to_list(500)
    colleges_map = {str(c["_id"]): c for c in colleges_cursor}
    # Aggregate email stats per college
    pipeline = [
        {"$match": {"user_id": current_user.user_id, "college_id": {"$in": college_ids_str}}},
        {"$group": {
            "_id": {"college_id": "$college_id", "direction": "$direction"},
            "count": {"$sum": 1}, "last_date": {"$max": "$created_at"},
            "last_subject": {"$last": "$subject"}, "last_body": {"$last": "$body"},
            "last_coach": {"$last": "$coach_name"},
        }}
    ]
    email_stats_raw = await db.emails.aggregate(pipeline).to_list(1000)
    email_stats = {}
    for stat in email_stats_raw:
        cid = stat["_id"]["college_id"]
        direction = stat["_id"]["direction"]
        if cid not in email_stats:
            email_stats[cid] = {}
        email_stats[cid][direction] = {
            "count": stat["count"], "last_date": stat["last_date"],
            "last_subject": stat["last_subject"], "last_body": stat["last_body"],
            "last_coach": stat["last_coach"],
        }
    result = []
    for t in tracked:
        college = colleges_map.get(t["college_id"])
        if not college:
            continue
        result.append({
            "tracked_id": str(t["_id"]),
            "college_id": t["college_id"],
            "college": {
                "id": str(college["_id"]),
                "name": college.get("name", ""),
                "division": college.get("division", ""),
                "location": college.get("location", ""),
                "coaches": college.get("coaches", []),
            },
            "status": t.get("status", "interested"),
            "notes": t.get("notes", ""),
            "sent": email_stats.get(t["college_id"], {}).get("sent"),
            "received": email_stats.get(t["college_id"], {}).get("received"),
        })
    return result


@api_router.post("/ai/follow-up")
async def generate_follow_up(data: FollowUpRequest):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    prompt = f"""You are an expert college basketball recruitment advisor helping an 18-year-old UK player (England Under-18) respond to a coach's reply.

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


# ─── Player Profile ───────────────────────────────────────────────────────────
@api_router.get("/profile")
async def get_profile(current_user: UserModel = Depends(get_current_user)):
    doc = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not doc:
        return {}
    doc.pop("user_id", None)
    return doc

@api_router.put("/profile")
async def save_profile(data: PlayerProfile, current_user: UserModel = Depends(get_current_user)):
    # Only update fields that have a value — prevents accidentally wiping existing data
    payload = {k: v for k, v in data.dict().items() if v is not None and v != ""}
    payload["user_id"] = current_user.user_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.profiles.update_one({"user_id": current_user.user_id}, {"$set": payload}, upsert=True)
    return {"message": "Profile saved"}

# ─── AI Match ────────────────────────────────────────────────────────────────
@api_router.get("/ai/match")
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
        college_lines.append(
            f"{str(c['_id'])}|{c.get('name','?')}|{c.get('division','?')}|{ff}|{c.get('acceptance_rate','?')}"
        )

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
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message="You are a college basketball recruitment AI. Return only valid JSON."
    ).with_model("openai", "gpt-4.1-mini")
    response = await chat.send_message(UserMessage(text=prompt))

    try:
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        result = json.loads(json_match.group()) if json_match else json.loads(response)
    except Exception:
        raise HTTPException(status_code=500, detail="AI response could not be parsed. Please try again.")

    return result


# ─── Dashboard Analytics ──────────────────────────────────────────────────────
@api_router.get("/dashboard/analytics")
async def get_analytics(current_user: UserModel = Depends(get_current_user)):
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    emails = await db.emails.find(
        {"user_id": current_user.user_id, "created_at": {"$gte": thirty_days_ago}},
        {"_id": 0, "direction": 1, "created_at": 1}
    ).to_list(1000)

    daily_sent = defaultdict(int)
    daily_received = defaultdict(int)
    for email in emails:
        date_str = str(email.get("created_at", ""))[:10]
        if email["direction"] == "sent":
            daily_sent[date_str] += 1
        else:
            daily_received[date_str] += 1

    activity = []
    for i in range(29, -1, -1):
        d = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        activity.append({"date": d, "sent": daily_sent.get(d, 0), "received": daily_received.get(d, 0)})

    tracked = await db.tracked_colleges.count_documents({"user_id": current_user.user_id})
    contacted = await db.tracked_colleges.count_documents(
        {"user_id": current_user.user_id, "status": {"$in": ["contacted", "replied", "rejected"]}}
    )
    replied = await db.tracked_colleges.count_documents({"user_id": current_user.user_id, "status": "replied"})

    pipeline = [
        {"$match": {"user_id": current_user.user_id}},
        {"$addFields": {"college_oid": {"$toObjectId": "$college_id"}}},
        {"$lookup": {"from": "colleges", "localField": "college_oid", "foreignField": "_id", "as": "college"}},
        {"$unwind": {"path": "$college", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$college.division", "count": {"$sum": 1}}}
    ]
    div_raw = await db.tracked_colleges.aggregate(pipeline).to_list(20)
    division_breakdown = [{"division": d["_id"] or "Unknown", "count": d["count"]} for d in div_raw if d["_id"]]

    return {
        "activity": activity,
        "funnel": {"tracked": tracked, "contacted": contacted, "replied": replied},
        "division_breakdown": sorted(division_breakdown, key=lambda x: -x["count"])
    }


# ─── College Application Checklist ───────────────────────────────────────────
class ChecklistUpdate(BaseModel):
    items: List[dict]

class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    message_type: str = "initial_outreach"

class CallNoteCreate(BaseModel):
    content: str
    date: Optional[str] = ""

DEFAULT_CHECKLIST = [
    {"id": "email_sent", "label": "Send initial email to coach"},
    {"id": "info_requested", "label": "Request programme info / brochure"},
    {"id": "highlight_tape", "label": "Send highlight tape (Hudl / YouTube)"},
    {"id": "transcripts", "label": "Gather academic transcripts"},
    {"id": "ncaa_id", "label": "Register with NCAA Eligibility Center"},
    {"id": "sat_act", "label": "Complete SAT / ACT exam (if required)"},
    {"id": "application", "label": "Submit college application"},
    {"id": "financial_aid", "label": "Apply for financial aid / scholarship forms"},
    {"id": "visa", "label": "Apply for student visa (F-1)"},
    {"id": "nli_signed", "label": "Sign National Letter of Intent (NLI)"},
]

@api_router.get("/checklist/{college_id}")
async def get_checklist(college_id: str, current_user: UserModel = Depends(get_current_user)):
    doc = await db.college_checklists.find_one(
        {"user_id": current_user.user_id, "college_id": college_id}, {"_id": 0}
    )
    if doc:
        return doc
    items = [{"id": i["id"], "label": i["label"], "checked": False} for i in DEFAULT_CHECKLIST]
    return {"user_id": current_user.user_id, "college_id": college_id, "items": items}

@api_router.put("/checklist/{college_id}")
async def update_checklist(college_id: str, data: ChecklistUpdate, current_user: UserModel = Depends(get_current_user)):
    await db.college_checklists.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$set": {"items": data.items, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Checklist updated"}


# ─── Email Template Library ───────────────────────────────────────────────────
@api_router.get("/templates")
async def get_templates(current_user: UserModel = Depends(get_current_user)):
    templates = await db.email_templates.find({"user_id": current_user.user_id}).sort("created_at", -1).to_list(100)
    for t in templates:
        t["id"] = str(t.pop("_id"))
    return templates

@api_router.post("/templates")
async def save_template(data: EmailTemplateCreate, current_user: UserModel = Depends(get_current_user)):
    doc = {
        "user_id": current_user.user_id,
        "name": data.name,
        "subject": data.subject,
        "body": data.body,
        "message_type": data.message_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.email_templates.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.email_templates.delete_one({"_id": ObjectId(template_id), "user_id": current_user.user_id})
    return {"message": "Deleted"}


# ─── Coach Call Notes ─────────────────────────────────────────────────────────
@api_router.post("/my-colleges/{college_id}/call-note")
async def add_call_note(college_id: str, data: CallNoteCreate, current_user: UserModel = Depends(get_current_user)):
    note = {
        "id": str(uuid.uuid4()),
        "content": data.content,
        "date": data.date or datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$push": {"call_notes": note}}
    )
    return note

@api_router.delete("/my-colleges/{college_id}/call-note/{note_id}")
async def delete_call_note(college_id: str, note_id: str, current_user: UserModel = Depends(get_current_user)):
    await db.tracked_colleges.update_one(
        {"user_id": current_user.user_id, "college_id": college_id},
        {"$pull": {"call_notes": {"id": note_id}}}
    )
    return {"message": "Deleted"}


# ─── Root ──────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "CourtBound API v1.0"}

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown():
    client.close()
