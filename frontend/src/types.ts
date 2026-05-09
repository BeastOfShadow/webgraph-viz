export interface GraphNode {
  id: string;
  label: string;
  url: string;
  title: string;
  in_degree: number;
  out_degree: number;
  pagerank?: number | null;
  betweenness?: number | null;
  status_code?: number | null;
  depth?: number | null;
  external_links?: number | null;
  word_count?: number | null;
  image_count?: number | null;
  has_meta_description?: boolean | null;
  load_time_ms?: number | null;
  h1_count?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  anchor?: string | null;
}

export interface CrawlStats {
  total_pages: number;
  total_links: number;
  errors: number;
  duration_ms?: number | null;
}

export interface CrawlMeta {
  id: string;
  domain: string;
  root_url: string;
  started_at: string;
  finished_at?: string | null;
  status: string;
  total_pages: number;
  total_links: number;
}

export interface CrawlConfig {
  max_pages: number;
  max_depth: number;
  respect_robots: boolean;
  use_browser: boolean;
  exclude_patterns: string[];
  user_agent: string;
  request_timeout: number;
  concurrency: number;
}

export interface Crawl {
  id: string;
  domain: string;
  root_url: string;
  started_at: string;
  finished_at?: string | null;
  status: 'running' | 'done' | 'error' | 'cancelled';
  config: CrawlConfig;
  stats: CrawlStats;
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  metrics: Record<string, Record<string, number>>;
  error?: string | null;
}

export type WsEventType =
  | 'crawl_started'
  | 'node_added'
  | 'edge_added'
  | 'page_done'
  | 'metrics_computed'
  | 'complete'
  | 'error';

export interface WsEvent {
  type: WsEventType;
  crawl_id: string;
  payload: Record<string, unknown>;
}

export const DEFAULT_CONFIG: CrawlConfig = {
  max_pages: 200,
  max_depth: 5,
  respect_robots: true,
  use_browser: false,
  exclude_patterns: [],
  user_agent: 'WebGraphViz/1.0',
  request_timeout: 10,
  concurrency: 4,
};
