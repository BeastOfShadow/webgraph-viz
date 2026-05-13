import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';

import { seoColor } from '../lib/seo';
import type { GraphNode } from '../types';

type Props = NodeProps & { data: GraphNode };

export default function CustomNode({ data, selected }: Props) {
  const isRoot = (data.depth ?? 0) === 0;
  const sizeClass = isRoot ? 'min-w-[220px]' : 'min-w-[180px]';
  const accent = isRoot
    ? 'border-indigo-400 ring-1 ring-indigo-400/40'
    : data.in_degree >= 5
      ? 'border-violet-500/70'
      : 'border-zinc-700';

  const seo = data.seo_score != null ? seoColor(data.seo_score) : null;

  return (
    <div
      className={clsx(
        'rounded-xl border bg-zinc-900 p-3 shadow-lg transition-colors',
        sizeClass,
        accent,
        selected && 'ring-2 ring-indigo-400'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-zinc-500 !bg-zinc-700"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100" title={data.title}>
            {data.title}
          </div>
          <div className="truncate text-xs text-zinc-500" title={data.url}>
            {data.label}
          </div>
        </div>
        {isRoot && (
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
            root
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
        <span>
          ↘︎ <span className="font-semibold text-zinc-200">{data.in_degree}</span>
        </span>
        <span>
          ↗︎ <span className="font-semibold text-zinc-200">{data.out_degree}</span>
        </span>
        {data.pagerank != null && (
          <span title="PageRank">
            PR <span className="font-semibold text-indigo-300">{data.pagerank.toFixed(3)}</span>
          </span>
        )}
      </div>

      {seo && (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">SEO</span>
            <span className={clsx('font-semibold tabular-nums', seo.text)}>
              {Math.round(data.seo_score!)}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={clsx('h-full rounded-full', seo.bg)}
              style={{ width: `${data.seo_score}%` }}
            />
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-zinc-500 !bg-zinc-700"
      />
    </div>
  );
}
