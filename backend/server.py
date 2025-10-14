from fastapi import FastAPI, APIRouter, HTTPException, Query, WebSocket, UploadFile, File, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timedelta
from difflib import get_close_matches
import requests
import base64
import re
import json

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

# OpenAI configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_BASE = os.environ.get('OPENAI_BASE', 'https://api.openai.com')

# Economy flags (backend-side env optional)
AI_DISABLED = os.environ.get('AI_DISABLED', '').lower() in {'1','true','yes'}
VOICE_ONLINE = os.environ.get('VOICE_ONLINE', '').lower() in {'1','true','yes'}  # default offline fallback

# Home Assistant configuration (optional)
HA_URL = os.environ.get('HOME_ASSISTANT_URL')
HA_TOKEN = os.environ.get('HOME_ASSISTANT_TOKEN')

# GPT sessions folder
LOGS_DIR = ROOT_DIR.parent / 'logs' / 'gpt_sessions'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

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
api_router = APIRouter(prefix="/api")

# ----------------------------
# Models
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
    context: Optional[Dict[str, Any]] = None

class AIResponse(BaseModel):
    lines: List[str]
    level: Literal['info', 'system', 'error'] = 'info'

class TranscribeResponse(BaseModel):
    text: str
    language: Optional[str] = None
    wake: bool = False
    command_text: Optional[str] = None

class TTSResponse(BaseModel):
    audio_base64: str
    format: Literal['mp3', 'wav', 'opus'] = 'mp3'

class AutoLogRequest(BaseModel):
    text: str
    meta: Optional[Dict[str, Any]] = None

class GPTSessionResponse(BaseModel):
    session_id: str

class GPTMessageRequest(BaseModel):
    session_id: str
    prompt: str
    language: Optional[str] = None

class GPTMessageResponse(BaseModel):
    session_id: str
    user: str
    assistant: str
    language: Optional[str] = None
    audio_base64: Optional[str] = None

# Home Assistant
class HAServiceCall(BaseModel):
    domain: str
    service: str
    entity_id: str

# ----------------------------
# Helpers
# ----------------------------
KNOWN = ["help", "status", "time", "clear"]

BASE_PERSONA = (
    "You are TARS, an onboard AI with dry wit, mild sarcasm, and absolute honesty. "
    "Respond concisely, with a tone that balances military precision and subtle irony. "
    "You speak both English and Portuguese fluently, switching to match the user's language."
)

INTENT_INSTRUCTIONS = (
    "Interpret the user's natural language and translate it into actionable automation intents. "
    "Recognize context, confirm ambiguous requests, and respond in the user's language. "
    "Example intents: lights_on, lights_off, dim_lights(room), set_temperature(value), play_music, stop_music, switch_mode(X).\n"
    "After your concise natural reply, include exactly one line with machine-parsable intent as: \n"
    "INTENT: {\"action\":\"...\", \"room\":\"...\", \"value\":number, \"target\":\"...\"}."
)

_known_cache: Dict[str, Dict[str, Any]] = {}


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
    synonyms = {"statuz":"status","stats":"status","statuss":"status","clr":"clear","cls":"clear","halp":"help","hep":"help","tym":"time","clock":"time"}
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
    return {"Authorization": f"Bearer {OPENAI_API_KEY}"}


def _call_openai_chat(prompt: str, mode: Optional[str] = None) -> str:
    if AI_DISABLED:
        return "[AI DISABLED] Economy mode active."
    url = f"{OPENAI_BASE}/v1/chat/completions"
    system_content = BASE_PERSONA
    if mode == 'automation':
        system_content = BASE_PERSONA + "\n" + INTENT_INSTRUCTIONS
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": system_content}, {"role": "user", "content": prompt}], "temperature": 0.3, "max_tokens": 256}
    headers = {**_openai_headers(), "Content-Type": "application/json"}
    r = requests.post(url, json=payload, headers=headers, timeout=30)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai chat error: {r.text}")
    data = r.json()
    return data["choices"][0]["message"]["content"].strip()


def _call_openai_whisper(file_bytes: bytes, filename: str, mime: str) -> dict:
    if not VOICE_ONLINE:
        # offline fallback: return safe empty transcript
        return {"text": "", "language": "en"}
    url = f"{OPENAI_BASE}/v1/audio/transcriptions"
    files = {'file': (filename, file_bytes, mime or 'application/octet-stream')}
    data = {'model': 'whisper-1', 'response_format': 'json'}
    r = requests.post(url, headers=_openai_headers(), files=files, data=data, timeout=60)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai whisper error: {r.text}")
    return r.json()


def _beep_wav_bytes(duration_ms: int = 300, freq_hz: int = 880, sample_rate: int = 16000) -> bytes:
    import math
    import struct
    n_samples = int(sample_rate * (duration_ms / 1000.0))
    # Generate PCM 16-bit mono sine wave
    pcm = bytearray()
    for i in range(n_samples):
        t = i / sample_rate
        amp = int(32767 * 0.3 * math.sin(2 * math.pi * freq_hz * t))
        pcm += struct.pack('<h', amp)
    # Build minimal WAV header
    data_size = len(pcm)
    byte_rate = sample_rate * 2
    block_align = 2
    riff = b'RIFF' + struct.pack('<I', 36 + data_size) + b'WAVE'
    fmt = b'fmt ' + struct.pack('<I', 16) + struct.pack('<HHIIHH', 1, 1, sample_rate, byte_rate, block_align, 16)
    data = b'data' + struct.pack('<I', data_size) + bytes(pcm)
    return riff + fmt + data


def _call_openai_tts(text: str, voice: str = 'alloy', fmt: str = 'mp3') -> bytes:
    if not VOICE_ONLINE:
        # offline fallback: return beep WAV bytes regardless of requested format
        return _beep_wav_bytes()
    url = f"{OPENAI_BASE}/v1/audio/speech"
    payload = {"model": "gpt-4o-mini-tts", "voice": voice, "input": text, "format": fmt}
    headers = {**_openai_headers(), "Content-Type": "application/json", "Accept": f"audio/{'mpeg' if fmt=='mp3' else fmt}"}
    r = requests.post(url, json=payload, headers=headers, timeout=60)
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"openai tts error: {r.text}")
    return r.content

# Wake word detection
WAKE_PATTERNS = [re.compile(r"\bhey\s*[-,;:]?\s*tars\b", re.IGNORECASE), re.compile(r"\bei\s*[-,;:]?\s*tars\b", re.IGNORECASE)]

def _detect_wake(text: str):
    if not text:
        return False, None
    for pat in WAKE_PATTERNS:
        m = pat.search(text)
        if m:
            after = text[m.end():].strip(" \t-.,;:!?")
            return True, after or None
    return False, None

# GPT sessions helpers

def _list_session_files():
    return sorted([p for p in LOGS_DIR.glob('*.json')])


def _next_session_id() -> str:
    files = _list_session_files()
    max_n = 0
    for f in files:
        try:
            n = int(f.stem.split('-')[-1])
            if n > max_n:
                max_n = n
        except Exception:
            continue
    return f"gpt-{max_n+1:05d}"


def _session_path(session_id: str) -> Path:
    return LOGS_DIR / f"{session_id}.json"


def _append_session_log(session_id: str, role: str, content: str):
    path = _session_path(session_id)
    arr = []
    if path.exists():
        try:
            arr = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            arr = []
    arr.append({"role": role, "content": content, "ts": datetime.utcnow().isoformat()})
    path.write_text(json.dumps(arr, ensure_ascii=False, indent=2), encoding='utf-8')

# Home Assistant helpers

def _ha_configured() -> bool:
    return bool(HA_URL and HA_TOKEN)


def _ha_headers():
    if not _ha_configured():
        raise HTTPException(status_code=503, detail="Home Assistant not configured")
    return {"Authorization": f"Bearer {HA_TOKEN}", "Content-Type": "application/json"}

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
async def get_logs(limit: int = Query(100, ge=1, le=1000), since: Optional[str] = Query(None), level: Optional[str] = Query(None)):
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

    # always store user echo
    user_log = await repo.write_log("user", f"> {cmd}")
    await manager.broadcast_json({"type": "log", "item": {"id": user_log.id, "ts": user_log.ts, "level": user_log.level, "text": user_log.text}})

    # serve known via short cache without re-logging for 60s
    lines, level = _known_command_lines(cmd)
    if cmd.lower() in {"help","status","time"}:
        now = datetime.utcnow()
        cache = _known_cache.get(cmd.lower())
        if cache and now - cache['at'] < timedelta(seconds=60):
            return CommandResponse(echo=cmd, lines=cache['lines'], level=level, wrote_log=False)
        _known_cache[cmd.lower()] = { 'at': now, 'lines': lines }
    
    if cmd.lower() != "clear":
        for ln in lines:
            li = await repo.write_log("error" if level == "error" else "system", ln)
            await manager.broadcast_json({"type": "log", "item": {"id": li.id, "ts": li.ts, "level": li.level, "text": li.text}})
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
    mode = None
    if input.context and isinstance(input.context, dict):
        mode = input.context.get('mode')
    try:
        text = _call_openai_chat(prompt, mode=mode)
    except HTTPException:
        suggestions = _ai_suggest(prompt)
        for ln in suggestions:
            li = await repo.write_log("info", ln)
            await manager.broadcast_json({"type": "log", "item": {"id": li.id, "ts": li.ts, "level": li.level, "text": li.text}})
        return AIResponse(lines=suggestions, level='info')
    lines = [seg.strip() for seg in text.split('\n') if seg.strip()] or [text]
    for ln in lines:
        li = await repo.write_log("info", ln)
        await manager.broadcast_json({"type": "log", "item": {"id": li.id, "ts": li.ts, "level": li.level, "text": li.text}})
    return AIResponse(lines=lines, level='info')

@api_router.post("/automation/log")
async def automation_log(req: AutoLogRequest):
    txt = (req.text or "").strip()
    if not txt:
        raise HTTPException(status_code=400, detail="text is required")
    li = await repo.write_log("info", txt)
    await manager.broadcast_json({"type": "log", "item": {"id": li.id, "ts": li.ts, "level": li.level, "text": li.text}})
    return {"ok": True}

# GPT Link endpoints
@api_router.post("/gpt/session", response_model=GPTSessionResponse)
async def gpt_session():
    session_id = _next_session_id()
    # initialize file
    _session_path(session_id).write_text("[]", encoding='utf-8')
    # log
    text = f"[GPT][{session_id}] SESSION START"
    li = await repo.write_log("info", text)
    await manager.broadcast_json({"type": "log", "item": {"id": li.id, "ts": li.ts, "level": li.level, "text": li.text}})
    return GPTSessionResponse(session_id=session_id)

@api_router.post("/gpt/message", response_model=GPTMessageResponse)
async def gpt_message(req: GPTMessageRequest):
    session_id = (req.session_id or '').strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    prompt = (req.prompt or '').strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # append user
    _append_session_log(session_id, 'user', prompt)
    await repo.write_log("info", f"[GPT][{session_id}] USER: {prompt}")

    # assistant
    if AI_DISABLED:
        assistant = "Sure, I can help with that."
        audio_b64 = None
    else:
        assistant = _call_openai_chat(prompt)
        audio_b = _call_openai_tts(assistant)
        audio_b64 = base64.b64encode(audio_b).decode('utf-8') if audio_b else None

    _append_session_log(session_id, 'assistant', assistant)
    await repo.write_log("info", f"[GPT][{session_id}] ASSISTANT: {assistant}")

    return GPTMessageResponse(session_id=session_id, user=prompt, assistant=assistant, language=req.language or None, audio_base64=audio_b64)

@api_router.post("/voice/transcribe", response_model=TranscribeResponse)
async def voice_transcribe(file: UploadFile = File(...)):
    b = await file.read()
    try:
        data = _call_openai_whisper(b, file.filename or 'audio.webm', file.content_type or 'audio/webm')
        text = data.get('text', '').strip()
        lang = data.get('language')
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"transcribe error: {e}")
    wake, command_text = _detect_wake(text)
    if text:
        u = await repo.write_log("user", f"> (voice) {text}")
        await manager.broadcast_json({"type": "log", "item": {"id": u.id, "ts": u.ts, "level": u.level, "text": u.text}})
    return TranscribeResponse(text=text, language=lang, wake=wake, command_text=command_text)

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

@api_router.websocket("/events/ws")
async def events_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        await manager.disconnect(websocket)

# Home Assistant integration (optional real if configured)
@api_router.get("/integrations/ha/entities")
async def ha_entities():
    if not _ha_configured():
        return {"configured": False, "items": []}
    try:
        r = requests.get(f"{HA_URL.rstrip('/')}/api/states", headers=_ha_headers(), timeout=10)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"HA states error: {r.text}")
        data = r.json()
        items = []
        for st in data:
            try:
                entity_id = st.get('entity_id','')
                if not entity_id.startswith('light.'):
                    continue
                name = st.get('attributes',{}).get('friendly_name', entity_id)
                state = st.get('state','unknown')
                items.append({"entity_id": entity_id, "name": name, "state": state})
            except Exception:
                continue
        return {"configured": True, "items": items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HA error: {e}")

@api_router.post("/integrations/ha/service")
async def ha_service(call: HAServiceCall):
    if not _ha_configured():
        return {"configured": False, "ok": False, "reason": "not_configured"}
    try:
        url = f"{HA_URL.rstrip('/')}/api/services/{call.domain}/{call.service}"
        r = requests.post(url, headers=_ha_headers(), json={"entity_id": call.entity_id}, timeout=10)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"HA service error: {r.text}")
        return {"configured": True, "ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HA error: {e}")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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