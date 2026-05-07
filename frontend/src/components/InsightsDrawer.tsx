import { Lightbulb } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getSiteAdvice } from '../lib/advice';
import { useGraphStore } from '../store';
import AdviceList from './AdviceList';

export default function InsightsDrawer() {
  const [open, setOpen] = useState(false);
  const nodes = useGraphStore((s) => s.nodes);

  const advice = useMemo(() => getSiteAdvice(Array.from(nodes.values())), [nodes]);

  const warnCount = advice.filter((a) => a.severity === 'warn').length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700"
        disabled={nodes.size === 0}
        title={nodes.size === 0 ? 'Crawl a site first' : 'Site insights'}
      >
        <Lightbulb size={14} />
        Insights
        {warnCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
            {warnCount}
          </span>
        )}
      </button>

      {open && nodes.size > 0 && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-[28rem] w-96 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
          <h3 className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
            Site-wide insights
          </h3>
          <AdviceList items={advice} />
          <p className="mt-3 text-[10px] text-zinc-600">
            Click any node in the graph for advice specific to that page.
          </p>
        </div>
      )}
    </div>
  );
}
