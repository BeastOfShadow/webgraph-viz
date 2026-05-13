"""Async link crawler. HTTPX + selectolax for fast HTML parse.

Crawlee was evaluated but adds heavy dependency surface for the simple
breadth-first link discovery this project needs. Switch to crawlee /
playwright in `crawl_with_browser` when SPA support becomes necessary.
"""

from __future__ import annotations

import asyncio
import fnmatch
import re
import time
from collections import deque
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from urllib.parse import urldefrag, urljoin, urlparse

import httpx
from selectolax.parser import HTMLParser

from .models import CrawlConfig, GraphEdge, GraphNode
from .seo import compute_seo_scores

EventHandler = Callable[[dict], Awaitable[None]]


@dataclass
class CrawlState:
    visited: set[str] = field(default_factory=set)
    queued: set[str] = field(default_factory=set)
    nodes: dict[str, GraphNode] = field(default_factory=dict)
    edges: list[GraphEdge] = field(default_factory=list)
    errors: int = 0


def _normalize(url: str, base: str | None = None) -> str | None:
    try:
        absolute = urljoin(base, url) if base else url
        absolute, _ = urldefrag(absolute)
        parsed = urlparse(absolute)
        if parsed.scheme not in ("http", "https"):
            return None
        # strip trailing slash unless root path
        if parsed.path.endswith("/") and parsed.path != "/":
            absolute = absolute.rstrip("/")
        return absolute
    except ValueError:
        return None


def _matches_any(url: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatch(url, p) or re.search(p, url) for p in patterns)


def _ensure_node(state: CrawlState, url: str, **defaults) -> GraphNode:
    node = state.nodes.get(url)
    if node is None:
        node = GraphNode(id=url, url=url, label=urlparse(url).path or "/", title=url, **defaults)
        state.nodes[url] = node
    else:
        for key, val in defaults.items():
            if getattr(node, key, None) is None:
                setattr(node, key, val)
    return node


async def crawl(
    root_url: str,
    config: CrawlConfig,
    on_event: EventHandler | None = None,
) -> AsyncIterator[dict]:
    """Yield events as the crawl progresses.

    Event shape: {"type": str, "payload": dict}.
    Use `on_event` for fire-and-forget pushes (e.g. WebSocket); the iterator
    is the canonical channel.
    """
    start = _normalize(root_url)
    if start is None:
        raise ValueError(f"Invalid root URL: {root_url}")

    origin = urlparse(start).netloc
    state = CrawlState()
    queue: deque[tuple[str, int]] = deque([(start, 0)])
    state.queued.add(start)

    started = time.monotonic()

    async def emit(event: dict) -> dict:
        if on_event is not None:
            await on_event(event)
        return event

    headers = {"User-Agent": config.user_agent, "Accept": "text/html,application/xhtml+xml"}
    timeout = httpx.Timeout(config.request_timeout)
    limits = httpx.Limits(max_connections=config.concurrency * 2)

    async with httpx.AsyncClient(
        headers=headers, timeout=timeout, limits=limits, follow_redirects=True
    ) as client:
        sem = asyncio.Semaphore(config.concurrency)

        while queue and len(state.visited) < config.max_pages:
            batch: list[tuple[str, int]] = []
            while queue and len(batch) < config.concurrency:
                batch.append(queue.popleft())

            tasks = [_fetch(client, sem, url, depth) for url, depth in batch]
            for coro in asyncio.as_completed(tasks):
                fetched = await coro
                if fetched is None:
                    state.errors += 1
                    continue

                url, depth, status, html, load_time_ms = fetched
                if url in state.visited:
                    continue
                state.visited.add(url)

                node = _ensure_node(state, url, depth=depth, status_code=status, load_time_ms=load_time_ms)
                events_to_emit: list[dict] = []
                if not node.title or node.title == url:
                    pass  # may be updated below

                if html is None:
                    yield await emit(
                        {"type": "page_done", "payload": {"url": url, "status": status}}
                    )
                    continue

                tree = HTMLParser(html)
                title_tag = tree.css_first("title")
                if title_tag and title_tag.text(strip=True):
                    node.title = title_tag.text(strip=True)
                node.title_length = len(node.title) if node.title and node.title != url else 0

                h1_tags = tree.css("h1")
                node.h1_count = len(h1_tags)
                if h1_tags:
                    node.h1_text = h1_tags[0].text(strip=True)[:200] or None

                imgs = tree.css("img")
                node.image_count = len(imgs)
                node.images_without_alt = sum(
                    1 for img in imgs if not (img.attributes.get("alt") or "").strip()
                )

                meta_desc = tree.css_first('meta[name="description"]')
                if meta_desc:
                    node.meta_description_text = (meta_desc.attributes.get("content") or "").strip()
                    node.has_meta_description = bool(node.meta_description_text)
                else:
                    node.has_meta_description = False

                canonical = tree.css_first('link[rel="canonical"]')
                node.canonical_url = (canonical.attributes.get("href") or "").strip() or None if canonical else None

                robots_meta = tree.css_first('meta[name="robots"]')
                if robots_meta:
                    robots_content = (robots_meta.attributes.get("content") or "").lower()
                    node.robots_noindex = "noindex" in robots_content
                else:
                    node.robots_noindex = False

                body = tree.css_first("body")
                if body:
                    node.word_count = len(body.text(strip=True, separator=" ").split())

                compute_seo_scores(node)

                events_to_emit.append({"type": "node_added", "payload": node.model_dump()})

                seen_local: set[str] = set()
                ext_links = 0
                for a in tree.css("a[href]"):
                    href = a.attributes.get("href")
                    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
                        continue
                    target = _normalize(href, base=url)
                    if target is None:
                        continue
                    if urlparse(target).netloc.replace("www.", "") != origin.replace("www.", ""):
                        ext_links += 1
                        continue
                    if config.exclude_patterns and _matches_any(target, config.exclude_patterns):
                        continue
                    if target in seen_local or target == url:
                        continue
                    seen_local.add(target)

                    target_node = _ensure_node(state, target)
                    edge_id = f"e{len(state.edges)}"
                    edge = GraphEdge(
                        id=edge_id,
                        source=url,
                        target=target,
                        anchor=(a.text(strip=True) or "")[:80] or None,
                    )
                    state.edges.append(edge)
                    node.out_degree += 1
                    target_node.in_degree += 1
                    events_to_emit.append({"type": "edge_added", "payload": edge.model_dump()})

                    if (
                        target not in state.visited
                        and target not in state.queued
                        and depth + 1 <= config.max_depth
                        and len(state.visited) + len(state.queued) < config.max_pages
                    ):
                        queue.append((target, depth + 1))
                        state.queued.add(target)

                node.external_links = ext_links

                for event in events_to_emit:
                    yield await emit(event)

                yield await emit(
                    {
                        "type": "page_done",
                        "payload": {
                            "url": url,
                            "status": status,
                            "visited": len(state.visited),
                            "queued": len(queue),
                        },
                    }
                )

    if not state.visited:
        raise ValueError(
            f"Could not fetch {start!r} — no pages were retrieved. "
            "Check that the URL is reachable from the backend server."
        )

    duration_ms = int((time.monotonic() - started) * 1000)
    yield await emit(
        {
            "type": "complete",
            "payload": {
                "nodes": [n.model_dump() for n in state.nodes.values()],
                "edges": [e.model_dump() for e in state.edges],
                "stats": {
                    "total_pages": len(state.visited),
                    "total_links": len(state.edges),
                    "errors": state.errors,
                    "duration_ms": duration_ms,
                },
            },
        }
    )


async def _fetch(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    url: str,
    depth: int,
) -> tuple[str, int, int, str | None, int] | None:
    async with sem:
        try:
            t0 = time.monotonic()
            response = await client.get(url)
            load_time_ms = int((time.monotonic() - t0) * 1000)
        except httpx.HTTPError:
            return None

        status = response.status_code
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type or status >= 400:
            return (str(response.url), depth, status, None, load_time_ms)
        return (str(response.url), depth, status, response.text, load_time_ms)
