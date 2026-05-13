import clsx from 'clsx';
import { ChevronDown, ExternalLink, Lightbulb, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getPageAdvice } from '../lib/advice';
import { buildSeoChecks, seoColor, type CheckStatus, type SeoCheck } from '../lib/seo';
import { useGraphStore } from '../store';
import type { GraphNode } from '../types';
import AdviceList from './AdviceList';

export default function Sidebar() {
  const node = useGraphStore((s) => s.selectedNode);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const close = () => useGraphStore.getState().selectNode(null);
  const select = (n: GraphNode) => useGraphStore.getState().selectNode(n);

  const advice = useMemo(
    () => (node ? getPageAdvice(node, Array.from(nodes.values())) : []),
    [node, nodes]
  );

  const seoChecks = useMemo(() => (node ? buildSeoChecks(node) : null), [node]);

  if (!node) return null;

  const inLinks: GraphNode[] = [];
  const outLinks: GraphNode[] = [];
  for (const edge of edges.values()) {
    if (edge.target === node.id) {
      const src = nodes.get(edge.source);
      if (src) inLinks.push(src);
    } else if (edge.source === node.id) {
      const tgt = nodes.get(edge.target);
      if (tgt) outLinks.push(tgt);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <header className="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-zinc-100" title={node.title}>
            {node.title}
          </h2>
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex items-center gap-1 truncate text-xs text-indigo-400 hover:underline"
          >
            <span className="truncate">{node.url}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>
        <button
          onClick={close}
          className="text-zinc-500 hover:text-zinc-200"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 border-b border-zinc-800 px-4 py-3 text-center">
        <Stat label="inbound" value={node.in_degree} accent="text-indigo-400" />
        <Stat label="outbound" value={node.out_degree} accent="text-violet-400" />
        <Stat
          label="pagerank"
          value={node.pagerank != null ? node.pagerank.toFixed(3) : '—'}
          accent="text-emerald-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {node.betweenness != null && (
          <Row label="Betweenness" value={node.betweenness.toFixed(3)} />
        )}
        {node.depth != null && <Row label="Depth" value={String(node.depth)} />}
        {node.status_code != null && <Row label="Status" value={String(node.status_code)} />}
        {node.load_time_ms != null && (
          <Row
            label="Load time"
            value={`${node.load_time_ms} ms`}
            accent={node.load_time_ms > 3000 ? 'text-amber-400' : node.load_time_ms > 1000 ? 'text-yellow-400' : 'text-emerald-400'}
          />
        )}
        {node.word_count != null && <Row label="Words" value={String(node.word_count)} />}
        {node.h1_count != null && (
          <Row
            label="H1 tags"
            value={String(node.h1_count)}
            accent={node.h1_count !== 1 ? 'text-amber-400' : undefined}
          />
        )}
        {node.image_count != null && <Row label="Images" value={String(node.image_count)} />}
        {node.external_links != null && (
          <Row label="External links" value={String(node.external_links)} />
        )}

        {/* SEO Score section */}
        {node.seo_score != null && seoChecks && (
          <SeoSection node={node} checks={seoChecks} />
        )}

        {advice.length > 0 && (
          <section className="mt-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
              <Lightbulb size={12} /> Tips for this page
            </h3>
            <AdviceList items={advice} />
          </section>
        )}
        <LinkList title="Links from" nodes={inLinks} onSelect={select} />
        <LinkList title="Links to" nodes={outLinks} onSelect={select} />
      </div>
    </aside>
  );
}

function SeoSection({ node, checks }: { node: GraphNode; checks: ReturnType<typeof buildSeoChecks> }) {
  const tech = node.technical_score ?? 0;
  const onpage = node.onpage_score ?? 0;
  const total = node.seo_score ?? 0;
  const colors = seoColor(total);
  const techColors = seoColor(tech);
  const onpageColors = seoColor(onpage);

  return (
    <section className="mt-4">
      <h3 className="mb-3 text-[10px] uppercase tracking-wide text-zinc-500">SEO Score</h3>

      {/* Total score bar */}
      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11px] text-zinc-400">Punteggio totale</span>
          <span className={clsx('text-xl font-bold tabular-nums', colors.text)}>
            {Math.round(total)}
            <span className="text-sm font-normal text-zinc-600">/100</span>
          </span>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={clsx('h-full rounded-full transition-all', colors.bg)}
            style={{ width: `${total}%` }}
          />
        </div>

        {/* Sub-scores */}
        <div className="space-y-2">
          <SubScore label="Technical" score={tech} colors={techColors} />
          <SubScore label="On-page" score={onpage} colors={onpageColors} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        <CheckGroup title="Technical" checks={checks.technical} />
        <CheckGroup title="On-page" checks={checks.onpage} />
      </div>
    </section>
  );
}

function SubScore({
  label,
  score,
  colors,
}: {
  label: string;
  score: number;
  colors: ReturnType<typeof seoColor>;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] text-zinc-500">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={clsx('h-full rounded-full', colors.bg)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx('w-8 shrink-0 text-right text-[10px] tabular-nums font-medium', colors.text)}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function CheckGroup({ title, checks }: { title: string; checks: SeoCheck[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-600">{title}</div>
      <div className="divide-y divide-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        {checks.map((check) => (
          <CheckRow key={check.label} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheck }) {
  const [open, setOpen] = useState(false);
  const icon = statusIcon(check.status);
  const detailColor = check.status === 'ok' ? 'text-zinc-400' : check.status === 'warn' ? 'text-yellow-400' : 'text-red-400';
  const hasContent = Boolean(check.content);

  return (
    <div className="bg-zinc-900/40">
      <div
        className={clsx('flex items-center gap-2 px-3 py-2', hasContent && 'cursor-pointer hover:bg-zinc-800/60')}
        onClick={() => hasContent && setOpen((v) => !v)}
      >
        <span className="shrink-0 text-sm">{icon}</span>
        <span className="min-w-0 flex-1 text-xs text-zinc-300">{check.label}</span>
        <span className={clsx('shrink-0 text-[11px] tabular-nums', detailColor)}>
          {check.detail}
        </span>
        {hasContent && (
          <ChevronDown
            size={13}
            className={clsx('shrink-0 text-zinc-600 transition-transform', open && 'rotate-180')}
          />
        )}
      </div>
      {hasContent && open && (
        <div className="border-t border-zinc-800 px-3 py-2">
          <p className="break-words text-[11px] leading-relaxed text-zinc-400 italic">
            "{check.content}"
          </p>
        </div>
      )}
    </div>
  );
}

function statusIcon(status: CheckStatus): string {
  if (status === 'ok') return '✅';
  if (status === 'warn') return '⚠️';
  return '❌';
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div>
      <div className={`text-lg font-semibold ${accent}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-1.5 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={accent ?? 'text-zinc-200'}>{value}</span>
    </div>
  );
}

function LinkList({
  title,
  nodes,
  onSelect,
}: {
  title: string;
  nodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <section className="mt-4">
      <h3 className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
        {title} ({nodes.length})
      </h3>
      <ul className="space-y-0.5">
        {nodes.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => onSelect(n)}
              className="block w-full truncate rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              title={n.url}
            >
              {n.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
