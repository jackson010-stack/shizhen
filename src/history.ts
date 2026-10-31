export interface HistoryEntry {
  id: string;
  title: string;
  poster?: string;
  ep: number;
  /** 展示用标签：剧集「第 3 集」/ 电影「正片」 */
  epLabel?: string;
  position: number;
  duration: number;
  updatedAt: number;
}

const KEY = 'aimovie:history';
const MAX = 12;

export function listHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => x && x.id) : [];
  } catch {
    return [];
  }
}

export function recordHistory(e: Omit<HistoryEntry, 'updatedAt'>) {
  if (!e.id || !e.title) return;
  try {
    const prev = listHistory().filter((x) => x.id !== e.id);
    const next = [{ ...e, updatedAt: Date.now() }, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 配额满或隐私模式，忽略 */
  }
}
