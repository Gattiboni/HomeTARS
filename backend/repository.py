"""
Storage-agnostic repository for HomeTARS Phase 2
- Default: MongoDB (environment-provided MONGO_URL)
- Optional (off-by-default): Supabase via PostgREST using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

Switching is done at runtime in server.py based on presence of Supabase env vars.
No .env changes required in this environment; Supabase remains inactive by default.
"""
from __future__ import annotations

import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Literal, Dict, Any

from pydantic import BaseModel

try:
    import requests  # used only for SupabaseRepository; synchronous, wrapped with asyncio.to_thread
except Exception:  # pragma: no cover
    requests = None


# Shared DTOs mirroring server contracts
class SystemStatusDTO(BaseModel):
    status: Literal["ONLINE", "OFFLINE"] = "ONLINE"
    updated_at: datetime = datetime.now(timezone.utc)

class LogItemDTO(BaseModel):
    id: str
    ts: datetime
    level: Literal["system", "user", "error", "info"]
    text: str


class BaseRepository:
    async def ensure_status_initialized(self) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    async def read_status(self) -> SystemStatusDTO:  # pragma: no cover - interface
        raise NotImplementedError

    async def write_log(self, level: str, text: str, ts: Optional[datetime] = None) -> LogItemDTO:  # pragma: no cover
        raise NotImplementedError

    async def get_logs(self, limit: int = 100, since: Optional[datetime] = None, level: Optional[str] = None) -> List[LogItemDTO]:  # pragma: no cover
        raise NotImplementedError

    async def record_command(self, command: str, result_level: str, result_lines: List[str]) -> None:  # pragma: no cover
        raise NotImplementedError

    async def close(self) -> None:
        return None


# ------------------------------
# Mongo Implementation
# ------------------------------
class MongoRepository(BaseRepository):
    def __init__(self, motor_db):
        self.db = motor_db

    async def ensure_status_initialized(self) -> None:
        existing = await self.db.system_status.find_one({"_id": "singleton"})
        if not existing:
            await self.db.system_status.insert_one({
                "_id": "singleton",
                "status": "ONLINE",
                "updated_at": datetime.utcnow(),
            })

    async def read_status(self) -> SystemStatusDTO:
        doc = await self.db.system_status.find_one({"_id": "singleton"})
        if not doc:
            await self.ensure_status_initialized()
            doc = await self.db.system_status.find_one({"_id": "singleton"})
        return SystemStatusDTO(status=doc.get("status", "ONLINE"), updated_at=doc.get("updated_at", datetime.utcnow()))

    async def write_log(self, level: str, text: str, ts: Optional[datetime] = None) -> LogItemDTO:
        obj = LogItemDTO(id=str(uuid.uuid4()), ts=ts or datetime.utcnow(), level=level, text=text)
        await self.db.logs.insert_one({
            "_id": obj.id,
            "ts": obj.ts,
            "level": obj.level,
            "text": obj.text,
        })
        return obj

    async def get_logs(self, limit: int = 100, since: Optional[datetime] = None, level: Optional[str] = None) -> List[LogItemDTO]:
        q: Dict[str, Any] = {}
        if since:
            q["ts"] = {"$gt": since}
        if level in {"system", "user", "error", "info"}:
            q["level"] = level
        cursor = self.db.logs.find(q).sort("ts", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [LogItemDTO(id=str(doc.get("_id")), ts=doc["ts"], level=doc["level"], text=doc["text"]) for doc in docs]

    async def record_command(self, command: str, result_level: str, result_lines: List[str]) -> None:
        await self.db.commands.insert_one({
            "_id": str(uuid.uuid4()),
            "ts": datetime.utcnow(),
            "command": command,
            "result_level": result_level,
            "result_lines": result_lines,
        })


# ------------------------------
# Supabase Implementation (OFF by default)
# ------------------------------
class SupabaseRepository(BaseRepository):
    def __init__(self, url: str, service_role_key: str):
        if requests is None:
            raise RuntimeError("requests is required for SupabaseRepository")
        self.base_rest = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    # Helper to run blocking requests without blocking the loop
    async def _req(self, method: str, path: str, **kwargs):
        def _do():
            return requests.request(method, self.base_rest + path, headers=self.headers, timeout=15, **kwargs)
        return await asyncio.to_thread(_do)

    @staticmethod
    def _iso(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    async def ensure_status_initialized(self) -> None:
        r = await self._req("GET", "/system_status", params={"select": "*", "id": "eq.singleton"})
        if r.status_code == 200 and r.json():
            return
        now = datetime.now(timezone.utc)
        await self._req("POST", "/system_status", json=[{"id": "singleton", "status": "ONLINE", "updated_at": self._iso(now)}])

    async def read_status(self) -> SystemStatusDTO:
        r = await self._req("GET", "/system_status", params={"select": "*", "id": "eq.singleton"})
        data = r.json() if r.status_code == 200 else []
        if not data:
            await self.ensure_status_initialized()
            r = await self._req("GET", "/system_status", params={"select": "*", "id": "eq.singleton"})
            data = r.json() if r.status_code == 200 else []
        row = data[0] if data else {"status": "ONLINE", "updated_at": datetime.now(timezone.utc).isoformat()}
        ts = row.get("updated_at")
        ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00")) if isinstance(ts, str) else datetime.now(timezone.utc)
        return SystemStatusDTO(status=row.get("status", "ONLINE"), updated_at=ts_dt)

    async def write_log(self, level: str, text: str, ts: Optional[datetime] = None) -> LogItemDTO:
        obj = LogItemDTO(id=str(uuid.uuid4()), ts=ts or datetime.now(timezone.utc), level=level, text=text)
        await self._req("POST", "/logs", json=[{"id": obj.id, "ts": self._iso(obj.ts), "level": obj.level, "text": obj.text}])
        return obj

    async def get_logs(self, limit: int = 100, since: Optional[datetime] = None, level: Optional[str] = None) -> List[LogItemDTO]:
        params = {"select": "*", "order": "ts.desc", "limit": str(limit)}
        if since:
            params["ts"] = f"gt.{self._iso(since)}"
        if level in {"system", "user", "error", "info"}:
            params["level"] = f"eq.{level}"
        r = await self._req("GET", "/logs", params=params)
        data = r.json() if r.status_code == 200 else []
        items: List[LogItemDTO] = []
        for doc in data:
            try:
                ts = datetime.fromisoformat(str(doc.get("ts")).replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
            items.append(LogItemDTO(id=str(doc.get("id")), ts=ts, level=doc.get("level"), text=doc.get("text")))
        return items

    async def record_command(self, command: str, result_level: str, result_lines: List[str]) -> None:
        await self._req("POST", "/commands", json=[{
            "id": str(uuid.uuid4()),
            "ts": self._iso(datetime.now(timezone.utc)),
            "command": command,
            "result_level": result_level,
            "result_lines": result_lines,
        }])