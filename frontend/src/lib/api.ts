import type { Crawl, CrawlConfig, CrawlMeta } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  startCrawl(url: string, config?: Partial<CrawlConfig>): Promise<Crawl> {
    return request<Crawl>('/api/crawls', {
      method: 'POST',
      body: JSON.stringify({ url, config }),
    });
  },

  listCrawls(domain?: string): Promise<CrawlMeta[]> {
    const qs = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    return request<CrawlMeta[]>(`/api/crawls${qs}`);
  },

  getCrawl(id: string): Promise<Crawl> {
    return request<Crawl>(`/api/crawls/${id}`);
  },

  deleteCrawl(id: string): Promise<{ deleted: string }> {
    return request<{ deleted: string }>(`/api/crawls/${id}`, { method: 'DELETE' });
  },
};
