import type { GraphNode } from '../types';

export type AdviceSeverity = 'info' | 'warn' | 'good';

export interface Advice {
  severity: AdviceSeverity;
  title: string;
  detail: string;
}

/**
 * Heuristic, deterministic advice. No model calls. Inputs: the node itself
 * and the graph it lives in (so we can compare to peers — e.g. "this page is
 * in the bottom 10% by PageRank").
 */
export function getPageAdvice(node: GraphNode, allNodes: GraphNode[]): Advice[] {
  const advice: Advice[] = [];

  // --- Connectivity --------------------------------------------------------
  if (node.in_degree === 0 && (node.depth ?? 0) > 0) {
    advice.push({
      severity: 'warn',
      title: 'Orphan page',
      detail:
        'No internal page links here. Add links from your pillar pages (homepage, navigation, footer) so crawlers and PageRank can reach it.',
    });
  } else if (node.in_degree === 1 && (node.depth ?? 0) > 0) {
    advice.push({
      severity: 'warn',
      title: 'Single inbound link',
      detail:
        'Only one page links here. If this content matters, surface it from the main nav or related-content sections.',
    });
  }

  if (node.out_degree === 0) {
    advice.push({
      severity: 'warn',
      title: 'Dead end',
      detail:
        'This page has no outgoing internal links. Add contextual links to related pages so users (and PageRank) keep flowing through your site.',
    });
  } else if (node.out_degree > 50) {
    advice.push({
      severity: 'warn',
      title: 'Too many outbound links',
      detail: `${node.out_degree} outbound links dilute the PageRank passed to each. Consider trimming or using rel="nofollow" for low-value links.`,
    });
  }

  // --- Depth ---------------------------------------------------------------
  if ((node.depth ?? 0) >= 4) {
    advice.push({
      severity: 'warn',
      title: 'Deep in the site',
      detail: `This page is ${node.depth} clicks from the homepage. Pages deeper than 3 levels lose authority and crawl frequency. Promote it via menu, sitemap, or hub links.`,
    });
  }

  // --- PageRank percentile -------------------------------------------------
  const ranks = allNodes
    .map((n) => n.pagerank)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);
  if (typeof node.pagerank === 'number' && ranks.length >= 5) {
    const idx = ranks.indexOf(node.pagerank);
    const percentile = idx / (ranks.length - 1); // 0..1, 1 = best
    if (percentile < 0.2) {
      advice.push({
        severity: 'warn',
        title: 'Low PageRank',
        detail: `This page is in the bottom ${Math.round(percentile * 100) || 5}% by PageRank. The strongest lever is more inbound links from high-rank pages.`,
      });
    } else if (percentile > 0.85 && (node.depth ?? 0) === 0) {
      advice.push({
        severity: 'good',
        title: 'Top hub',
        detail: 'High PageRank — this page concentrates the site authority. Keep its outbound links curated and stable.',
      });
    }
  }

  // --- Betweenness ---------------------------------------------------------
  if (typeof node.betweenness === 'number' && node.betweenness > 0.1) {
    advice.push({
      severity: 'info',
      title: 'Bridge page',
      detail:
        'High betweenness — this page sits on many paths between other pages. If you remove or rename it, fix inbound links carefully or many flows break.',
    });
  }

  // --- HTTP status ---------------------------------------------------------
  if (node.status_code != null && node.status_code >= 400) {
    advice.push({
      severity: 'warn',
      title: `HTTP ${node.status_code}`,
      detail:
        'Returned an error. Restore the page or add a 301 redirect to a relevant alternative — broken pages bleed PageRank.',
    });
  }

  if (advice.length === 0) {
    advice.push({
      severity: 'good',
      title: 'Looks healthy',
      detail: 'No obvious link-graph issues. Inbound, outbound, depth, and rank are all in reasonable ranges.',
    });
  }

  return advice;
}

/**
 * One-shot advice for the whole site, shown when no page is selected.
 */
export function getSiteAdvice(nodes: GraphNode[]): Advice[] {
  const advice: Advice[] = [];
  if (nodes.length === 0) return advice;

  const orphans = nodes.filter((n) => n.in_degree === 0 && (n.depth ?? 0) > 0).length;
  const deadEnds = nodes.filter((n) => n.out_degree === 0).length;
  const deep = nodes.filter((n) => (n.depth ?? 0) >= 4).length;

  if (orphans > 0) {
    advice.push({
      severity: 'warn',
      title: `${orphans} orphan page${orphans > 1 ? 's' : ''}`,
      detail: 'Pages no other page links to. They are nearly invisible to crawlers and to PageRank. Link them from a hub.',
    });
  }
  if (deadEnds > nodes.length * 0.2) {
    advice.push({
      severity: 'warn',
      title: `${deadEnds} dead-end pages`,
      detail: 'Pages with no outbound internal links trap PageRank. Add contextual links so authority keeps flowing.',
    });
  }
  if (deep > 0) {
    advice.push({
      severity: 'info',
      title: `${deep} page${deep > 1 ? 's' : ''} ≥4 clicks deep`,
      detail: 'Deep pages get crawled less often. Promote important ones via the main navigation or topic hubs.',
    });
  }
  if (advice.length === 0) {
    advice.push({
      severity: 'good',
      title: 'Solid structure',
      detail: 'No orphans, no excessive depth, no dead-end clusters. Crawl flow looks healthy.',
    });
  }
  return advice;
}
