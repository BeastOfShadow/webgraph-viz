# WebGraph Viz

Crawl any website and watch its link graph build itself in real time.

Each page becomes a node; each `<a href>` becomes an edge. The crawler streams
discoveries over WebSocket, so the React Flow canvas grows live as the BFS
walks the site. After the crawl finishes, NetworkX computes PageRank and
betweenness centrality so you can see which pages the site actually pivots on.

## Stack

| Layer       | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Backend     | Python 3.12, FastAPI, uvicorn, httpx, selectolax, NetworkX, Pydantic |
| Frontend    | TypeScript, Vite, React, React Flow (`@xyflow/react`), Zustand, Tailwind |
| Storage     | JSON files (`data/crawls/`, `data/sites/`, `data/index.json`)         |
| Orchestration | Docker Compose, Nginx (frontend), uv (Python deps)                  |

## Run with Docker (recommended)

```bash
./webgraph.sh up        # build + start (detached)
./webgraph.sh logs      # tail logs
./webgraph.sh down      # stop + remove containers
./webgraph.sh rebuild   # rebuild images without cache
./webgraph.sh shell backend   # open shell in backend container
```

Or directly: `docker compose up --build`

Open <http://localhost:5173>.

## Run locally (development)

Two terminals:

**Backend**

```bash
cd backend
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` and the
WebSocket upgrade to <http://localhost:8000>.

## REST API

| Method | Path                        | Purpose                              |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/api/crawls`               | Start a crawl. Body: `{url, config?}` |
| GET    | `/api/crawls`               | List crawls (`?domain=` optional)    |
| GET    | `/api/crawls/{id}`          | Full crawl snapshot                  |
| DELETE | `/api/crawls/{id}`          | Delete a crawl                       |
| GET    | `/api/sites`                | List per-domain configs              |
| GET/PUT| `/api/sites/{domain}`       | Read/upsert per-domain config        |
| WS     | `/api/ws/{crawl_id}`        | Stream crawl events                  |

OpenAPI docs: <http://localhost:8000/docs>.

## WebSocket events

Each event is JSON: `{ "type", "crawl_id", "payload" }`.

| `type`             | Payload                                                |
| ------------------ | ------------------------------------------------------ |
| `crawl_started`    | `{domain, root_url, [nodes, edges]}` (replay on reconnect) |
| `node_added`       | a `GraphNode`                                          |
| `edge_added`       | a `GraphEdge`                                          |
| `page_done`        | `{url, status, visited, queued}`                       |
| `metrics_computed` | `{metrics, nodes}` (nodes carry pagerank/betweenness)  |
| `complete`         | `{stats}`                                              |
| `error`            | `{error}`                                              |

## Project layout

```
webgraph-viz/
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── src/backend/
│       ├── main.py        # FastAPI app + CORS
│       ├── api.py         # REST + WS routes
│       ├── crawler.py     # async BFS crawler (httpx + selectolax)
│       ├── graph.py       # NetworkX metrics
│       ├── models.py      # Pydantic models (single source of truth)
│       ├── storage.py     # JSON file store
│       └── ws.py          # WebSocket fan-out manager
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── GraphCanvas.tsx    # React Flow canvas
│       │   ├── CustomNode.tsx     # node renderer
│       │   ├── CrawlForm.tsx      # URL input + start
│       │   ├── Sidebar.tsx        # selected-node detail panel
│       │   ├── RankingsPanel.tsx  # full-height rankings by metric
│       │   ├── InsightsDrawer.tsx # site-wide SEO/UX advice
│       │   ├── HistoryDrawer.tsx  # past crawl history
│       │   └── AdviceList.tsx     # reusable advice cards
│       ├── hooks/useCrawlSocket.ts
│       ├── lib/           # api client, layout engine, advice rules
│       ├── store.ts       # Zustand global state
│       └── types.ts       # mirrors backend Pydantic models
├── data/                  # JSON snapshots (gitignored)
└── docker-compose.yml
```

## Crawl configuration

Per-crawl config (POST `/api/crawls` body) or per-domain default
(`PUT /api/sites/{domain}`):

```json
{
  "max_pages": 200,
  "max_depth": 5,
  "respect_robots": true,
  "use_browser": false,
  "exclude_patterns": ["/admin/*", "*.pdf"],
  "user_agent": "WebGraphViz/1.0",
  "request_timeout": 10,
  "concurrency": 4
}
```

Per-domain config falls back when `config` is omitted on POST.

## Limits & roadmap

* `use_browser: true` is reserved for a future Crawlee/Playwright-backed
  fetcher (SPA support). Today the fetch layer is `httpx` only.
* `respect_robots: true` is currently advisory — add `robots.txt` parsing
  before scaling crawls beyond a personal site.
* Layout uses BFS-depth concentric rings. Swap in `dagre` or `elkjs` for
  larger graphs if needed.

## License

AGPL-3.0 license.
