"""SEO score computation for crawled pages.

Each category is scored 0-100 as sum of weighted checks.
Final seo_score = 50% technical + 50% on-page.
"""

from __future__ import annotations

from .models import GraphNode


def compute_seo_scores(node: GraphNode) -> None:
    """Mutate node in-place: set technical_score, onpage_score, seo_score."""
    tech = _technical(node)
    onpage = _onpage(node)
    node.technical_score = round(tech, 1)
    node.onpage_score = round(onpage, 1)
    node.seo_score = round(0.5 * tech + 0.5 * onpage, 1)


def _technical(node: GraphNode) -> float:
    score = 0.0

    # HTTPS — 20 pts
    if node.url.startswith("https://"):
        score += 20

    # Status 200 — 20 pts
    if node.status_code == 200:
        score += 20

    # Load time — 20 pts full, 10 partial (1-3s), 0 for >3s
    if node.load_time_ms is None:
        score += 10  # unknown: partial
    elif node.load_time_ms < 1000:
        score += 20
    elif node.load_time_ms < 3000:
        score += 10

    # No robots noindex — 20 pts
    if node.robots_noindex is None:
        score += 10  # unknown: partial
    elif not node.robots_noindex:
        score += 20

    # Canonical tag present — 20 pts
    if node.canonical_url:
        score += 20

    return min(100.0, score)


def _onpage(node: GraphNode) -> float:
    score = 0.0

    # Title 10–60 chars — 20 pts; present but wrong length: 10
    tlen = node.title_length or 0
    if 10 <= tlen <= 60:
        score += 20
    elif tlen > 0:
        score += 10

    # Exactly one H1 — 20 pts; >1 or 0: partial 10
    if node.h1_count == 1:
        score += 20
    elif node.h1_count is not None and node.h1_count > 0:
        score += 10

    # Meta description 50–155 chars — 20 pts; present but wrong length: 10
    meta_len = len(node.meta_description_text or "")
    if 50 <= meta_len <= 155:
        score += 20
    elif meta_len > 0:
        score += 10

    # All images have alt — 20 pts
    if node.image_count is None:
        score += 10  # unknown: partial
    elif node.image_count == 0 or (node.images_without_alt or 0) == 0:
        score += 20
    elif (node.images_without_alt or 0) < node.image_count:
        score += 10  # some have alt

    # Word count ≥ 300 — 20 pts; 150-299: 10 pts
    if node.word_count is None:
        score += 10  # unknown: partial
    elif node.word_count >= 300:
        score += 20
    elif node.word_count >= 150:
        score += 10

    return min(100.0, score)
