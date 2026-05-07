"""NetworkX graph metrics."""

from __future__ import annotations

import networkx as nx

from .models import GraphPayload


def build_digraph(graph: GraphPayload) -> nx.DiGraph:
    g = nx.DiGraph()
    for node in graph.nodes:
        g.add_node(node.id)
    for edge in graph.edges:
        if edge.source in g and edge.target in g:
            g.add_edge(edge.source, edge.target)
    return g


def compute_metrics(graph: GraphPayload) -> dict[str, dict[str, float]]:
    """Return dict of metric_name → { node_id: value }."""
    g = build_digraph(graph)
    if g.number_of_nodes() == 0:
        return {}

    metrics: dict[str, dict[str, float]] = {}

    try:
        metrics["pagerank"] = nx.pagerank(g, alpha=0.85, max_iter=100)
    except nx.PowerIterationFailedConvergence:
        metrics["pagerank"] = {n: 1.0 / g.number_of_nodes() for n in g.nodes}

    # Betweenness can be expensive; cap for big graphs via k sampling
    k = min(g.number_of_nodes(), 100)
    metrics["betweenness"] = nx.betweenness_centrality(g, k=k, normalized=True)
    metrics["in_degree_centrality"] = nx.in_degree_centrality(g)
    metrics["out_degree_centrality"] = nx.out_degree_centrality(g)

    return metrics


def annotate_graph(graph: GraphPayload, metrics: dict[str, dict[str, float]]) -> None:
    """Mutate nodes with computed metrics in-place."""
    pr = metrics.get("pagerank", {})
    bw = metrics.get("betweenness", {})
    for node in graph.nodes:
        node.pagerank = pr.get(node.id)
        node.betweenness = bw.get(node.id)
