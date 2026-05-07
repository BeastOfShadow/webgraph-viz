import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useGraphStore } from '../store';
import type { GraphNode } from '../types';

type SortKey = 'pagerank' | 'betweenness' | 'in_degree' | 'out_degree';

const TABS: { key: SortKey; label: string; accent: string }[] = [
  { key: 'pagerank', label: 'PageRank', accent: 'text-indigo-400' },
  { key: 'betweenness', label: 'Betweenness', accent: 'text-violet-400' },
  { key: 'in_degree', label: 'Inbound', accent: 'text-emerald-400' },
  { key: 'out_degree', label: 'Outbound', accent: 'text-amber-400' },
];

export default function RankingsPanel() {
  const showRankings = useGraphStore((s) => s.showRankings);
  const toggleRankings = useGraphStore((s) => s.toggleRankings);
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const [sortKey, setSortKey] = useState<SortKey>('pagerank');

  const ranked = useMemo(() => {
    return Array.from(nodes.values()).sort(
      (a, b) => Number(b[sortKey] ?? -Infinity) - Number(a[sortKey] ?? -Infinity),
    );
  }, [nodes, sortKey]);

  const maxVal = ranked.length > 0 ? (ranked[0][sortKey] as number | undefined) : undefined;
  const activeTab = TABS.find((t) => t.key === sortKey)!;

  if (!showRankings || nodes.size === 0) return null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Rankings</h2>
        <button
          onClick={toggleRankings}
          className="text-zinc-500 hover:text-zinc-200"
          aria-label="Close rankings"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex gap-1 border-b border-zinc-800 px-3 py-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`rounded px-2 py-1 text-[11px] uppercase tracking-wide transition-colors ${
              sortKey === key
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-zinc-500">
        {ranked.length} pages · sorted by{' '}
        <span className={activeTab.accent}>{activeTab.label}</span>
      </div>

      <ul className="flex-1 divide-y divide-zinc-900 overflow-y-auto">
        {ranked.map((node, i) => (
          <RankRow
            key={node.id}
            rank={i + 1}
            node={node}
            metric={sortKey}
            max={typeof maxVal === 'number' ? maxVal : undefined}
            accent={activeTab.accent}
            onSelect={() => {
              selectNode(node);
              toggleRankings();
            }}
          />
        ))}
      </ul>
    </aside>
  );
}

function RankRow({
  rank,
  node,
  metric,
  max,
  accent,
  onSelect,
}: {
  rank: number;
  node: GraphNode;
  metric: SortKey;
  max?: number;
  accent: string;
  onSelect: () => void;
}) {
  const value = node[metric];
  const numeric = typeof value === 'number' ? value : null;
  const ratio = numeric != null && max && max > 0 ? numeric / max : 0;
  const formatted = formatValue(metric, numeric);

  return (
    <li>
      <button
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-900 active:bg-zinc-800"
      >
        <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-zinc-600">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-zinc-100" title={node.title}>
            {node.title || node.label}
          </div>
          <div className="truncate text-[11px] text-zinc-500" title={node.url}>
            {node.label}
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full bg-current ${accent}`}
              style={{ width: `${Math.max(2, ratio * 100)}%` }}
            />
          </div>
        </div>
        <span className={`shrink-0 text-xs tabular-nums ${accent}`}>{formatted}</span>
      </button>
    </li>
  );
}

function formatValue(metric: SortKey, value: number | null): string {
  if (value == null) return '—';
  if (metric === 'pagerank' || metric === 'betweenness') return value.toFixed(3);
  return String(value);
}
