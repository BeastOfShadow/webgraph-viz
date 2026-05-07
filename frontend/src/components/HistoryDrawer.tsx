import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';
import { useGraphStore } from '../store';
import type { CrawlMeta } from '../types';

interface Props {
  onLoad: (id: string) => void;
}

export default function HistoryDrawer({ onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const history = useGraphStore((s) => s.history);
  const setHistory = useGraphStore((s) => s.setHistory);
  const status = useGraphStore((s) => s.status);

  useEffect(() => {
    refresh();
  }, [status]);

  async function refresh() {
    try {
      const list = await api.listCrawls();
      setHistory(list);
    } catch {
      /* surfaced elsewhere */
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm(`Delete crawl ${id}?`)) return;
    await api.deleteCrawl(id);
    setHistory(history.filter((c) => c.id !== id));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700"
      >
        <HistoryIcon size={14} />
        History
        {history.length > 0 && (
          <span className="rounded-full bg-zinc-800 px-1.5 text-[10px] text-zinc-300">
            {history.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-96 w-96 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {history.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">No crawls yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {history.map((c) => (
                <HistoryItem
                  key={c.id}
                  crawl={c}
                  onClick={() => {
                    setOpen(false);
                    onLoad(c.id);
                  }}
                  onDelete={(e) => handleDelete(e, c.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  crawl,
  onClick,
  onDelete,
}: {
  crawl: CrawlMeta;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const date = new Date(crawl.started_at).toLocaleString();
  const statusColor =
    crawl.status === 'done'
      ? 'text-emerald-400'
      : crawl.status === 'error'
        ? 'text-red-400'
        : crawl.status === 'running'
          ? 'text-indigo-400'
          : 'text-zinc-500';
  return (
    <li>
      <button
        onClick={onClick}
        className="group flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-900"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-100">{crawl.domain}</span>
            <span className={`text-[10px] uppercase tracking-wide ${statusColor}`}>
              {crawl.status}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">{date}</div>
          <div className="mt-1 flex gap-3 text-[11px] text-zinc-400">
            <span>{crawl.total_pages} pages</span>
            <span>{crawl.total_links} links</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          title="Delete crawl"
        >
          <Trash2 size={14} />
        </button>
      </button>
    </li>
  );
}
