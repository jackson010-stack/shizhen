/**
 * 本地 API 代理。zhaoju2.ai 关闭了 CORS（无 ACAO、OPTIONS 404），
 * 浏览器无法直连 /v1/*；签名与匿名会话 cookie 也必须在服务端维护。
 * 本代理只转发 /v1/* 元数据接口，不转发视频流 —— 媒体 CDN 自带 ACAO:*，
 * 由浏览器里的 hls.js 直连。
 */
import http from 'node:http';
import {
  openSession,
  search,
  home,
  detail,
  lines,
  resolve,
  manifest,
  suggest,
  catalogUi,
  watchCalendarSummary,
  watchCalendar,
  currentCookies,
} from './server/aimovie-client.mjs';

const PORT = Number(process.env.PROXY_PORT || 8787);

let sessionReady = null;
function ensureSession() {
  if (!sessionReady) sessionReady = openSession().then(() => true);
  return sessionReady;
}

let uiCache = null;
let uiCachedAt = 0;
const UI_TTL_MS = 5 * 60 * 1000;
async function ensureCatalogUi() {
  if (uiCache && Date.now() - uiCachedAt < UI_TTL_MS) return uiCache;
  uiCache = await catalogUi();
  uiCachedAt = Date.now();
  return uiCache;
}

function readBody(req) {
  return new Promise((res, rej) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        res(data ? JSON.parse(data) : {});
      } catch (e) {
        rej(e);
      }
    });
    req.on('error', rej);
  });
}

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;

  try {
    await ensureSession();

    if (p === '/api/health') {
      return send(res, 200, { ok: true, cookies: Object.keys(currentCookies()) });
    }

    if (p === '/api/search') {
      const filters = {};
      for (const [k, v] of u.searchParams) {
        if (k !== 'q' && k !== 'page' && k !== 'limit') filters[k] = v;
      }
      const r = await search(u.searchParams.get('q') || '', {
        page: Number(u.searchParams.get('page') || 1),
        limit: Number(u.searchParams.get('limit') || 24),
        filters,
      });
      return send(res, 200, r);
    }

    if (p === '/api/home') {
      const cards = await home();
      return send(res, 200, { cards });
    }

    if (p === '/api/suggest') {
      const q = u.searchParams.get('q') || '';
      const mode = u.searchParams.get('mode') || (q ? 'thread' : 'home');
      const publicHome = mode === 'home' && !q;
      const items = await suggest(q, {
        limit: Number(u.searchParams.get('limit') || 10),
        mode,
        scope: publicHome ? 'public' : undefined,
      });
      return send(res, 200, { items });
    }

    if (p === '/api/catalog-ui') {
      return send(res, 200, await ensureCatalogUi());
    }

    if (p === '/api/calendar/summary') {
      const week = u.searchParams.get('week') || 'current';
      return send(res, 200, await watchCalendarSummary(week));
    }

    if (p === '/api/calendar') {
      const moreUrl = u.searchParams.get('more');
      const weekday = u.searchParams.get('weekday');
      return send(
        res,
        200,
        await watchCalendar({
          moreUrl,
          week: u.searchParams.get('week') || 'current',
          kind: u.searchParams.get('kind') || 'series',
          weekday: weekday == null ? undefined : Number(weekday),
          sort: u.searchParams.get('sort') || 'heat',
          limit: Number(u.searchParams.get('limit') || 20),
        }),
      );
    }

    if (p.startsWith('/api/detail/')) {
      const id = decodeURIComponent(p.slice('/api/detail/'.length));
      return send(res, 200, await detail(id));
    }

    if (p.startsWith('/api/lines/')) {
      const id = decodeURIComponent(p.slice('/api/lines/'.length));
      const ep = Number(u.searchParams.get('ep') || 1);
      return send(res, 200, await lines(id, ep));
    }

    if (p === '/api/resolve' && req.method === 'POST') {
      const { line } = await readBody(req);
      return send(res, 200, await resolve(line));
    }

    if (p === '/api/manifest' && req.method === 'POST') {
      const { line } = await readBody(req);
      const mf = await manifest(line, { timeout: 25000 });
      return send(res, 200, { ...mf, segments: mf.segments.slice(0, 10) });
    }

    return send(res, 404, { error: `no route ${p}` });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] http://127.0.0.1:${PORT}  →  zhaoju2.ai /v1/*`);
});
