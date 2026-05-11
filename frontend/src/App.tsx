import { Download, Network, GitBranch } from 'lucide-react';
import { useEffect, useState } from 'react';

import CrawlForm from './components/CrawlForm';
import GraphCanvas from './components/GraphCanvas';
import HistoryDrawer from './components/HistoryDrawer';
import InsightsDrawer from './components/InsightsDrawer';
import RankingsDrawer from './components/RankingsDrawer';
import RankingsPanel from './components/RankingsPanel';
import Sidebar from './components/Sidebar';
import TreeView from './components/TreeView';
import { useCrawlSocket } from './hooks/useCrawlSocket';
import { api } from './lib/api';
import { downloadReport } from './lib/report';
import { useGraphStore } from './store';

export default function App() {
  const [crawlId, setCrawlId] = useState<string | null>(null);

  const status = useGraphStore((s) => s.status);
  const stats = useGraphStore((s) => s.stats);
  const errorMessage = useGraphStore((s) => s.errorMessage);
  const startStore = useGraphStore((s) => s.startCrawl);
  const replaceNodes = useGraphStore((s) => s.replaceNodes);
  const setComplete = useGraphStore((s) => s.setComplete);
  const setHistory = useGraphStore((s) => s.setHistory);
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewMode = useGraphStore((s) => s.setViewMode);

  useCrawlSocket(crawlId);

  useEffect(() => {
    api.listCrawls().then(setHistory).catch(() => {});
  }, [setHistory]);

  async function loadHistorical(id: string) {
    try {
      const crawl = await api.getCrawl(id);
      startStore({ id: crawl.id, rootUrl: crawl.root_url, domain: crawl.domain });
      replaceNodes(crawl.graph.nodes);
      for (const edge of crawl.graph.edges) {
        useGraphStore.getState().addEdge(edge);
      }
      if (crawl.status === 'done') {
        setComplete(crawl.stats);
      }
      setCrawlId(null); // do not reopen WS for finished crawls
    } catch (err) {
      console.error('failed to load crawl', err);
    }
  }

  const hasGraph = stats.total_pages > 0;

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Network size={20} className="text-indigo-400" />
            <h1 className="text-base font-semibold text-zinc-100">WebGraph</h1>
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              v0.1
            </span>
          </div>
          <div className="min-w-[280px] flex-1">
            <CrawlForm onCrawlStarted={setCrawlId} />
          </div>
          <div className="flex items-center gap-3">
            {hasGraph && (
              <div className="text-xs text-zinc-500">
                <span className="text-zinc-300">{stats.total_pages}</span> pages ·{' '}
                <span className="text-zinc-300">{stats.total_links}</span> links
                {status === 'running' && (
                  <span className="ml-2 inline-flex items-center gap-1 text-indigo-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                    live
                  </span>
                )}
              </div>
            )}
            {hasGraph && (
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'graph' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Graph view"
                >
                  <Network size={13} />
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'tree' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Tree view"
                >
                  <GitBranch size={13} />
                </button>
              </div>
            )}
            <RankingsDrawer />
            <InsightsDrawer />
            <HistoryDrawer onLoad={loadHistorical} />
            <ReportButton />
            <a
              href="https://github.com/BeastOfShadow/webgraph-viz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-200"
              title="GitHub"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-2 text-xs text-red-300">
          {errorMessage}
        </div>
      )}

      <main className="flex flex-1 overflow-hidden">
        <RankingsPanel />
        {hasGraph ? (
          <>
            <div className="flex-1">
              {viewMode === 'graph' ? <GraphCanvas /> : <TreeView />}
            </div>
            <Sidebar />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function ReportButton() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const domain = useGraphStore((s) => s.domain);

  if (nodes.size === 0) return null;

  return (
    <button
      onClick={() =>
        downloadReport(
          domain ?? 'site',
          Array.from(nodes.values()),
          Array.from(edges.values()),
        )
      }
      className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700"
      title="Download AI-ready report"
    >
      <Download size={14} />
      Report
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <Network size={24} className="text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Visualize any site as a graph</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Enter a URL above. Pages become nodes, links become edges, and the graph builds in real
          time as the crawler discovers them.
        </p>
      </div>
    </div>
  );
}
