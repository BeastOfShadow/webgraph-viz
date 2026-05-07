"""WebSocket connection manager — fan-out events per crawl_id."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from fastapi import WebSocket

from .models import WsEvent


class WsManager:
    def __init__(self) -> None:
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, crawl_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._subs[crawl_id].add(ws)

    async def unsubscribe(self, crawl_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._subs[crawl_id].discard(ws)
            if not self._subs[crawl_id]:
                self._subs.pop(crawl_id, None)

    async def broadcast(self, event: WsEvent) -> None:
        async with self._lock:
            targets = list(self._subs.get(event.crawl_id, set()))
        if not targets:
            return
        message = event.model_dump_json()
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._subs[event.crawl_id].discard(ws)


ws_manager = WsManager()
