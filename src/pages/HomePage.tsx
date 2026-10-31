import { useEffect, useRef, useState } from 'react';
import WatchRail from '../components/WatchRail';
import SiteTopBar from '../components/SiteTopBar';
import ChannelTabs from '../components/ChannelTabs';
import MovieCard from '../components/MovieCard';
import BottomTabs from '../components/BottomTabs';
import { api } from '../api';
import { listHistory, type HistoryEntry } from '../history';
import type { ChannelKey, MovieCard as Card } from '../types';
import { navigate } from '../App';

const SUGGEST = ['嫁金钗', '玉簟秋', '小城良方', 'AI漫剧', '现在就出发 第4季', '美人余'];

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s <= 0) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function HomePage() {
  const [channel, setChannel] = useState<ChannelKey>('recommend');
  const [hot, setHot] = useState<Card[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [err, setErr] = useState('');
  const histRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(listHistory());
    api
      .home()
      .then((r) => setHot(r.cards.slice(0, 12)))
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <div className="site-shell">
      <WatchRail onExpand={() => {}} onHome={() => navigate('/')} active="home" />

      <div className="site-main">
        <SiteTopBar />

        <div className="site-scroll">
          <ChannelTabs active={channel} onChange={setChannel} />

          <section className="section">
            <div className="section-head">
              <span className="section-title">上次观看</span>
              <div className="hist-nav">
                <button
                  className="hist-arrow"
                  title="向左"
                  onClick={() => histRef.current?.scrollBy({ left: -520, behavior: 'smooth' })}
                >
                  ‹
                </button>
                <button
                  className="hist-arrow"
                  title="向右"
                  onClick={() => histRef.current?.scrollBy({ left: 520, behavior: 'smooth' })}
                >
                  ›
                </button>
                <span className="section-link">查看更多</span>
              </div>
            </div>

            {history.length ? (
              <div className="history-row" ref={histRef}>
                {history.map((h) => {
                  const pct = h.duration ? Math.min(100, (h.position / h.duration) * 100) : 0;
                  return (
                    <button
                      key={h.id}
                      className="history-card"
                      onClick={() => navigate(`/player/${h.id}?ep=${h.ep}`)}
                    >
                      <div className="history-thumb">
                        {h.poster ? <img src={h.poster} alt={h.title} loading="lazy" /> : null}
                        <div className="history-progress">
                          <i style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="history-title">{h.title}</div>
                      <div className="history-sub">
                        {h.position > 0 ? <span className="hist-time">{fmtTime(h.position)}</span> : null}
                        <span>{h.epLabel || `第 ${h.ep} 集`} · 上次看到</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-card">还没有观看记录，开始观看后会显示在这里。</div>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <span className="section-title">推荐搜索</span>
              <button className="icon-btn" title="换一批" onClick={() => navigate('/browse?sort=hot')}>
                ⟳
              </button>
            </div>
            <div className="suggest-grid">
              {SUGGEST.map((s) => (
                <button
                  key={s}
                  className="suggest-row"
                  onClick={() => navigate(`/browse?q=${encodeURIComponent(s)}`)}
                >
                  <span className="play-ico">▷</span>
                  <span className="title">{s}</span>
                  <span className="action">播放</span>
                </button>
              ))}
            </div>
          </section>

          {err ? <div className="error-box">加载推荐失败：{err}</div> : null}

          {hot.length ? (
            <section className="section">
              <div className="section-head">
                <span className="section-title">热门推荐</span>
                <span className="section-link" onClick={() => navigate('/browse?sort=hot')}>
                  查看更多
                </span>
              </div>
              <div className="card-grid" style={{ padding: 0 }}>
                {hot.map((m) => (
                  <MovieCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <BottomTabs active="home" />
    </div>
  );
}
