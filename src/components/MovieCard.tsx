import { useState } from 'react';
import type { MovieCard as Card } from '../types';
import { navigate } from '../App';

export default function MovieCard({ m }: { m: Card }) {
  const [broken, setBroken] = useState(false);
  const meta = [m.year, kindLabel(m.content_kind), m.area].filter(Boolean).join(' · ');

  return (
    <article className="movie-card" onClick={() => navigate(`/player/${m.id}`)}>
      <div className="cover">
        {m.poster_url && !broken ? (
          <img src={m.poster_url} alt={m.title} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="fallback">{m.title}</div>
        )}
        {m.remarks ? <span className="badge">{m.remarks}</span> : null}
      </div>
      <h3 title={m.title}>{m.title}</h3>
      <p className="meta">{meta}</p>
      <p className="desc">{m.description || firstGenre(m.genres)}</p>
    </article>
  );
}

function firstGenre(g?: string | string[]) {
  if (!g) return '';
  return Array.isArray(g) ? (g[0] ?? '') : g.split('|')[0];
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
    case 'short_drama':
      return '短剧';
    default:
      return k;
  }
}
