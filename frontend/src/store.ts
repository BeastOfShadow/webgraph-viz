import { create } from 'zustand';

import type { CrawlMeta, CrawlStats, GraphEdge, GraphNode } from './types';

export type CrawlStatus = 'idle' | 'running' | 'done' | 'error';
export type ViewMode = 'graph' | 'tree';

interface GraphState {
  crawlId: string | null;
  rootUrl: string | null;
  domain: string | null;
  status: CrawlStatus;
  errorMessage: string | null;

  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  selectedNode: GraphNode | null;
  showRankings: boolean;
  viewMode: ViewMode;
  stats: CrawlStats;
  history: CrawlMeta[];

  startCrawl: (info: { id: string; rootUrl: string; domain: string }) => void;
  upsertNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  replaceNodes: (nodes: GraphNode[]) => void;
  setComplete: (stats?: CrawlStats) => void;
  setError: (message: string) => void;
  selectNode: (node: GraphNode | null) => void;
  toggleRankings: () => void;
  setViewMode: (mode: ViewMode) => void;
  setHistory: (history: CrawlMeta[]) => void;
  reset: () => void;
}

const emptyStats: CrawlStats = { total_pages: 0, total_links: 0, errors: 0 };

export const useGraphStore = create<GraphState>((set) => ({
  crawlId: null,
  rootUrl: null,
  domain: null,
  status: 'idle',
  errorMessage: null,
  nodes: new Map(),
  edges: new Map(),
  selectedNode: null,
  showRankings: false,
  viewMode: 'graph' as ViewMode,
  stats: emptyStats,
  history: [],

  startCrawl: ({ id, rootUrl, domain }) =>
    set({
      crawlId: id,
      rootUrl,
      domain,
      status: 'running',
      errorMessage: null,
      nodes: new Map(),
      edges: new Map(),
      selectedNode: null,
      stats: emptyStats,
    }),

  upsertNode: (node) =>
    set((state) => {
      const next = new Map(state.nodes);
      const existing = next.get(node.id);
      next.set(node.id, existing ? { ...existing, ...node } : node);
      return {
        nodes: next,
        stats: { ...state.stats, total_pages: next.size },
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      if (state.edges.has(edge.id)) return state;
      const next = new Map(state.edges);
      next.set(edge.id, edge);
      return {
        edges: next,
        stats: { ...state.stats, total_links: next.size },
      };
    }),

  replaceNodes: (nodes) =>
    set((state) => {
      const next = new Map(state.nodes);
      for (const node of nodes) {
        const existing = next.get(node.id);
        next.set(node.id, existing ? { ...existing, ...node } : node);
      }
      return { nodes: next };
    }),

  setComplete: (stats) =>
    set((state) => ({
      status: 'done',
      stats: stats ?? state.stats,
    })),

  setError: (message) => set({ status: 'error', errorMessage: message }),

  selectNode: (node) => set({ selectedNode: node }),

  toggleRankings: () => set((state) => ({ showRankings: !state.showRankings })),

  setViewMode: (mode) => set({ viewMode: mode }),

  setHistory: (history) => set({ history }),

  reset: () =>
    set({
      crawlId: null,
      rootUrl: null,
      domain: null,
      status: 'idle',
      errorMessage: null,
      nodes: new Map(),
      edges: new Map(),
      selectedNode: null,
      stats: emptyStats,
    }),
}));
