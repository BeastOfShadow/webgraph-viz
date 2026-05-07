"""JSON file storage. Each crawl is a self-contained snapshot."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

from .models import Crawl, CrawlIndex, CrawlMeta, SiteConfig

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
CRAWLS_DIR = DATA_DIR / "crawls"
SITES_DIR = DATA_DIR / "sites"
INDEX_FILE = DATA_DIR / "index.json"


def _ensure_dirs() -> None:
    CRAWLS_DIR.mkdir(parents=True, exist_ok=True)
    SITES_DIR.mkdir(parents=True, exist_ok=True)


def domain_from_url(url: str) -> str:
    host = urlparse(url).hostname or "unknown"
    return host.lower()


def domain_slug(domain: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", domain.lower()).strip("-")


def make_crawl_id(domain: str, started_at: datetime | None = None) -> str:
    started_at = started_at or datetime.now(UTC)
    ts = started_at.strftime("%Y-%m-%dT%H-%M-%S")
    return f"{domain_slug(domain)}_{ts}"


class JsonStore:
    """Thin wrapper around the JSON files on disk."""

    def __init__(self) -> None:
        _ensure_dirs()

    # crawls ----------------------------------------------------------------

    def save_crawl(self, crawl: Crawl) -> Path:
        path = CRAWLS_DIR / f"{crawl.id}.json"
        path.write_text(crawl.model_dump_json(indent=2))
        self._update_index(crawl)
        return path

    def load_crawl(self, crawl_id: str) -> Crawl | None:
        path = CRAWLS_DIR / f"{crawl_id}.json"
        if not path.exists():
            return None
        return Crawl.model_validate_json(path.read_text())

    def delete_crawl(self, crawl_id: str) -> bool:
        path = CRAWLS_DIR / f"{crawl_id}.json"
        if not path.exists():
            return False
        path.unlink()
        index = self._load_index()
        index.crawls = [c for c in index.crawls if c.id != crawl_id]
        self._write_index(index)
        return True

    def list_crawls(self, domain: str | None = None) -> list[CrawlMeta]:
        index = self._load_index()
        crawls = sorted(index.crawls, key=lambda c: c.started_at, reverse=True)
        if domain:
            crawls = [c for c in crawls if c.domain == domain]
        return crawls

    # site configs ---------------------------------------------------------

    def get_site_config(self, domain: str) -> SiteConfig | None:
        path = SITES_DIR / f"{domain_slug(domain)}.json"
        if not path.exists():
            return None
        return SiteConfig.model_validate_json(path.read_text())

    def save_site_config(self, cfg: SiteConfig) -> Path:
        path = SITES_DIR / f"{domain_slug(cfg.domain)}.json"
        path.write_text(cfg.model_dump_json(indent=2))
        return path

    def list_sites(self) -> list[SiteConfig]:
        return [
            SiteConfig.model_validate_json(p.read_text()) for p in sorted(SITES_DIR.glob("*.json"))
        ]

    # internal -------------------------------------------------------------

    def _load_index(self) -> CrawlIndex:
        if not INDEX_FILE.exists():
            return CrawlIndex()
        try:
            return CrawlIndex.model_validate_json(INDEX_FILE.read_text())
        except (json.JSONDecodeError, ValueError):
            return CrawlIndex()

    def _write_index(self, index: CrawlIndex) -> None:
        INDEX_FILE.write_text(index.model_dump_json(indent=2))

    def _update_index(self, crawl: Crawl) -> None:
        index = self._load_index()
        meta = CrawlMeta(
            id=crawl.id,
            domain=crawl.domain,
            root_url=crawl.root_url,
            started_at=crawl.started_at,
            finished_at=crawl.finished_at,
            status=crawl.status,
            total_pages=crawl.stats.total_pages,
            total_links=crawl.stats.total_links,
        )
        index.crawls = [c for c in index.crawls if c.id != crawl.id] + [meta]
        self._write_index(index)
