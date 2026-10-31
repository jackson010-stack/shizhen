import type { CatalogFilterOption, CatalogFilterRow } from './types';

/**
 * 与原站 `product-catalog-filter` 一致的参数语义：
 * - 普通行是单选：先删 clear_params，再写入选项 params；
 * - 地区是多选：area 用逗号拼接，按选项值（中国大陆/中国香港…）切换；
 * - 年份一次清理 year / year_gte / year_lte，选项可能写两个参数。
 */
function isAreaRow(row: CatalogFilterRow) {
  return (
    row.selection_mode === 'multiple' &&
    row.clear_params.length === 1 &&
    row.clear_params[0] === 'area'
  );
}

function areaValues(params: URLSearchParams) {
  return (params.get('area') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isRowFiltered(params: URLSearchParams, row: CatalogFilterRow) {
  if (!row.clear_params.length) return false;
  if (isAreaRow(row)) return areaValues(params).length > 0;
  return row.clear_params.some((k) => (params.get(k) || '') !== '');
}

export function isOptionActive(
  params: URLSearchParams,
  row: CatalogFilterRow,
  opt: CatalogFilterOption,
) {
  if (!opt.enabled) return false;
  if (isAreaRow(row) && opt.params.area) return areaValues(params).includes(opt.params.area);
  return Object.entries(opt.params).every(([k, v]) => params.get(k) === v);
}

/** opt 传 null 表示点「全部xx」；返回新的参数副本，并清掉分页。 */
export function applyFilterOption(
  params: URLSearchParams,
  row: CatalogFilterRow,
  opt: CatalogFilterOption | null,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (opt && !opt.enabled) return next;

  for (const k of row.clear_params) next.delete(k);
  if (row.clear_params.includes('area')) {
    next.delete('areas');
    next.delete('area_group');
  }

  if (isAreaRow(row) && opt?.params.area) {
    const value = opt.params.area;
    const current = areaValues(params);
    const merged = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (merged.length) next.set('area', merged.join(','));
  } else if (opt) {
    for (const [k, v] of Object.entries(opt.params)) if (v) next.set(k, v);
  }

  next.delete('page');
  return next;
}
