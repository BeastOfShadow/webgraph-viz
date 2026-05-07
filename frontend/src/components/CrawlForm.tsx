import { Loader2, Play, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { api } from '../lib/api';
import { useGraphStore } from '../store';
import { DEFAULT_CONFIG, type CrawlConfig } from '../types';

interface Props {
  onCrawlStarted: (id: string) => void;
}

export default function CrawlForm({ onCrawlStarted }: Props) {
  const status = useGraphStore((s) => s.status);
  const startStore = useGraphStore((s) => s.startCrawl);
  const setError = useGraphStore((s) => s.setError);

  const [url, setUrl] = useState('https://simonenegro.com');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<CrawlConfig>(DEFAULT_CONFIG);
  const [submitting, setSubmitting] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const isRunning = status === 'running' || submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      const crawl = await api.startCrawl(url, config);
      startStore({ id: crawl.id, rootUrl: crawl.root_url, domain: crawl.domain });
      onCrawlStarted(crawl.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start crawl';
      setLocalError(message);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          disabled={isRunning}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          disabled={isRunning}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-60"
          title="Advanced options"
        >
          <Settings2 size={16} />
        </button>
        <button
          type="submit"
          disabled={isRunning}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {isRunning ? 'Crawling…' : 'Crawl'}
        </button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs sm:grid-cols-4">
          <NumberField
            label="max pages"
            value={config.max_pages}
            min={1}
            max={5000}
            onChange={(v) => setConfig({ ...config, max_pages: v })}
          />
          <NumberField
            label="max depth"
            value={config.max_depth}
            min={1}
            max={20}
            onChange={(v) => setConfig({ ...config, max_depth: v })}
          />
          <NumberField
            label="concurrency"
            value={config.concurrency}
            min={1}
            max={20}
            onChange={(v) => setConfig({ ...config, concurrency: v })}
          />
          <NumberField
            label="timeout (s)"
            value={config.request_timeout}
            min={1}
            max={60}
            onChange={(v) => setConfig({ ...config, request_timeout: v })}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-zinc-400">
      <span className="uppercase tracking-wide text-[10px]">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-100 focus:border-indigo-500 focus:outline-none"
      />
    </label>
  );
}
