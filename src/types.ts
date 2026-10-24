export interface MovieCard {
  id: string;
  title: string;
  normalized_title?: string;
  year?: number | string;
  content_kind?: string;
  area?: string;
  poster_url?: string;
  backdrop_url?: string;
  remarks?: string;
  description?: string;
  /** 列表接口给数组，详情接口给 `|` 分隔字符串，两种都要兼容 */
  genres?: string | string[];
  heat_value?: number;
  playback_count?: number;
  episode_count?: number;
}

export interface LineOption {
  id: string;
  provider_id: string;
  provider_name: string;
  play_from: string;
  source_vod_id: string;
  label: string;
  url: string;
  url_kind: 'm3u8' | 'resolve_ticket' | 'mp4' | 'unknown';
  resolved: boolean;
  resolve_mode: 'direct' | 'parse';
  resolve_required: boolean;
  preference_weight: number;
  token_scenario?: string;
  minimum_user_level?: number;
  selected?: boolean;
}

export interface EpisodeInfo {
  id: string;
  token: string;
  episode_number: number;
  display_name: string;
  episode_key?: string;
}

export interface EpisodeItem {
  id: string;
  number: number;
  title: string;
  token: string;
  episode_key?: string;
  episode_track?: string;
}

export interface CatalogDetail extends MovieCard {
  episode_count: number;
  available_episode_count: number;
  current_episode_count?: number;
  total_episode_count?: number;
  update_status?: string;
  episode_progress_text?: string;
  language?: string;
  episodes: EpisodeItem[];
}

export interface LinesResponse {
  episode: EpisodeInfo;
  episodeCount: number;
  lines: LineOption[];
}

export interface ResolvedLine {
  url: string;
  url_kind: string;
  headers?: Record<string, string>;
  userAgent?: string;
  provider_name?: string;
  play_from?: string;
  resolved_directly?: boolean;
}

export interface ManifestInfo {
  provider: string;
  play_from: string;
  url: string;
  url_kind: string;
  isMaster: boolean;
  mediaUrl: string;
  segments: string[];
  segmentCount: number;
  key: { method: string; uri: string; iv: string } | null;
  byteRange: { length: number; offset: number } | null;
}

export interface Suggestion {
  id: string;
  /** title = 片库命中，可直接跳播放页；action = 规则建议，提交为搜索词 */
  type: 'title' | 'action';
  intent?: string;
  label: string;
  subtitle?: string;
  prompt: string;
  /** cache / center = 片库，rule = 建议 */
  source?: string;
  score?: number;
  confidence?: number;
  target?: { variant_id: string; title: string; direct_playable?: boolean };
  action?: { type: string; prompt: string };
}

export type ChannelKey =
  | 'recommend'
  | 'updates'
  | 'series'
  | 'movie'
  | 'anime'
  | 'variety'
  | 'short_drama';

export const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: 'recommend', label: 'AI找剧' },
  { key: 'updates', label: '最近更新' },
  { key: 'series', label: '电视剧' },
  { key: 'movie', label: '电影' },
  { key: 'anime', label: '动漫' },
  { key: 'variety', label: '综艺' },
  { key: 'short_drama', label: '短剧' },
];

/** 目录频道（除 AI找剧 / 最近更新 外都能用 /v1/browse/catalog?kind= 过滤） */
export const CATALOG_KINDS: ChannelKey[] = ['series', 'movie', 'anime', 'variety', 'short_drama'];

export interface CatalogFilterOption {
  key: string;
  label: string;
  /** 选中后写入 URL 的参数；地区是 `{area:'中国大陆'}` 这种值与标签不同 */
  params: Record<string, string>;
  enabled: boolean;
}

export interface CatalogFilterRow {
  key: string;
  label: string;
  all_label: string;
  /** 切换本行选项前要删除的参数（年份会一次删 year/year_gte/year_lte） */
  clear_params: string[];
  selection_mode?: 'single' | 'multiple';
  options: CatalogFilterOption[];
}

export interface CatalogUiGroup {
  kind: ChannelKey;
  default_sort?: string;
  rows: CatalogFilterRow[];
}

export interface CatalogUi {
  version?: string;
  catalogs: CatalogUiGroup[];
}

export interface CalendarTotals {
  all: number;
  movie: number;
  series: number;
  anime: number;
  variety: number;
}

export interface CalendarItem {
  id: string;
  variant_id: string;
  title: string;
  year?: number;
  heat_score?: number;
  available_at?: string;
  content_kind?: string;
  poster_url?: string;
  season_label?: string | null;
  latest_episode_label?: string;
  forecast?: {
    kind: string;
    label: string;
    confidence?: string;
    target_date?: string;
    predicted?: boolean;
  };
}

export interface CalendarGroup {
  total: number;
  preview: CalendarItem[];
  more_url?: string;
}

export interface CalendarDay {
  date: string;
  weekday: number;
  weekday_label: string;
  totals?: CalendarTotals;
  groups?: Record<string, CalendarGroup>;
}

export interface CalendarSummary {
  object: string;
  title: string;
  snapshot: { week_start_date: string; status?: string; item_count?: number };
  categories: { key: string; label: string }[];
  days: CalendarDay[];
}

export interface CalendarList extends CalendarSummary {
  detail?: {
    kind: string;
    weekday: number;
    total: number;
    returned_count: number;
    has_more: boolean;
    next_cursor?: string;
  };
}
