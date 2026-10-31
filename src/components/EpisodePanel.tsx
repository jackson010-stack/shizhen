import { useEffect, useMemo, useRef, useState } from 'react';
import type { EpisodeItem } from '../types';

const RANGE = 48;

export default function EpisodePanel({
  episodes,
  current,
  onPick,
}: {
  episodes: EpisodeItem[];
  current: number;
  onPick: (n: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [rangeIdx, setRangeIdx] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  const ranges = useMemo(() => {
    if (!episodes.length) return [];
    const out: [number, number][] = [];
    for (let i = 0; i < episodes.length; i += RANGE) {
      out.push([i + 1, Math.min(i + RANGE, episodes.length)]);
    }
    return out;
  }, [episodes]);

  useEffect(() => {
    const idx = ranges.findIndex(([a, b]) => current >= a && current <= b);
    if (idx >= 0) setRangeIdx(idx);
  }, [current, ranges]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const [a, b] = ranges[rangeIdx] ?? [1, episodes.length];
      return episodes.filter((e) => e.number >= a && e.number <= b);
    }
    return episodes.filter((e) => String(e.number).includes(q) || e.title?.includes(q));
  }, [query, episodes, ranges, rangeIdx]);

  return (
    <div className="ep-panel">
      <input
        className="ep-search"
        value={query}
        placeholder="搜索集数，例如 24"
        onChange={(e) => setQuery(e.target.value)}
      />

      {!query && ranges.length > 1 && (
        <div className="ep-ranges">
          <button
            className="range-arrow"
            onClick={() => {
              setRangeIdx((i) => Math.max(0, i - 1));
              tabsRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
            }}
          >
            ‹
          </button>
          <div className="range-tabs" ref={tabsRef}>
            {ranges.map(([a, b], i) => (
              <button
                key={a}
                className={`range-tab${i === rangeIdx ? ' active' : ''}`}
                onClick={() => setRangeIdx(i)}
              >
                {a}-{b}
              </button>
            ))}
          </div>
          <button
            className="range-arrow"
            onClick={() => {
              setRangeIdx((i) => Math.min(ranges.length - 1, i + 1));
              tabsRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
            }}
          >
            ›
          </button>
        </div>
      )}

      <div className="ep-grid">
        {filtered.map((e) => (
          <button
            key={e.id}
            className={`ep-cell${e.number === current ? ' active' : ''}`}
            onClick={() => onPick(e.number)}
          >
            {episodes.length === 1 ? e.title || '正片' : e.number}
          </button>
        ))}
      </div>

      {!filtered.length ? <div className="ep-empty">没有匹配的集数</div> : null}
    </div>
  );
}
