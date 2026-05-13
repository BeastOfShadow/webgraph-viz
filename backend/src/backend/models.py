"""Pydantic models — single source of truth for data contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class CrawlConfig(BaseModel):
    max_pages: int = Field(default=200, ge=1, le=5000)
    max_depth: int = Field(default=5, ge=1, le=20)
    respect_robots: bool = True
    use_browser: bool = False
    exclude_patterns: list[str] = Field(default_factory=list)
    user_agent: str = "WebGraphViz/1.0 (+https://github.com/BeastOfShadow/webgraph-viz)"
    request_timeout: int = Field(default=10, ge=1, le=60)
    concurrency: int = Field(default=4, ge=1, le=20)


class SiteConfig(BaseModel):
    domain: str
    root_url: HttpUrl
    config: CrawlConfig = Field(default_factory=CrawlConfig)
    last_crawl: str | None = None


class GraphNode(BaseModel):
    id: str
    label: str
    url: str
    title: str
    in_degree: int = 0
    out_degree: int = 0
    pagerank: float | None = None
    betweenness: float | None = None
    status_code: int | None = None
    depth: int | None = None
    external_links: int = 0
    word_count: int | None = None
    image_count: int | None = None
    has_meta_description: bool | None = None
    load_time_ms: int | None = None
    h1_count: int | None = None
    # SEO fields
    canonical_url: str | None = None
    meta_description_text: str | None = None
    h1_text: str | None = None
    images_without_alt: int | None = None
    title_length: int | None = None
    robots_noindex: bool | None = None
    technical_score: float | None = None
    onpage_score: float | None = None
    seo_score: float | None = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    anchor: str | None = None


class CrawlStats(BaseModel):
    total_pages: int = 0
    total_links: int = 0
    errors: int = 0
    duration_ms: int | None = None


class GraphPayload(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class Crawl(BaseModel):
    id: str
    domain: str
    root_url: str
    started_at: datetime
    finished_at: datetime | None = None
    status: Literal["running", "done", "error", "cancelled"] = "running"
    config: CrawlConfig
    stats: CrawlStats = Field(default_factory=CrawlStats)
    graph: GraphPayload = Field(default_factory=GraphPayload)
    metrics: dict[str, dict[str, float]] = Field(default_factory=dict)
    error: str | None = None


class CrawlMeta(BaseModel):
    """Lightweight summary for index listing."""

    id: str
    domain: str
    root_url: str
    started_at: datetime
    finished_at: datetime | None = None
    status: str
    total_pages: int = 0
    total_links: int = 0


class CrawlIndex(BaseModel):
    crawls: list[CrawlMeta] = Field(default_factory=list)


# WebSocket events ------------------------------------------------------------


class WsEvent(BaseModel):
    type: Literal[
        "crawl_started",
        "node_added",
        "edge_added",
        "page_done",
        "metrics_computed",
        "complete",
        "error",
    ]
    crawl_id: str
    payload: dict = Field(default_factory=dict)


class StartCrawlRequest(BaseModel):
    url: HttpUrl
    config: CrawlConfig | None = None
