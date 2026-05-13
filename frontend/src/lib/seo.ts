import type { GraphNode } from '../types';

export type CheckStatus = 'ok' | 'warn' | 'error';

export interface SeoCheck {
  label: string;
  status: CheckStatus;
  detail: string;
  content?: string;
}

export interface SeoChecks {
  technical: SeoCheck[];
  onpage: SeoCheck[];
}

export function buildSeoChecks(node: GraphNode): SeoChecks {
  return {
    technical: [
      httpsCheck(node),
      statusCheck(node),
      loadTimeCheck(node),
      noindexCheck(node),
      canonicalCheck(node),
    ],
    onpage: [
      titleCheck(node),
      h1Check(node),
      metaDescCheck(node),
      imagesAltCheck(node),
      wordCountCheck(node),
    ],
  };
}

export function seoColor(score: number): { text: string; bg: string; ring: string } {
  if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' };
  if (score >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-500', ring: 'ring-yellow-500/30' };
  if (score >= 40) return { text: 'text-orange-400', bg: 'bg-orange-500', ring: 'ring-orange-500/30' };
  return { text: 'text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30' };
}

// ── Technical checks ──────────────────────────────────────────────────────────

function httpsCheck(node: GraphNode): SeoCheck {
  const ok = node.url.startsWith('https://');
  return {
    label: 'HTTPS',
    status: ok ? 'ok' : 'error',
    detail: ok ? 'Connessione sicura' : 'Nessun certificato SSL',
  };
}

function statusCheck(node: GraphNode): SeoCheck {
  const code = node.status_code;
  if (code == null) return { label: 'Status HTTP', status: 'warn', detail: 'Sconosciuto' };
  if (code === 200) return { label: 'Status HTTP', status: 'ok', detail: '200 OK' };
  if (code >= 300 && code < 400) return { label: 'Status HTTP', status: 'warn', detail: `${code} Redirect` };
  return { label: 'Status HTTP', status: 'error', detail: `${code} Errore` };
}

function loadTimeCheck(node: GraphNode): SeoCheck {
  const ms = node.load_time_ms;
  if (ms == null) return { label: 'Velocità', status: 'warn', detail: 'Non misurata' };
  const s = (ms / 1000).toFixed(1);
  if (ms < 1000) return { label: 'Velocità', status: 'ok', detail: `${s}s — ottima` };
  if (ms < 3000) return { label: 'Velocità', status: 'warn', detail: `${s}s — migliorabile` };
  return { label: 'Velocità', status: 'error', detail: `${s}s — troppo lenta` };
}

function noindexCheck(node: GraphNode): SeoCheck {
  if (node.robots_noindex == null) return { label: 'Indicizzazione', status: 'warn', detail: 'Sconosciuta' };
  if (node.robots_noindex) return { label: 'Indicizzazione', status: 'error', detail: 'noindex attivo' };
  return { label: 'Indicizzazione', status: 'ok', detail: 'Indicizzabile' };
}

function canonicalCheck(node: GraphNode): SeoCheck {
  if (node.canonical_url) return { label: 'Canonical', status: 'ok', detail: 'Presente' };
  return { label: 'Canonical', status: 'warn', detail: 'Tag canonical assente' };
}

// ── On-page checks ────────────────────────────────────────────────────────────

function titleCheck(node: GraphNode): SeoCheck {
  const len = node.title_length ?? (node.title ? node.title.length : 0);
  const content = node.title && node.title !== node.url ? node.title : undefined;
  if (len === 0) return { label: 'Title tag', status: 'error', detail: 'Assente' };
  if (len < 10) return { label: 'Title tag', status: 'warn', detail: `Troppo corto (${len} car.)`, content };
  if (len > 60) return { label: 'Title tag', status: 'warn', detail: `Troppo lungo (${len} car.)`, content };
  return { label: 'Title tag', status: 'ok', detail: `${len} caratteri`, content };
}

function h1Check(node: GraphNode): SeoCheck {
  const n = node.h1_count;
  const content = node.h1_text ?? undefined;
  if (n == null) return { label: 'H1', status: 'warn', detail: 'Sconosciuto' };
  if (n === 0) return { label: 'H1', status: 'error', detail: 'Nessun H1' };
  if (n === 1) return { label: 'H1', status: 'ok', detail: 'Un H1 — corretto', content };
  return { label: 'H1', status: 'warn', detail: `${n} H1 — troppi`, content };
}

function metaDescCheck(node: GraphNode): SeoCheck {
  const text = node.meta_description_text ?? '';
  const len = text.length;
  const content = text || undefined;
  if (len === 0) return { label: 'Meta description', status: 'error', detail: 'Assente' };
  if (len < 50) return { label: 'Meta description', status: 'warn', detail: `Troppo corta (${len} car.)`, content };
  if (len > 155) return { label: 'Meta description', status: 'warn', detail: `Troppo lunga (${len} car.)`, content };
  return { label: 'Meta description', status: 'ok', detail: `${len} caratteri`, content };
}

function imagesAltCheck(node: GraphNode): SeoCheck {
  const total = node.image_count ?? 0;
  const missing = node.images_without_alt ?? 0;
  if (total === 0) return { label: 'Alt immagini', status: 'ok', detail: 'Nessuna immagine' };
  if (missing === 0) return { label: 'Alt immagini', status: 'ok', detail: `${total} img — tutte ok` };
  if (missing === total) return { label: 'Alt immagini', status: 'error', detail: `${missing}/${total} senza alt` };
  return { label: 'Alt immagini', status: 'warn', detail: `${missing}/${total} senza alt` };
}

function wordCountCheck(node: GraphNode): SeoCheck {
  const w = node.word_count;
  if (w == null) return { label: 'Contenuto', status: 'warn', detail: 'Non misurato' };
  if (w >= 300) return { label: 'Contenuto', status: 'ok', detail: `${w} parole` };
  if (w >= 150) return { label: 'Contenuto', status: 'warn', detail: `${w} parole — scarso` };
  return { label: 'Contenuto', status: 'error', detail: `${w} parole — insufficiente` };
}
