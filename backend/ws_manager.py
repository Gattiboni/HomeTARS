from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json
from datetime import datetime


class WSManager:
    def __init__(self) -> None:
        self.active: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active:
                self.active.remove(websocket)

    async def broadcast_json(self, message: Dict[str, Any]):
        # ensure datetimes are serialized
        def _default(o):
            if isinstance(o, datetime):
                return o.isoformat()
            raise TypeError

        data = json.dumps(message, default=_default)
        # snapshot of current connections
        async with self._lock:
            targets = list(self.active)
        for ws in targets:
            try:
                await ws.send_text(data)
            except Exception:
                try:
                    await self.disconnect(ws)
                except Exception:
                    pass


manager = WSManager()