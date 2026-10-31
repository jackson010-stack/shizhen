import { useEffect, useMemo, useRef, useState } from 'react';
import WatchRail from '../components/WatchRail';
import SiteTopBar from '../components/SiteTopBar';
import ChannelTabs from '../components/ChannelTabs';
import MovieCard from '../components/MovieCard';
import BottomTabs from '../components/BottomTabs';
import FilterDrawer from '../components/FilterDrawer';
import CatalogFilters from '../components/CatalogFilters';
import { api } from '../api';
import type {
  CatalogFilterOption,
  CatalogFilterRow,
  CatalogUiGroup,
  ChannelKey,
  MovieCard as Card,
} from '../types';
import { navigate } from '../App';
import { applyFilterOption } from '../filters';

let uiCache: CatalogUiGroup[] | null = null;
let uiPending: Promise<CatalogUiGroup[]> | null = null;
function loadCatalogUi() {
  if (uiCache) return Promise.resolve(uiCache);
  if (!uiPending) {
    uiPending = api.catalogUi().then(
      (r) => (uiCache = r.catalogs ?? []),
      (e) => {
        uiPending = null;
        throw e;
      },
    );
  }
  return uiPending;
}

/** 原站断点：≥900px 用内联筛选树，窄屏用排序胶囊 + 筛选抽屉 */
function useWide(minWidth = 900) {
  const [wide, setWide] = useState(() => window.matchMedia(`(min-width: ${minWidth}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [minWidth]);
  return wide;
}

export default function BrowsePage({ params }: { params: URLSearchParams }) {
  const q = params.get('q') || '';
  const kind = (params.get('kind') as ChannelKey) || 'series';
  const sort = params.get('sort') === 'updated_desc' ? 'updated_desc' : 'heat_desc';
  const queryKey = params.toString();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [uiGroup, setUiGroup] = useState<CatalogUiGroup | null>(null);
  const [uiLoading, setUiLoading] = useState(false);
  const [uiError, setUiError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const wide = useWide(900);

  const filters = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(queryKey)) {
      if (k !== 'kind' && k !== 'q' && k !== 'page' && k !== 'limit') out[k] = v;
    }
    if (!out.sort) out.sort = 'heat_desc';
    return out;
  }, [queryKey]);

  const hasFilters = Object.keys(filters).some((k) => k !== 'sort');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr('');
    api
      .search(q, {
        page: 1,
        limit: 24,
        kind: q ? undefined : kind,
        filters: q ? undefined : filters,
      })
      .then((r) => alive && setCards(r.items))
      .catch((e) => alive && setErr(String(e.message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, kind, filters]);

  useEffect(() => {
    let alive = true;
    setUiLoading(true);
    setUiError('');
    loadCatalogUi()
      .then((list) => alive && setUiGroup(list.find((g) => g.kind === kind) ?? null))
      .catch((e) => alive && setUiError(String(e.message || e)))
      .finally(() => alive && setUiLoading(false));
    return () => {
      alive = false;
    };
  }, [kind]);

  useEffect(() => setDrawerOpen(false), [kind]);

  useEffect(() => {
    if (wide) setDrawerOpen(false);
  }, [wide]);

  const setSort = (next: string) => {
    const p = new URLSearchParams(params);
    p.set('sort', next);
    p.delete('page');
    navigate(`/browse?${p.toString()}`);
  };

  const measureAnchor = () => {
    const nav = tabsRef.current?.querySelector('.channel-tabs');
    const main = document.querySelector('.site-main');
    const navRect = nav?.getBoundingClientRect();
    const mainRect = main?.getBoundingClientRect();
    setAnchor({
      top: Math.max(0, Math.round(navRect?.bottom ?? 0)),
      left: Math.max(0, Math.round(mainRect?.left ?? 0)),
    });
  };

  const openDrawer = () => {
    measureAnchor();
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const onResize = () => measureAnchor();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawerOpen]);

  const apply = (row: CatalogFilterRow, opt: CatalogFilterOption | null) => {
    const next = applyFilterOption(new URLSearchParams(params), row, opt);
    next.delete('q');
    next.delete('limit');
    navigate(`/browse?${next.toString()}`);
  };

  const reset = () => navigate(`/browse?kind=${kind}`);

  return (
    <div className="site-shell">
      <WatchRail onExpand={() => {}} onHome={() => navigate('/')} active="home" />

      <div className="site-main">
        <SiteTopBar />

        <div className="site-scroll">
          <div ref={tabsRef}>
            <ChannelTabs active={kind} />
          </div>

          {wide && uiGroup && !q ? (
            <CatalogFilters rows={uiGroup.rows} params={params} onApply={apply} />
          ) : (
            <div className="browse-bar">
              <button
                className={`sort-pill${sort === 'updated_desc' ? ' active' : ''}`}
                aria-pressed={sort === 'updated_desc'}
                onClick={() => setSort('updated_desc')}
              >
                最新
              </button>
              <button
                className={`sort-pill${sort === 'heat_desc' ? ' active' : ''}`}
                aria-pressed={sort === 'heat_desc'}
                onClick={() => setSort('heat_desc')}
              >
                最热
              </button>
              <div className="spacer" />
              {!q ? (
                <button className="filter-btn" title="筛选" aria-haspopup="dialog" onClick={openDrawer}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M2 5h20" />
                    <path d="M6 12h12" />
                    <path d="M9 19h6" />
                  </svg>
                  筛选
                </button>
              ) : null}
            </div>
          )}

          <div className="meta-line">
            第 1 页 · 本页 {cards.length} 部{q ? ` · 搜索「${q}」` : ''}
          </div>

          {err ? <div className="error-box">加载失败：{err}</div> : null}
          {loading ? (
            <div className="loading">{hasFilters ? '正在筛选影片…' : '加载中…'}</div>
          ) : (
            <div className="card-grid">
              {cards.map((m) => (
                <MovieCard key={m.id} m={m} />
              ))}
            </div>
          )}
          {!loading && !cards.length && !err ? <div className="loading">没有结果</div> : null}
        </div>
      </div>

      <BottomTabs active="home" />

      {drawerOpen ? (
        <FilterDrawer
          group={uiGroup}
          params={params}
          loading={uiLoading}
          error={uiError}
          anchor={anchor}
          onApply={apply}
          onReset={reset}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
