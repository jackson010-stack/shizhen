import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api';
import type { Suggestion } from '../types';
import { navigate } from '../App';

export default function SearchBox({ autoFocus }: { autoFocus?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number>();

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      const mode = term.trim() ? 'thread' : 'home';
      const r = await api.suggest(term.trim(), mode, 10);
      setItems(r.items);
      setActive(-1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (open) void load(q);
    }, 180);
    return () => window.clearTimeout(timer.current);
  }, [q, open, load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = (term: string) => {
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/browse?q=${encodeURIComponent(term.trim())}`);
  };

  const pick = (s: Suggestion) => {
    setOpen(false);
    inputRef.current?.blur();
    if (s.type === 'title' && s.target?.variant_id) {
      navigate(`/player/${s.target.variant_id}`);
      return;
    }
    submit(s.action?.prompt || s.prompt || s.label);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + items.length) % items.length);
      return;
    }
    if (e.key === 'Enter') {
      if (active >= 0 && items[active]) pick(items[active]);
      else if (q.trim()) submit(q);
    }
  };

  return (
    <div className="search-pill" ref={wrapRef}>
      <button className="search-mode">综合 · 快速 ⌄</button>
      <input
        ref={inputRef}
        value={q}
        placeholder="搜片名，或描述剧情"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      <button className="search-mic" disabled title="语音搜索（未接入）">
        ◉
      </button>
      <button className="search-go" title="搜索" onClick={() => q.trim() && submit(q)}>
        ⌕
      </button>

      {open && (items.length > 0 || loading) ? (
        <div className="suggest-panel">
          {items.map((s, i) => (
            <button
              key={s.id}
              className={`suggest-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <span className="suggest-label">{s.label}</span>
              <span className={`suggest-tag${s.source === 'rule' ? ' advice' : ''}`}>
                {s.source === 'rule' ? '建议' : '片库'}
              </span>
            </button>
          ))}
          {!items.length && loading ? <div className="suggest-empty">搜索中…</div> : null}
        </div>
      ) : null}
    </div>
  );
}
