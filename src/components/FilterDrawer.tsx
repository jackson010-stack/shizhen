import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogFilterOption, CatalogFilterRow, CatalogUiGroup } from '../types';
import { isOptionActive, isRowFiltered } from '../filters';

interface Props {
  group: CatalogUiGroup | null;
  params: URLSearchParams;
  loading?: boolean;
  error?: string;
  anchor: { top: number; left: number };
  onApply: (row: CatalogFilterRow, opt: CatalogFilterOption | null) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function FilterDrawer({
  group,
  params,
  loading,
  error,
  anchor,
  onApply,
  onReset,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const scroller = document.querySelector<HTMLElement>('.site-scroll');
    const prevOverflow = scroller?.style.overflowY;
    if (scroller) scroller.style.overflowY = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (scroller) scroller.style.overflowY = prevOverflow || '';
    };
  }, [onClose]);

  const rows = group?.rows.filter((r) => r.key !== 'sort') ?? [];

  return createPortal(
    <div className="filter-overlay" onMouseDown={onClose}>
      <div
        className="filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="筛选"
        style={{ top: anchor.top, left: anchor.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="filter-head">
          <h2>筛选</h2>
          <button className="filter-close" aria-label="关闭筛选" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="filter-panel" ref={panelRef} tabIndex={-1}>
          {error ? <div className="filter-note">筛选项加载失败：{error}</div> : null}
          {!error && loading && !rows.length ? <div className="filter-note">加载中…</div> : null}
          {rows.map((row) => {
            const allActive = !isRowFiltered(params, row);
            return (
              <div className="filter-row" role="group" aria-label={row.label} key={row.key}>
                <button
                  className="filter-all"
                  aria-pressed={allActive}
                  onClick={() => onApply(row, null)}
                >
                  {row.all_label}
                </button>
                <div className="filter-values">
                  {row.options.map((opt) => (
                    <button
                      key={opt.key}
                      className="filter-opt"
                      aria-pressed={isOptionActive(params, row, opt)}
                      aria-disabled={!opt.enabled}
                      disabled={!opt.enabled}
                      title={opt.enabled ? undefined : '当前片库接口暂不支持此筛选'}
                      onClick={() => onApply(row, opt)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="filter-foot">
          <button className="filter-reset" onClick={onReset}>
            重置
          </button>
          <button className="filter-done" onClick={onClose}>
            完成
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
