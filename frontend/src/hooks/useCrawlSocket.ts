import { useEffect } from 'react';

import { useGraphStore } from '../store';
import type { GraphEdge, GraphNode, WsEvent } from '../types';

/**
 * Subscribe to /api/ws/<crawlId>. Each message updates the Zustand store.
 * Reconnects automatically up to 3 times on transient drops.
 */
export function useCrawlSocket(crawlId: string | null) {
  useEffect(() => {
    if (!crawlId) return;

    let attempts = 0;
    let socket: WebSocket | null = null;
    let cancelled = false;

    const { upsertNode, addEdge, replaceNodes, setComplete, setError } = useGraphStore.getState();

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/api/ws/${crawlId}`;
      socket = new WebSocket(url);

      socket.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WsEvent;
          switch (event.type) {
            case 'crawl_started':
              if (Array.isArray(event.payload.nodes)) {
                replaceNodes(event.payload.nodes as GraphNode[]);
              }
              break;
            case 'node_added':
              upsertNode(event.payload as unknown as GraphNode);
              break;
            case 'edge_added':
              addEdge(event.payload as unknown as GraphEdge);
              break;
            case 'metrics_computed':
              if (Array.isArray(event.payload.nodes)) {
                replaceNodes(event.payload.nodes as GraphNode[]);
              }
              break;
            case 'complete': {
              const stats = event.payload.stats as Record<string, number> | undefined;
              setComplete(
                stats
                  ? {
                      total_pages: stats.total_pages ?? 0,
                      total_links: stats.total_links ?? 0,
                      errors: stats.errors ?? 0,
                      duration_ms: stats.duration_ms,
                    }
                  : undefined
              );
              break;
            }
            case 'error':
              setError(String(event.payload.error ?? 'Unknown error'));
              break;
          }
        } catch (err) {
          console.error('Bad WS message', err);
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        if (attempts++ < 3) {
          setTimeout(connect, 1000 * attempts);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [crawlId]);
}
