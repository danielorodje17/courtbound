from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter

from database import db, client
from seed_data import seed_colleges, seed_extended_colleges, _seed_european_colleges_startup
from routers import auth, colleges, tracked, emails, dashboard, goals, ai, profile, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CourtBound API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(colleges.router)
api_router.include_router(tracked.router)
api_router.include_router(emails.router)
api_router.include_router(dashboard.router)
api_router.include_router(goals.router)
api_router.include_router(ai.router)
api_router.include_router(profile.router)
api_router.include_router(admin.router)

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    count = await db.colleges.count_documents({})
    if count == 0:
        await seed_colleges()
    await seed_extended_colleges()
    await _seed_european_colleges_startup()
    logger.info("CourtBound API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@app.get("/")
async def root():
    return {"message": "CourtBound API is running"}
