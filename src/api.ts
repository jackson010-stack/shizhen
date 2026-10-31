import type {
  CalendarList,
  CalendarSummary,
  CatalogDetail,
  CatalogUi,
  LinesResponse,
  ManifestInfo,
  MovieCard,
  ResolvedLine,
  LineOption,
  Suggestion,
} from './types';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  kind?: string;
  /** 筛选树参数：genre / area / language / year / sort / status / orientation */
  filters?: Record<string, string | undefined>;
}

export const api = {
  health: () => get<{ ok: boolean; cookies: string[] }>('/health'),

  search: (q: string, opts: SearchOptions = {}) => {
    const p = new URLSearchParams({
      page: String(opts.page ?? 1),
      limit: String(opts.limit ?? 24),
    });
    if (q) p.set('q', q);
    if (opts.kind) p.set('kind', opts.kind);
    for (const [k, v] of Object.entries(opts.filters ?? {})) if (v) p.set(k, v);
    return get<{ items: MovieCard[]; pagination: Record<string, unknown> }>(`/search?${p}`);
  },

  home: () => get<{ cards: MovieCard[] }>('/home'),

  suggest: (q: string, mode?: 'home' | 'thread', limit = 10) =>
    get<{ items: Suggestion[] }>(
      `/suggest?q=${encodeURIComponent(q)}&limit=${limit}${mode ? `&mode=${mode}` : ''}`,
    ),

  calendarSummary: (week = 'current') =>
    get<CalendarSummary>(`/calendar/summary?week=${encodeURIComponent(week)}`),

  calendar: (o: {
    week?: string;
    kind?: string;
    weekday?: number;
    sort?: string;
    limit?: number;
    moreUrl?: string;
  }) => {
    const p = new URLSearchParams();
    if (o.moreUrl) p.set('more', o.moreUrl);
    else {
      p.set('week', o.week ?? 'current');
      p.set('kind', o.kind ?? 'series');
      p.set('sort', o.sort ?? 'heat');
      p.set('limit', String(o.limit ?? 20));
      if (o.weekday != null) p.set('weekday', String(o.weekday));
    }
    return get<CalendarList>(`/calendar?${p}`);
  },

  detail: (id: string) => get<CatalogDetail>(`/detail/${encodeURIComponent(id)}`),
  catalogUi: () => get<CatalogUi>('/catalog-ui'),
  lines: (id: string, ep = 1) => get<LinesResponse>(`/lines/${encodeURIComponent(id)}?ep=${ep}`),
  resolve: (line: LineOption) => post<ResolvedLine>('/resolve', { line }),
  manifest: (line: LineOption) => post<ManifestInfo>('/manifest', { line }),
};
