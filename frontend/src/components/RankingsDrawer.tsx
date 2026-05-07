import { BarChart3 } from 'lucide-react';

import { useGraphStore } from '../store';

export default function RankingsDrawer() {
  const nodes = useGraphStore((s) => s.nodes);
  const showRankings = useGraphStore((s) => s.showRankings);
  const toggleRankings = useGraphStore((s) => s.toggleRankings);

  return (
    <button
      onClick={toggleRankings}
      disabled={nodes.size === 0}
      title={nodes.size === 0 ? 'Crawl a site first' : 'Page rankings'}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
        showRankings
          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
      }`}
    >
      <BarChart3 size={14} />
      Rankings
    </button>
  );
}
