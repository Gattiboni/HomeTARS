from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime

from repository import BaseRepository, MongoRepository, SupabaseRepository

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (default active storage)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Optional Supabase configuration (off by default)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# Select repository implementation
repo: BaseRepository
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        repo = SupabaseRepository(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logging.info("SupabaseRepository configured (off-by-default now active due to env).")
    except Exception as e:
        logging.warning(f"SupabaseRepository init failed: {e}. Falling back to MongoRepository.")
        repo = MongoRepository(db)
else:
    repo = MongoRepository(db)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ----------------------------
# Models (Contracts)
# ----------------------------
class SystemStatus(BaseModel):
    status: Literal['ONLINE', 'OFFLINE'] = 'ONLINE'
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LogItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ts: datetime = Field(default_factory=datetime.utcnow)
    level: Literal['system', 'user', 'error'] = 'system'
    text: str

class LogsResponse(BaseModel):
    items: List[LogItem]

class CommandRequest(BaseModel):
    command: str

class CommandResponse(BaseModel):
    echo: str
    lines: List[str]
    level: Literal['system', 'error'] = 'system'
    wrote_log: bool = True


# ----------------------------
# Helpers
# ----------------------------

def _known_command_lines(cmd: str) -> (List[str], str):
    cmd_l = cmd.strip().toLowerCase() if hasattr(cmd, 'toLowerCase') else cmd.strip().lower()
    if cmd_l == "help":
        return ([
            "AVAILABLE COMMANDS:",
            " - help   : list available commands",
            " - status : show system status",
            " - clear  : clear the terminal",
            " - time   : show current system time",
        ], "system")
    if cmd_l == "status":
        return (["SYSTEM STATUS: ONLINE / CORE STABLE"], "system")
    if cmd_l == "time":
        now = datetime.utcnow().strftime('%H:%M:%S UTC')
        return ([f"SYSTEM TIME: {now}"], "system")
    if cmd_l == "clear":
        return ([], "system")
    return (["COMMAND NOT RECOGNIZED."], "error")


# ----------------------------
# Routes
# ----------------------------
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/status", response_model=SystemStatus)
async def get_status():
    await repo.ensure_status_initialized()
    s = await repo.read_status()
    return SystemStatus(status=s.status, updated_at=s.updated_at)


@api_router.get("/logs", response_model=LogsResponse)
async def get_logs(
    limit: int = Query(100, ge=1, le=1000),
    since: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
):
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except Exception:
            raise HTTPException(status_code=400, detail="invalid 'since' format")
    items = await repo.get_logs(limit=limit, since=since_dt, level=level)
    return LogsResponse(items=[LogItem(id=i.id, ts=i.ts, level=i.level, text=i.text) for i in items])


@api_router.post("/command", response_model=CommandResponse)
async def post_command(payload: CommandRequest):
    cmd = (payload.command or "").strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="command is required")

    # store user echo log
    await repo.write_log("user", f"> {cmd}")

    lines, level = _known_command_lines(cmd)

    # side-effect: write response lines (except clear)
    if cmd.lower() != "clear":
        for ln in lines:
            await repo.write_log("error" if level == "error" else "system", ln)

    # record command
    try:
        await repo.record_command(cmd, level, lines)
    except Exception:
        pass  # non-blocking

    return CommandResponse(echo=cmd, lines=lines, level=level, wrote_log=True)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    await repo.ensure_status_initialized()

@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        await repo.close()
    finally:
        client.close()