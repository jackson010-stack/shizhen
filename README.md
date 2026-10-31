# 拾帧 · SHIZHEN

<p align="center">
  <img src="public/favicon.svg" width="88" alt="拾帧 logo">
</p>

一个**跑在本地浏览器里**的影视检索与播放客户端：自绘界面、直连 HLS 流、带 WebGL 实时画质增强。

> 纯个人自用 / 学习性质的前端工程，不托管、不分发任何视频内容。

---

## 它是什么

「拾帧」是给 `zhaoju2.ai` 做的一个本地客户端。原站的网页端把 API 锁在服务端（没有 CORS、`OPTIONS` 404、`X-Frame-Options: DENY`），
浏览器既不能直连 `/v1/*`，也不能用 iframe 套壳。这个工程用一个零依赖的 Node 代理补上这块，
前端则完全自己写：布局和信息架构对齐原站，配色与组件是自绘的，**不包含原站的 logo、品牌资产或 CSS**。

```
浏览器 (React + hls.js)  ──/api/*──▶  本地代理 :8787  ──▶  zhaoju2.ai /v1/*
        │
        └──────────── 媒体直连 CDN（自带 ACAO，hls.js 原生解密/分片）─────────────▶
```

代理只转发**元数据接口**，不碰视频流：所有 CDN 都返回 `Access-Control-Allow-Origin: *`，
`m3u8` / `enc.key` / `.ts` 由 hls.js 在浏览器里直接拉，代理零带宽压力。

## 功能

**检索**

- 首页：AI 找剧频道、最近更新、分类频道（电视剧 / 电影 / 动漫 / 综艺 / 短剧）
- 搜索：输入联想（片库结果 + 智能建议，支持 ↑/↓/Enter/Esc）
- 筛选：分类 / 地区 / 语言 / 年份 / 排序；宽屏内联、窄屏抽屉两套形态
- 追剧周表：按周查看每天各分类的更新量，游标分页

**播放**

- hls.js 播放，三种流保护都能过：AES-128 加密、主列表→变体、PNG 壳 + `EXT-X-BYTERANGE`
- 自定义控制条：进度条拖拽、倍速（0.5×–2×）、音量、网页全屏 / 全屏 / 画中画
- 选集面板：区间分页、集数搜索；换源面板：多线路切换
- 观看历史：本地 `localStorage`，首页「上次观看」续播
- 弹幕面板：开关 / 不透明度 / 字号 / 速度（**本地回声**，不连服务端）

**画质增强（WebGL2）**

四档预设，运行在独立的 WebGL2 画布上，着色器移植自 MIT 协议的
[redphx/better-xcloud](https://github.com/redphx/better-xcloud)：

| 档位 | 实现 | 说明 |
|---|---|---|
| 关闭 | 原始画面 | 默认 |
| 轻量 | CSS / SVG 滤镜 | 3×3 卷积锐化，几乎零开销 |
| 标准 | WebGL · USM | 反锐化掩模 + 轻微对比度/饱和度 |
| 增强 | WebGL · CAS | AMD FidelityFX 对比度自适应锐化（8-tap） |

画中画走 `canvas.captureStream()`，所以 PiP 里看到的也是增强后的画面。

## 快速开始

需要 Node.js 18+（用到原生 `fetch`、`getSetCookie`）。

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:5173 —— 代理和 Vite 会一起起来（`concurrently`）。

也可以分开跑：

```bash
npm run dev:proxy   # :8787
npm run dev:web     # :5173
```

生产构建：

```bash
npm run build       # tsc -b && vite build
npm run preview
```

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AIMOVIE_HOST` | `zhaoju2.ai` | 上游站点域名 |
| `AIMOVIE_SIGN_KEY` | 内置 | 请求签名密钥；内置值取自站点公开前端 bundle，可自行覆盖 |
| `PROXY_PORT` | `8787` | 本地代理端口（改了要同步改 `vite.config.ts` 的 proxy target） |

## 目录结构

```
├── server.mjs                 # 零依赖本地代理，只转发 /v1/*
├── server/
│   └── aimovie-client.mjs     # 上游 API 封装：签名、匿名会话、高层接口
├── src/
│   ├── api.ts                 # 前端 fetch 封装
│   ├── App.tsx                # 自实现的 hash 路由
│   ├── filters.ts             # 筛选参数编解码
│   ├── history.ts             # localStorage 观看历史
│   ├── pages/                 # 首页 / 浏览 / 更新 / 播放
│   ├── components/
│   │   ├── WatchStage.tsx     # 播放器舞台与控制条
│   │   ├── PlayerSettings.tsx # 设置菜单 / 统计弹窗
│   │   ├── videoEnhancer.ts   # WebGL2 画质增强渲染器
│   │   └── BrandLogo.tsx      # 品牌标识
│   └── styles.css
└── public/favicon.svg
```

## 技术要点

**路由**是自实现的 hash 路由（`#/`、`#/browse?kind=&q=`、`#/player/:id?ep=N`），
没有引入 react-router。

**签名**：上游要求 `x-ai-movie-timestamp` / `nonce` / `signature` 三个头，
对 `method + path + timestamp + nonce` 做 HMAC-SHA256。匿名会话 cookie 由代理内存持有，
进程重启即失效并自动重新领取。

**浏览筛选**用的是 `kind=` 而不是 `channel=`（后者会被上游静默丢弃）。
地区多选逗号拼接，改年份要先清 `year/year_gte/year_lte`。

**WebGL 增强的几个坑**（都已处理，改这块前值得先看一眼）：

1. `texImage2D(video)` 要求视频 origin-clean → 需要 `crossOrigin='anonymous'` 重新加载源；
2. 判断跨域污染必须用 `getImageData`——`drawImage` 画被污染的视频**不会**报错，只会污染画布；
3. `video.crossOrigin = ''` 清除不掉跨域状态（枚举属性 setter 拒绝非法值），要用 `removeAttribute('crossorigin')`；
4. WebGL uniform 默认是 0，首帧要先给中性值否则整屏黑；暂停时不会再有新帧回调，改参数后要主动重绘。

## 已知限制

- **P2P 共享加速未接入**：官方用 WebTorrent + 信令，本客户端直连 CDN，设置里明确标注"未接入"。
- **弹幕是本地回声**：输入后只在自己屏幕上飘过，没接服务端弹幕。
- **讨论 / 反馈 tab 置灰**：`/v1/threads` 对匿名会话返回 401。
- **浏览页没有翻页控件**：固定 24 条；原站是每页 18/36 条并带翻页。
- **画质增强不持久化**：刷新后回到"关闭"。
- WebGL 渲染会绕开浏览器的硬解合成路径，长时间播放的功耗/发热未实测。

## 免责声明

本项目仅用于个人学习与前端技术研究：

- 不存储、不缓存、不转发任何视频文件，媒体流由浏览器直接向上游 CDN 请求；
- 与 `zhaoju2.ai` 及其运营方无任何关联，不代表其立场；
- 请自行确认所在地区关于流媒体访问的法律与平台条款，由使用者自行承担使用后果；
- 如果相关权利方有异议，请提 issue，会立即移除相关内容。

界面为自绘，未使用原站 logo、品牌素材或样式文件。
