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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
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
# Utilities
# ----------------------------
async def ensure_status_initialized():
    existing = await db.system_status.find_one({"_id": "singleton"})
    if not existing:
        await db.system_status.insert_one({
            "_id": "singleton",
            "status": "ONLINE",
            "updated_at": datetime.utcnow(),
        })

async def read_status() -> SystemStatus:
    doc = await db.system_status.find_one({"_id": "singleton"})
    if not doc:
        await ensure_status_initialized()
        doc = await db.system_status.find_one({"_id": "singleton"})
    return SystemStatus(status=doc.get("status", "ONLINE"), updated_at=doc.get("updated_at", datetime.utcnow()))

async def write_log(level: str, text: str, ts: Optional[datetime] = None) -> LogItem:
    obj = LogItem(level=level, text=text, ts=ts or datetime.utcnow())
    await db.logs.insert_one({
        "_id": obj.id,
        "ts": obj.ts,
        "level": obj.level,
        "text": obj.text,
    })
    return obj


def _known_command_lines(cmd: str) -> (List[str], str):
    cmd_l = cmd.strip().lower()
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
        # UI handles clearing; no lines
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
    await ensure_status_initialized()
    return await read_status()


@api_router.get("/logs", response_model=LogsResponse)
async def get_logs(
    limit: int = Query(100, ge=1, le=1000),
    since: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
):
    q = {}
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            q["ts"] = {"$gt": since_dt}
        except Exception:
            raise HTTPException(status_code=400, detail="invalid 'since' format")
    if level in {"system", "user", "error"}:
        q["level"] = level

    cursor = db.logs.find(q).sort("ts", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    items = [LogItem(id=str(doc.get("_id")), ts=doc["ts"], level=doc["level"], text=doc["text"]) for doc in docs]
    return LogsResponse(items=items)


@api_router.post("/command", response_model=CommandResponse)
async def post_command(payload: CommandRequest):
    cmd = (payload.command or "").strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="command is required")

    # store user command as a log
    await write_log("user", f"> {cmd}")

    lines, level = _known_command_lines(cmd)

    # side-effect: store system/error logs for the lines, except for 'clear'
    if cmd.lower() != "clear":
        for ln in lines:
            await write_log("error" if level == "error" else "system", ln)

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
    await ensure_status_initialized()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()