"""HTTP + WebSocket routes."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect

from .crawler import crawl as run_crawl
from .graph import annotate_graph, compute_metrics
from .models import (
    Crawl,
    CrawlConfig,
    CrawlMeta,
    CrawlStats,
    GraphEdge,
    GraphNode,
    GraphPayload,
    SiteConfig,
    StartCrawlRequest,
    WsEvent,
)
from .storage import JsonStore, domain_from_url, make_crawl_id
from .ws import ws_manager

router = APIRouter()
store = JsonStore()


@router.get("/crawls", response_model=list[CrawlMeta])
async def list_crawls(domain: str | None = None) -> list[CrawlMeta]:
    return store.list_crawls(domain=domain)


@router.get("/crawls/{crawl_id}", response_model=Crawl)
async def get_crawl(crawl_id: str) -> Crawl:
    crawl = store.load_crawl(crawl_id)
    if crawl is None:
        raise HTTPException(status_code=404, detail="crawl not found")
    return crawl


@router.delete("/crawls/{crawl_id}")
async def delete_crawl(crawl_id: str) -> dict:
    if not store.delete_crawl(crawl_id):
        raise HTTPException(status_code=404, detail="crawl not found")
    return {"deleted": crawl_id}


@router.get("/sites", response_model=list[SiteConfig])
async def list_sites() -> list[SiteConfig]:
    return store.list_sites()


@router.get("/sites/{domain}", response_model=SiteConfig)
async def get_site(domain: str) -> SiteConfig:
    cfg = store.get_site_config(domain)
    if cfg is None:
        raise HTTPException(status_code=404, detail="site not found")
    return cfg


@router.put("/sites/{domain}", response_model=SiteConfig)
async def upsert_site(domain: str, cfg: SiteConfig) -> SiteConfig:
    if cfg.domain != domain:
        raise HTTPException(status_code=400, detail="domain mismatch between path and body")
    store.save_site_config(cfg)
    return cfg


@router.post("/crawls", response_model=Crawl, status_code=202)
async def start_crawl(req: StartCrawlRequest, background: BackgroundTasks) -> Crawl:
    root_url = str(req.url)
    domain = domain_from_url(root_url)

    if req.config is not None:
        config = req.config
    else:
        site = store.get_site_config(domain)
        config = site.config if site else CrawlConfig()

    started_at = datetime.now(UTC)
    crawl_id = make_crawl_id(domain, started_at=started_at)

    crawl = Crawl(
        id=crawl_id,
        domain=domain,
        root_url=root_url,
        started_at=started_at,
        status="running",
        config=config,
    )
    store.save_crawl(crawl)

    background.add_task(_run_crawl_background, crawl)
    return crawl


@router.websocket("/ws/{crawl_id}")
async def crawl_socket(ws: WebSocket, crawl_id: str) -> None:
    await ws_manager.subscribe(crawl_id, ws)
    # Replay current state so late subscribers see what they missed.
    crawl = store.load_crawl(crawl_id)
    if crawl is not None:
        snapshot = WsEvent(
            type="crawl_started",
            crawl_id=crawl_id,
            payload={
                "domain": crawl.domain,
                "root_url": crawl.root_url,
                "status": crawl.status,
                "nodes": [n.model_dump() for n in crawl.graph.nodes],
                "edges": [e.model_dump() for e in crawl.graph.edges],
            },
        )
        await ws.send_text(snapshot.model_dump_json())
    try:
        while True:
            await ws.receive_text()  # keep-alive; we ignore client messages
    except WebSocketDisconnect:
        await ws_manager.unsubscribe(crawl_id, ws)


# Background task ------------------------------------------------------------


async def _run_crawl_background(crawl: Crawl) -> None:
    try:
        await ws_manager.broadcast(
            WsEvent(
                type="crawl_started",
                crawl_id=crawl.id,
                payload={"domain": crawl.domain, "root_url": crawl.root_url},
            )
        )

        async def on_event(event: dict) -> None:
            await ws_manager.broadcast(
                WsEvent(type=event["type"], crawl_id=crawl.id, payload=event["payload"])
            )

        async for event in run_crawl(crawl.root_url, crawl.config, on_event=None):
            await on_event(event)

            if event["type"] == "node_added":
                crawl.graph.nodes.append(GraphNode.model_validate(event["payload"]))
            elif event["type"] == "edge_added":
                crawl.graph.edges.append(GraphEdge.model_validate(event["payload"]))
            elif event["type"] == "complete":
                payload = event["payload"]
                crawl.graph = GraphPayload(
                    nodes=[GraphNode.model_validate(n) for n in payload["nodes"]],
                    edges=[GraphEdge.model_validate(e) for e in payload["edges"]],
                )
                crawl.stats = CrawlStats(**payload["stats"])

        # compute metrics post-crawl
        metrics = compute_metrics(crawl.graph)
        annotate_graph(crawl.graph, metrics)
        crawl.metrics = metrics
        crawl.status = "done"
        crawl.finished_at = datetime.now(UTC)
        store.save_crawl(crawl)

        await ws_manager.broadcast(
            WsEvent(
                type="metrics_computed",
                crawl_id=crawl.id,
                payload={"metrics": metrics, "nodes": [n.model_dump() for n in crawl.graph.nodes]},
            )
        )
        await ws_manager.broadcast(
            WsEvent(type="complete", crawl_id=crawl.id, payload={"stats": crawl.stats.model_dump()})
        )

    except asyncio.CancelledError:
        crawl.status = "cancelled"
        crawl.finished_at = datetime.now(UTC)
        store.save_crawl(crawl)
        raise
    except Exception as exc:
        crawl.status = "error"
        crawl.error = str(exc)
        crawl.finished_at = datetime.now(UTC)
        store.save_crawl(crawl)
        await ws_manager.broadcast(
            WsEvent(type="error", crawl_id=crawl.id, payload={"error": str(exc)})
        )
