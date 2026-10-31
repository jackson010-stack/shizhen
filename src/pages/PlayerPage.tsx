import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import WatchRail from '../components/WatchRail';
import WatchStage from '../components/WatchStage';
import EpisodePanel from '../components/EpisodePanel';
import LinePicker from '../components/LinePicker';
import { api } from '../api';
import { recordHistory } from '../history';
import type { EnhancePresetId } from '../components/videoEnhancer';
import type { CatalogDetail, LineOption, ManifestInfo, ResolvedLine } from '../types';
import { navigate } from '../App';

type SideTab = 'episodes' | 'discuss' | 'feedback';

export default function PlayerPage({ id, initialEp }: { id: string; initialEp: number }) {
  const [ep, setEp] = useState(initialEp);
  const [info, setInfo] = useState<CatalogDetail | null>(null);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [current, setCurrent] = useState<LineOption | null>(null);
  const [resolved, setResolved] = useState<ResolvedLine | null>(null);
  const [diag, setDiag] = useState<ManifestInfo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sideOpen, setSideOpen] = useState(true);
  const [sideTab, setSideTab] = useState<SideTab>('episodes');
  const [topQuery, setTopQuery] = useState('');
  const [enhance, setEnhance] = useState<EnhancePresetId>('off');
  const progressRef = useRef({ position: 0, duration: 0 });

  useEffect(() => {
    api.detail(id).then(setInfo).catch(() => {});
  }, [id]);

  const onProgress = useCallback((position: number, duration: number) => {
    progressRef.current = { position, duration };
  }, []);

  useEffect(() => {
    if (!info) return;
    const save = () => {
      const { position, duration } = progressRef.current;
      recordHistory({
        id,
        title: info.title,
        poster: info.poster_url,
        ep,
        epLabel: (info.episodes?.length ?? 0) <= 1 ? '正片' : `第 ${ep} 集`,
        position,
        duration,
      });
    };
    save();
    const timer = window.setInterval(save, 8000);
    return () => {
      window.clearInterval(timer);
      save();
    };
  }, [info, ep, id]);

  const choose = useCallback(async (line: LineOption) => {
    setBusy(true);
    setErr('');
    setCurrent(line);
    setDiag(null);
    setPickerOpen(false);
    try {
      const r = await api.resolve(line);
      setResolved(r);
    } catch (e) {
      setErr(String((e as Error).message || e));
      setResolved(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const diagnose = useCallback(async (line: LineOption) => {
    setBusy(true);
    setErr('');
    try {
      setDiag(await api.manifest(line));
    } catch (e) {
      setErr(String((e as Error).message || e));
      setDiag(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setErr('');
    setResolved(null);
    api
      .lines(id, ep)
      .then((r) => {
        if (!alive) return;
        setLines(r.lines);
        const pick = r.lines.find((l) => l.selected) ?? r.lines[0];
        if (pick) void choose(pick);
      })
      .catch((e) => alive && setErr(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [id, ep, choose]);

  const episodes = info?.episodes ?? [];
  const total = episodes.length || 1;

  const meta = useMemo(() => {
    if (!info) return '';
    const remarks = (info.remarks || '').split(' / ')[0];
    return [kindLabel(info.content_kind), info.year, info.area, info.language, remarks]
      .filter(Boolean)
      .join(' · ');
  }, [info]);

  const heat = useMemo(() => {
    const h = info?.heat_value;
    if (!h) return '';
    return h >= 100 ? String(Math.round(h)) : String(h);
  }, [info]);

  const goEp = (n: number) => {
    if (n < 1 || n > total) return;
    setEp(n);
    navigate(`/player/${id}?ep=${n}`);
  };

  const submitTopSearch = () => {
    if (!topQuery.trim()) return;
    navigate(`/browse?q=${encodeURIComponent(topQuery.trim())}`);
  };

  return (
    <div className="watch-shell">
      <header className="watch-topbar">
        <div className="watch-topbar-left">
          <button className="ctl-ghost" title="展开侧栏" onClick={() => setSideOpen((v) => !v)}>
            ☰
          </button>
          <button className="ctl-ghost" title="返回" onClick={() => navigate('/')}>
            ←
          </button>
        </div>

        <div className="watch-brand">
          <BrandLogo size={26} />
          <div>
            <div className="watch-brand-name">
              拾<em>帧</em>
            </div>
            <div className="watch-brand-sub">SHIZHEN</div>
          </div>
        </div>

        <div className="watch-topbar-right">
          <div className="watch-search">
            <span className="watch-search-ico">⌕</span>
            <input
              value={topQuery}
              placeholder="搜索剧名"
              onChange={(e) => setTopQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTopSearch()}
            />
          </div>
          <button className="ctl-ghost" title="片单">
            ☰
          </button>
        </div>
      </header>

      <div className={`watch-body${sideOpen ? '' : ' side-closed'}`}>
        <WatchRail onExpand={() => setSideOpen(true)} onHome={() => navigate('/')} />

        <main className="watch-main">
          {resolved?.url ? (
            <WatchStage
              src={resolved.url}
              kind={resolved.url_kind}
              quality={current?.provider_name ?? ''}
              onOpenEpisodes={() => {
                setSideTab('episodes');
                setSideOpen(true);
              }}
              onOpenLines={() => setPickerOpen(true)}
              onNext={() => goEp(ep + 1)}
              onProgress={onProgress}
              enhance={enhance}
              onEnhance={setEnhance}
            />
          ) : (
            <div className="watch-stage">
              <div className="loading">{busy ? '正在换取播放地址…' : '选择一条线路开始播放'}</div>
            </div>
          )}

          {err ? <div className="error-box">播放失败：{err}</div> : null}

          <div className="watch-under">
            <div className="under-title">
              {info?.title ?? '加载中'}
              <span className="under-dot">·</span>
              <span className="under-sub">
                第 {ep} 集 / 共 {total} 集
              </span>
            </div>
            <div className="under-actions">
              <button className="under-btn" onClick={() => setPickerOpen(true)}>
                ⇄ 换源（{lines.length}）
              </button>
              <button
                className="under-btn"
                onClick={() => current && diagnose(current)}
                disabled={!current || busy}
              >
                ⚙ 检测当前线路
              </button>
            </div>
          </div>

          {diag ? (
            <div className="diag watch-diag">
              {`${diag.provider} · ${diag.play_from}　master=${diag.isMaster ? 'Y' : 'n'}　segs=${diag.segmentCount}　key=${diag.key?.method ?? '-'}　range=${diag.byteRange ? `@${diag.byteRange.offset}` : '-'}
${diag.mediaUrl}`}
            </div>
          ) : null}
        </main>

        {sideOpen ? (
          <aside className="watch-side">
            <div className="side-tabs">
              <button
                className={`side-tab${sideTab === 'episodes' ? ' active' : ''}`}
                onClick={() => setSideTab('episodes')}
              >
                选集
              </button>
              <button className="side-tab" disabled title="未接入">
                讨论
              </button>
              <button className="side-tab" disabled title="未接入">
                反馈
              </button>
            </div>

            <h1 className="side-title" onClick={() => navigate('/')} title={info?.title}>
              {info?.title ?? '加载中'}
              <span className="side-chevron">›</span>
            </h1>

            <p className="side-meta">{meta}</p>

            {heat ? (
              <p className="side-heat">
                <span className="heat-flame">♨</span> {heat}
              </p>
            ) : null}

            {info?.description ? (
              <p className="side-desc">
                <span className="desc-label">简介：</span>
                {info.description}
              </p>
            ) : null}

            <div className="side-actions-inline">
              <button className="side-act" title="片单">
                <span className="ico">☰</span>片单
              </button>
              <button className="side-act" title="分享">
                <span className="ico">➤</span>分享
              </button>
              <button className="side-act" onClick={() => setPickerOpen(true)}>
                <span className="ico">⇄</span>换源
              </button>
              <button className="side-act" onClick={() => current && diagnose(current)}>
                <span className="ico">⚙</span>设置
              </button>
            </div>

            <div className="level-inline">
              <span className="level-badge">线路</span>
              <span className="level-name">{current?.provider_name ?? '—'}</span>
              <span className="level-meta">
                {current ? (current.resolve_required ? '需换票' : '直链') : ''}
                {current ? ` · ${current.play_from}` : ''}
              </span>
            </div>

            <EpisodePanel episodes={episodes} current={ep} onPick={goEp} />
          </aside>
        ) : null}
      </div>

      {pickerOpen ? (
        <LinePicker
          lines={lines}
          currentId={current?.id}
          diag={diag}
          busy={busy}
          onPick={choose}
          onDiagnose={diagnose}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
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
    case 'short':
      return '短剧';
    default:
      return k ?? '';
  }
}
