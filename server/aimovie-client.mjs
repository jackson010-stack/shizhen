import { createHmac, randomBytes, randomUUID, createDecipheriv } from 'node:crypto';

const HOST = process.env.AIMOVIE_HOST || 'zhaoju2.ai';
const ORIGIN = `https://${HOST}`;

// 站点前端 bundle 里硬编码的静态签名密钥（movie-card-runtime chunk）。
// 浏览器端用法：importKey("raw", utf8(KEY)) → HMAC-SHA256 → hex
// 可用 AIMOVIE_SIGN_KEY 覆盖。
const SIGN_KEY =
  process.env.AIMOVIE_SIGN_KEY ||
  '8f18c8e472a9fefbab7108f5c447f69b48a4b5d34f662ed83163167fc10fb3b8';

const CLIENT_HEADERS = {
  'x-ai-movie-client-name': 'movie-search-frontend',
  'x-ai-movie-client-version': '1.0.0',
  'x-ai-movie-build-version':
    '20261021T204524Z-98df10a3f414-98df10a3f414-98df10a3f414',
  'x-ai-movie-protocol-version': '2026-07-05.library-v2.playback-v1',
};

const jar = new Map();

// 服务端会为同名 cookie 连发多条 Set-Cookie（先清 Path/Domain 变体，再发真值），
// 只有全部清完才应删除；真值存在时以它为准。
function absorbCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const cleared = new Set();
  let real = null;
  for (const line of raw) {
    const [pair] = line.split(';');
    const i = pair.indexOf('=');
    if (i < 0) continue;
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (value === '' || /expires=Thu, 01 Jan 1970/i.test(line)) cleared.add(name);
    else real = { name, value };
  }
  for (const name of cleared) {
    if (!real || real.name !== name) jar.delete(name);
  }
  if (real) jar.set(real.name, real.value);
}

function cookieHeader() {
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}

function sign(method, url) {
  const u = new URL(url, ORIGIN);
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const canonical = `${method.toUpperCase()}\n${u.pathname}${u.search}\n${timestamp}\n${nonce}`;
  const signature = createHmac('sha256', Buffer.from(SIGN_KEY, 'utf8'))
    .update(canonical, 'utf8')
    .digest('hex');
  return {
    'x-ai-movie-timestamp': timestamp,
    'x-ai-movie-nonce': nonce,
    'x-ai-movie-signature': signature,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(path, { method = 'GET', body, headers = {}, raw = false, retries = 4 } = {}) {
  const url = path.startsWith('http') ? path : `${ORIGIN}${path}`;
  let res;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      res = await once(url, method, body, headers);
      break;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw err;
      await sleep(400 * 2 ** attempt);
    }
  }
  absorbCookies(res);

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (raw) return { status: res.status, headers: res.headers, text, json };
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

async function once(url, method, body, headers) {
  const out = new Headers({ Accept: 'application/json', ...CLIENT_HEADERS, ...headers });
  for (const [k, v] of Object.entries(sign(method, url))) out.set(k, v);
  if (body !== undefined && typeof body !== 'string') out.set('Content-Type', 'application/json');
  const ck = cookieHeader();
  if (ck) out.set('Cookie', ck);

  return fetch(url, {
    method,
    headers: out,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
}

export async function openSession() {
  const anonymousId = randomUUID();
  const res = await api('/v1/users/anonymous', {
    method: 'POST',
    body: { anonymous_id: anonymousId },
    headers: { 'x-ai-movie-client-name': 'movie-search-frontend' },
    raw: true,
  });
  return { anonymousId, status: res.status, cookies: [...jar.keys()], payload: res.json };
}

export function currentCookies() {
  return Object.fromEntries(jar);
}

/* ---------- 高层 API ---------- */

export async function search(q, { page = 1, limit = 20, kind, filters = {} } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) params.set('q', q);
  if (kind) params.set('kind', kind);
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') params.set(k, String(v));
  }
  const res = await api(`/v1/browse/catalog?${params}`);
  return {
    items: res.cards ?? [],
    pagination: res.pagination ?? {},
    sourceStatuses: res.source_statuses ?? [],
  };
}

export async function home({ sections = 3, cards = 10 } = {}) {
  const res = await api(
    `/v1/feed/home?scope=public&mode=preview&sections=${sections}&cards=${cards}`,
  );
  return res.sections?.flatMap((s) => s.cards ?? []) ?? [];
}

/**
 * 搜索联想。空输入 + mode=home + scope=public 时返回公共热门建议。
 * 每项含 type(title|action)、source(cache|center|rule)、label、target.variant_id、action.prompt。
 */
export async function suggest(q, { limit = 10, mode = 'thread', scope } = {}) {
  const params = new URLSearchParams({ q: q ?? '', limit: String(limit), mode });
  if (scope) params.set('scope', scope);
  const res = await api(`/v1/suggest?${params}`);
  return res.suggestions ?? [];
}

/** 片库筛选树（分类/地区/语言/年份/排序），来自运行时 bootstrap。 */
export async function catalogUi() {
  const res = await api('/v1/runtime/bootstrap');
  return res.catalog_ui ?? { catalogs: [] };
}

/** 追剧周表：周内每天各分类的更新数量。week 传 'current' 或 'YYYY-MM-DD'。 */
export async function watchCalendarSummary(week = 'current') {
  return api(`/v1/watch-calendar/summary?week=${encodeURIComponent(week)}`);
}

/**
 * 追剧周表列表。按天 + 分类分组，游标分页。
 * 翻页时直接把上一页 `days[0].groups[kind].more_url` 传进 moreUrl。
 */
export async function watchCalendar({
  week = 'current',
  kind = 'series',
  weekday,
  sort = 'heat',
  limit = 20,
  moreUrl,
} = {}) {
  if (moreUrl) return api(moreUrl);
  const params = new URLSearchParams({
    view: 'weekly',
    week,
    kind,
    sort,
    limit: String(limit),
  });
  if (weekday != null) params.set('weekday', String(weekday));
  return api(`/v1/watch-calendar?${params}`);
}

export async function detail(catalogId) {
  return api(`/v1/catalog/${encodeURIComponent(catalogId)}`);
}

export async function episodePage(catalogId, { offset = 0, limit = 48 } = {}) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const res = await api(`/v1/catalog/${encodeURIComponent(catalogId)}/episodes?${params}`);
  return {
    episodes: res.episodes ?? [],
    pagination: res.episode_pagination ?? {},
  };
}

export async function episodes(catalogId) {
  return (await episodePage(catalogId)).episodes;
}

/** 取某集的线路目录，每条带播放地址或 resolve:// 票据 */
export async function lines(catalogId, episodeIndex = 1) {
  const limit = 48;
  const offset = Math.floor((episodeIndex - 1) / limit) * limit;
  const page = await episodePage(catalogId, { offset, limit });
  const ep =
    page.episodes.find((e) => e.number === episodeIndex) ?? page.episodes[episodeIndex - 1 - offset];
  if (!ep) throw new Error(`没有第 ${episodeIndex} 集`);
  const res = await api(`/v1/playback/resolve/${encodeURIComponent(ep.token)}`);
  return {
    episode: res.current_episode,
    episodeCount: page.pagination.total_count ?? page.episodes.length,
    lines: res.line_options ?? [],
  };
}

/**
 * 换取可播放地址。
 * line.url_kind === 'm3u8' → 地址已是直链，直接用；
 * line.url_kind === 'resolve_ticket' → 用票据向 /v1/playback/resolve-line 换真实地址。
 */
export async function resolve(line) {
  if (line.resolve_required === false || line.url_kind === 'm3u8') {
    return {
      url: line.url,
      url_kind: line.url_kind,
      headers: line.headers ?? {},
      userAgent: line.userAgent,
      provider_name: line.provider_name,
      play_from: line.play_from,
      resolved_directly: true,
    };
  }
  const ticket = String(line.url ?? '').startsWith('resolve://')
    ? line.url.slice('resolve://'.length).trim()
    : line.url;
  const res = await api('/v1/playback/resolve-line?view=compact', {
    method: 'POST',
    body: { ticket },
  });
  return { ...(res.line ?? {}), resolved_directly: false };
}

/**
 * 把一条线路展开成可直接喂给播放器的清单。
 * 处理主播放列表 → 变体播放列表、相对路径、EXT-X-KEY、EXT-X-BYTERANGE。
 */
export async function manifest(line, { timeout = 30000 } = {}) {
  const resolved = await resolve(line);
  if (!resolved?.url) throw new Error('未拿到播放地址');
  const headers = { ...(resolved.headers ?? {}) };
  if (resolved.userAgent) headers['User-Agent'] = resolved.userAgent;

  const get = async (url) => {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
    if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 90)}`);
    return res.text();
  };

  const masterText = await get(resolved.url);
  const isMaster = /#EXT-X-STREAM-INF/.test(masterText);

  let mediaUrl = resolved.url;
  let mediaText = masterText;
  if (isMaster) {
    const variant = masterText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#'));
    if (!variant) throw new Error('主播放列表没有变体');
    mediaUrl = new URL(variant, resolved.url).href;
    mediaText = await get(mediaUrl);
  }

  const keyTag = mediaText.match(/#EXT-X-KEY:METHOD=([^,]+),URI="([^"]+)"(?:,IV=(0x[0-9a-fA-F]+))?/);
  const rangeTag = mediaText.match(/#EXT-X-BYTERANGE:(\d+)@(\d+)/);

  const segments = mediaText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => new URL(l, mediaUrl).href);

  return {
    provider: resolved.provider_name ?? line.provider_name,
    play_from: resolved.play_from ?? line.play_from,
    url: resolved.url,
    url_kind: resolved.url_kind,
    isMaster,
    mediaUrl,
    segments,
    segmentCount: segments.length,
    key: keyTag
      ? {
          method: keyTag[1],
          uri: new URL(keyTag[2], mediaUrl).href,
          iv: keyTag[3] ?? '0x00000000000000000000000000000000',
        }
      : null,
    byteRange: rangeTag ? { length: Number(rangeTag[1]), offset: Number(rangeTag[2]) } : null,
    headers,
    userAgent: resolved.userAgent,
  };
}

/** 探测一条线路是否真的能拉到流 */
export async function probe(line) {
  let mf;
  try {
    mf = await manifest(line);
  } catch (err) {
    return { ok: false, reason: err.message };
  }
  const out = {
    ok: mf.segmentCount > 0,
    kind: mf.url_kind,
    isMaster: mf.isMaster,
    encrypted: mf.key?.method ?? null,
    byteRange: mf.byteRange ? `@${mf.byteRange.offset}` : null,
    segments: mf.segmentCount,
    url: mf.url,
    headers: mf.headers,
    userAgent: mf.userAgent,
  };
  if (!out.ok) {
    out.reason = '清单里没有分片';
    return out;
  }
  try {
    const res = await fetch(mf.segments[0], {
      headers: mf.headers,
      signal: AbortSignal.timeout(30000),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    out.firstSegment = {
      status: res.status,
      bytes: buf.length,
      encrypted: !!mf.key,
      tsSync: buf[0] === 0x47,
    };
    if (mf.key) {
      const keyRes = await fetch(mf.key.uri, {
        headers: mf.headers,
        signal: AbortSignal.timeout(20000),
      });
      const key = Buffer.from(await keyRes.arrayBuffer());
      out.keyBytes = key.length;
      const iv = Buffer.from(mf.key.iv.replace(/^0x/, ''), 'hex');
      const dec = createDecipheriv('aes-128-cbc', key, iv);
      const plain = Buffer.concat([dec.update(buf), dec.final()]);
      let sync = 0;
      const packets = Math.floor(plain.length / 188);
      for (let i = 0; i < packets * 188; i += 188) if (plain[i] === 0x47) sync++;
      out.firstSegment.tsSync = plain[0] === 0x47;
      out.firstSegment.tsSyncRatio = packets ? `${sync}/${packets}` : 'n/a';
    }
  } catch (err) {
    out.ok = false;
    out.reason = `分片拉取失败: ${err.message}`;
  }
  return out;
}

export { ORIGIN, HOST };

