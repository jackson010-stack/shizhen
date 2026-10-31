import { useState } from 'react';
import type { CatalogFilterOption, CatalogFilterRow } from '../types';
import { isOptionActive, isRowFiltered } from '../filters';

interface Props {
  rows: CatalogFilterRow[];
  params: URLSearchParams;
  onApply: (row: CatalogFilterRow, opt: CatalogFilterOption | null) => void;
}

export default function CatalogFilters({ rows, params, onApply }: Props) {
  const [notice, setNotice] = useState('');
  const sortKey = params.get('sort') || 'heat_desc';

  return (
    <section className="cf-panel" aria-label="影片筛选">
      {rows.map((row) => {
        const isSort = row.key === 'sort';
        const allActive = !isRowFiltered(params, row);

        return (
          <div className="cf-row" role="group" aria-label={row.label} key={row.key}>
            {isSort ? (
              <span className="cf-label">排序</span>
            ) : (
              <button
                className="cf-all"
                aria-pressed={allActive}
                onClick={() => {
                  setNotice('');
                  onApply(row, null);
                }}
              >
                {row.all_label}
              </button>
            )}

            <div className="cf-values">
              {row.options.map((opt) => (
                <button
                  key={opt.key}
                  className="cf-opt"
                  aria-pressed={
                    isSort ? opt.params.sort === sortKey : isOptionActive(params, row, opt)
                  }
                  aria-disabled={!opt.enabled}
                  title={opt.enabled ? undefined : '该筛选暂未开放'}
                  onClick={() => {
                    if (!opt.enabled) {
                      setNotice(`${opt.label}：该筛选暂未开放`);
                      return;
                    }
                    setNotice('');
                    onApply(row, opt);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {notice ? (
        <p className="cf-notice" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
