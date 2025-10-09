from fastapi import FastAPI, APIRouter, HTTPException, Query, WebSocket, UploadFile, File, Form
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
from difflib import get_close_matches
import requests
import base64

from repository import BaseRepository, MongoRepository, SupabaseRepository
from ws_manager import manager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (default active storage)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Optional Supabase configuration (off by default)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# OpenAI configuration for Phase 5 (audio + chat)
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_BASE = os.environ.get('OPENAI_BASE', 'https://api.openai.com')

# Select repository implementation
repo: BaseRepository
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        repo = SupabaseRepository(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logging.info("SupabaseRepository configured (active due to env).")
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
    level: Literal['system', 'user', 'error', 'info'] = 'system'
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

class AIRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None

class AIResponse(BaseModel):
    lines: List[str]
    level: Literal['info', 'system', 'error'] = 'info'

class TranscribeResponse(BaseModel):
    text: str
    language: Optional[str] = None

class TTSResponse(BaseModel):
    audio_base64: str
    format: Literal['mp3', 'wav', 'opus'] = 'mp3'


# ----------------------------
# Helpers
# ----------------------------
KNOWN = ["help", "status", "time", "clear"]

PERSONA_SYSTEM = (
    "You are TARS, an onboard AI with dry wit, mild sarcasm, and absolute honesty. "
    "Respond concisely, with a tone that balances military precision and subtle irony. "
    "You speak both English and Portuguese fluently, switching to match the user's language."
)

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
        return ([], "system")
    return (["COMMAND NOT RECOGNIZED."], "error")


def _ai_suggest(prompt: str) -> List[str]:
    p = (prompt or "").strip().lower()
    synonyms = {
        "statuz": "status",
        "stats": "status",
        "statuss": "status",
        "clr": "clear",
        "cls": "clear",
        "halp": "help",
        "hep": "help",
        "tym": "time",
        "clock": "time",
    }
    if p in synonyms:
        return [f"DID YOU MEAN: {synonyms[p]}?"]

    matches = get_close_matches(p, KNOWN, n=2, cutoff=0.6)
    if matches:
        if len(matches) == 1:
            return [f"DID YOU MEAN: {matches[0]}?"]
        return ["DID YOU MEAN:"] + [f" - {m}" for m in matches]

    return ["NO MATCH FOUND.", "TRY: help | status | time | clear"]


def _openai_headers():
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    return {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }


def _call_openai_chat(prompt: str) -> str:
    url = f"{OPENAI_BASE}/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": PERSONA_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 256,
    }
    headers = {**_openai_headers(), "Content-Type": "application/json"}
    r = requests.post(url, json=payload, headers=headers, timeout=30)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai chat error: {r.text}")
    data = r.json()
    return data["choices"][0]["message"]["content"].strip()


def _call_openai_whisper(file_bytes: bytes, filename: str, mime: str) -> dict:
    url = f"{OPENAI_BASE}/v1/audio/transcriptions"
    files = {
        'file': (filename, file_bytes, mime or 'application/octet-stream'),
    }
    data = {
        'model': 'whisper-1',
        'response_format': 'json',
        # language auto-detect
    }
    r = requests.post(url, headers=_openai_headers(), files=files, data=data, timeout=60)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai whisper error: {r.text}")
    return r.json()


def _call_openai_tts(text: str, voice: str = 'alloy', fmt: str = 'mp3') -> bytes:
    url = f"{OPENAI_BASE}/v1/audio/speech"
    payload = {
        "model": "gpt-4o-mini-tts",
        "voice": voice,
        "input": text,
        "format": fmt,
    }
    headers = {**_openai_headers(), "Content-Type": "application/json", "Accept": f"audio/{'mpeg' if fmt=='mp3' else fmt}"}
    r = requests.post(url, json=payload, headers=headers, timeout=60)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai tts error: {r.text}")
    return r.content


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

    # store user echo log and broadcast
    user_log = await repo.write_log("user", f"> {cmd}")
    await manager.broadcast_json({"type": "log", "item": {
        "id": user_log.id, "ts": user_log.ts, "level": user_log.level, "text": user_log.text
    }})

    lines, level = _known_command_lines(cmd)

    # side-effect: write response lines (except clear) and broadcast
    if cmd.lower() != "clear":
        for ln in lines:
            li = await repo.write_log("error" if level == "error" else "system", ln)
            await manager.broadcast_json({"type": "log", "item": {
                "id": li.id, "ts": li.ts, "level": li.level, "text": li.text
            }})

    # record command (non-blocking)
    try:
        await repo.record_command(cmd, level, lines)
    except Exception:
        pass

    return CommandResponse(echo=cmd, lines=lines, level=level, wrote_log=True)


@api_router.post("/ai", response_model=AIResponse)
async def post_ai(input: AIRequest):
    prompt = (input.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Phase 5: call real LLM (OpenAI Chat) with TARS persona
    try:
        text = _call_openai_chat(prompt)
    except HTTPException as e:
        # fallback to suggestions when LLM unavailable
        suggestions = _ai_suggest(prompt)
        for ln in suggestions:
            li = await repo.write_log("info", ln)
            await manager.broadcast_json({"type": "log", "item": {
                "id": li.id, "ts": li.ts, "level": li.level, "text": li.text
            }})
        return AIResponse(lines=suggestions, level='info')

    # persist AI lines (split into lines for terminal aesthetics)
    lines = [seg.strip() for seg in text.split('\n') if seg.strip()]
    if not lines:
        lines = [text]
    for ln in lines:
        li = await repo.write_log("info", ln)
        await manager.broadcast_json({"type": "log", "item": {
            "id": li.id, "ts": li.ts, "level": li.level, "text": li.text
        }})

    return AIResponse(lines=lines, level='info')


@api_router.post("/voice/transcribe", response_model=TranscribeResponse)
async def voice_transcribe(file: UploadFile = File(...)):
    # Read uploaded audio and send to Whisper
    b = await file.read()
    try:
        data = _call_openai_whisper(b, file.filename or 'audio.webm', file.content_type or 'audio/webm')
        text = data.get('text', '').strip()
        lang = data.get('language')
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"transcribe error: {e}")

    # Log the transcribed user input as a 'user' entry (voice)
    if text:
        u = await repo.write_log("user", f"> (voice) {text}")
        await manager.broadcast_json({"type": "log", "item": {"id": u.id, "ts": u.ts, "level": u.level, "text": u.text}})

    return TranscribeResponse(text=text, language=lang)


@api_router.post("/voice/tts", response_model=TTSResponse)
async def voice_tts(text: str = Form(...), voice: str = Form('alloy'), fmt: str = Form('mp3')):
    if not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        audio_bytes = _call_openai_tts(text, voice=voice, fmt=fmt)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"tts error: {e}")

    b64 = base64.b64encode(audio_bytes).decode('utf-8')
    return TTSResponse(audio_base64=b64, format=fmt)


# WebSocket for real-time events
@api_router.websocket("/events/ws")
async def events_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        await manager.disconnect(websocket)


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