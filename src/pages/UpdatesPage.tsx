import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WatchRail from '../components/WatchRail';
import SiteTopBar from '../components/SiteTopBar';
import ChannelTabs from '../components/ChannelTabs';
import BottomTabs from '../components/BottomTabs';
import { api } from '../api';
import type { CalendarItem, CalendarSummary } from '../types';
import { navigate } from '../App';

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayOf(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return iso(d);
}

function fmtMD(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

function dayNum(dateStr: string) {
  return Number(dateStr.split('-')[2]);
}

function kindLabel(k?: string) {
  switch (k) {
    case 'movie':
      return '电影';
    case 'series':
      return '电视剧';
    case 'anime':
      return '动漫';
    case 'variety':
      return '综艺';
    case 'short_drama':
      return '短剧';
    default:
      return k ?? '';
  }
}

export default function UpdatesPage({ params }: { params: URLSearchParams }) {
  const [week, setWeek] = useState(params.get('week') || 'current');
  const [kind, setKind] = useState<string>(params.get('kind') || 'series');
  const [weekday, setWeekday] = useState<number | null>(null);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [moreUrl, setMoreUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // 周摘要
  useEffect(() => {
    let alive = true;
    setErr('');
    api
      .calendarSummary(week)
      .then((s) => {
        if (!alive) return;
        setSummary(s);
        const today = iso(new Date());
        const hit = s.days.find((d) => d.date === today);
        const fallback = [...s.days].reverse().find((d) => (d.totals?.all ?? 0) > 0) ?? s.days[0];
        setWeekday(hit?.weekday ?? fallback?.weekday ?? 1);
      })
      .catch((e) => alive && setErr(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [week]);

  // 当日列表
  useEffect(() => {
    if (weekday == null) return;
    let alive = true;
    setLoading(true);
    setItems([]);
    setMoreUrl(null);
    setErr('');
    api
      .calendar({ week, kind, weekday, limit: 18 })
      .then((r) => {
        if (!alive) return;
        const g = r.days?.[0]?.groups?.[kind];
        setItems(g?.preview ?? []);
        setTotal(g?.total ?? 0);
        setMoreUrl(g?.more_url ?? null);
      })
      .catch((e) => alive && setErr(String(e.message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [week, kind, weekday]);

  const loadMore = useCallback(async () => {
    if (!moreUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.calendar({ moreUrl });
      const g = r.days?.[0]?.groups?.[kind];
      if (g?.preview?.length) {
        setItems((prev) => [...prev, ...g.preview]);
        setMoreUrl(g.more_url ?? null);
      } else {
        setMoreUrl(null);
      }
    } catch {
      setMoreUrl(null);
    } finally {
      setLoadingMore(false);
    }
  }, [moreUrl, loadingMore, kind]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 500) void loadMore();
  };

  const days = summary?.days ?? [];
  const weekStart = summary?.snapshot?.week_start_date ?? '';
  const rangeLabel = days.length ? `${fmtMD(days[0].date)} – ${fmtMD(days[days.length - 1].date)}` : '';
  const cats = useMemo(() => (summary?.categories ?? []).filter((c) => c.key !== 'all'), [summary]);
  const catLabel = cats.find((c) => c.key === kind)?.label ?? kindLabel(kind);

  const shiftWeek = (delta: number) => {
    const base = weekStart || iso(new Date());
    const d = new Date(`${base}T00:00:00`);
    d.setDate(d.getDate() + delta * 7);
    setWeek(iso(d));
    setWeekday(null);
  };

  const pickDate = (value: string) => {
    if (!value) return;
    setWeek(mondayOf(value));
    setWeekday(null);
  };

  return (
    <div className="site-shell">
      <WatchRail onExpand={() => {}} onHome={() => navigate('/')} active="home" />

      <div className="site-main">
        <SiteTopBar />

        <div className="site-scroll" ref={scrollRef} onScroll={onScroll}>
          <ChannelTabs active="updates" />

          <section className="section cal-section">
            <div className="cal-heading">
              <span className="cal-head-ico">▦</span>
              <span className="cal-range">{rangeLabel || '加载中…'}</span>
            </div>

            <div className="cal-controls">
              <button className="cal-nav" title="上一周" onClick={() => shiftWeek(-1)}>
                ‹
              </button>

              <button
                className="cal-weekbtn"
                title="选择某一周"
                onClick={() => dateRef.current?.showPicker?.()}
              >
                选周
              </button>

              <button
                className="cal-datewrap"
                onClick={() => dateRef.current?.showPicker?.()}
                title="选择日期"
              >
                <span className="cal-date-text">{(week === 'current' ? weekStart : week).replace(/-/g, '/')}</span>
                <span className="cal-date-ico">▦</span>
              </button>
              <input
                ref={dateRef}
                type="date"
                className="cal-date-input"
                value={week === 'current' ? weekStart : week}
                onChange={(e) => pickDate(e.target.value)}
              />

              <button className="cal-nav" title="下一周" onClick={() => shiftWeek(1)}>
                ›
              </button>
              <button
                className="cal-thisweek"
                onClick={() => {
                  setWeek('current');
                  setWeekday(null);
                }}
              >
                本周
              </button>
            </div>

            <p className="cal-hint">按常规更新周期展示，实际更新可能延迟。</p>

            {err ? <div className="error-box">加载失败：{err}</div> : null}

            <div className="cal-days">
              {days.map((d) => (
                <button
                  key={d.date}
                  className={`cal-day${d.weekday === weekday ? ' active' : ''}`}
                  onClick={() => setWeekday(d.weekday)}
                >
                  <span className="dow">{d.weekday_label}</span>
                  <span className="dnum">{dayNum(d.date)}日</span>
                  <span className="dcount">{d.totals?.[kind as keyof typeof d.totals] ?? 0}部</span>
                </button>
              ))}
            </div>

            <div className="cal-cats">
              {cats.map((c) => (
                <button
                  key={c.key}
                  className={`cal-cat${c.key === kind ? ' active' : ''}`}
                  onClick={() => setKind(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="cal-listhead">
              <span className="cal-count">
                {catLabel} {items.length} / {total} 部
              </span>
              <span className="cal-more">
                {loadingMore ? '加载中…' : moreUrl ? '可继续加载' : total > 0 ? '已全部加载' : ''}
              </span>
            </div>

            {loading ? (
              <div className="loading">加载中…</div>
            ) : (
              <div className="cal-grid">
                {items.map((it) => (
                  <button
                    key={it.id + (it.available_at ?? '')}
                    className="cal-card"
                    onClick={() => navigate(`/player/${it.variant_id || it.id}`)}
                  >
                    <div className="cal-poster">
                      {it.poster_url ? <img src={it.poster_url} alt={it.title} loading="lazy" /> : null}
                    </div>
                    <div className="cal-info">
                      <div className="cal-title" title={it.title}>
                        {it.title}
                      </div>
                      <div className="cal-meta">
                        {it.year ? `${it.year}　` : ''}
                        {kindLabel(it.content_kind)}
                      </div>
                      <div className="cal-row2">
                        {it.latest_episode_label ? <span className="cal-badge">{it.latest_episode_label}</span> : <span />}
                        <span className="cal-link">查看剧集 ›</span>
                      </div>
                      <div className="cal-foot">◷ {it.forecast?.label ?? '更新'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && !items.length ? <div className="loading">当天没有{catLabel}更新</div> : null}
          </section>
        </div>
      </div>

      <BottomTabs active="home" />
    </div>
  );
}
