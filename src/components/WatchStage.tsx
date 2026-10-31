import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Hls from 'hls.js';
import {
  IconDanmaku,
  IconFullscreen,
  IconGear,
  IconNext,
  IconPause,
  IconPip,
  IconPlay,
  IconSliders,
  IconVolume,
  IconWebFull,
} from './PlayerIcons';
import {
  DanmakuPanel,
  MoreDialog,
  SettingsMenu,
  StatsDialog,
  type Fit,
  type StreamStats,
} from './PlayerSettings';
import {
  createEnhancer,
  enhanceLabel,
  isOriginClean,
  presetParams,
  type EnhancePresetId,
  type EnhancerHandle,
} from './videoEnhancer';

export interface PlayerDiag {
  engine: string;
  levels?: number;
  error?: string;
}

interface Danmaku {
  id: number;
  text: string;
  lane: number;
  dur: number;
}

function fmt(s: number) {
  if (!Number.isFinite(s)) return '00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export default function WatchStage({
  src,
  kind,
  quality,
  onDiag,
  onOpenEpisodes,
  onOpenLines,
  onNext,
  onProgress,
  enhance,
  onEnhance,
}: {
  src: string;
  kind?: string;
  quality: string;
  onDiag?: (d: PlayerDiag) => void;
  onOpenEpisodes: () => void;
  onOpenLines: () => void;
  onNext: () => void;
  onProgress?: (position: number, duration: number) => void;
  enhance: EnhancePresetId;
  onEnhance: (v: EnhancePresetId) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enhancerRef = useRef<EnhancerHandle | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number>();
  const settingsAnchor = useRef<HTMLDivElement>(null);
  const danmakuAnchor = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [diag, setDiag] = useState<PlayerDiag>({ engine: '-' });
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [danmakuOn, setDanmakuOn] = useState(true);
  const [dmInput, setDmInput] = useState('');
  const [danmakus, setDanmakus] = useState<Danmaku[]>([]);

  const [rate, setRate] = useState(1);
  const [fit, setFit] = useState<Fit>('contain');
  const [glReady, setGlReady] = useState(false);
  const [glError, setGlError] = useState('');
  const [corsMode, setCorsMode] = useState(false);
  const resumeRef = useRef(0);
  const corsTriedFor = useRef('');
  const [webFull, setWebFull] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dmPanelOpen, setDmPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<StreamStats>({
    mode: '直连 CDN',
    engine: '-',
    quality,
    resolution: '',
    buffer: 0,
  });

  const [dmOpacity, setDmOpacity] = useState(100);
  const [dmFontSize, setDmFontSize] = useState(17);
  const [dmSpeed, setDmSpeed] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const report = (d: PlayerDiag) => {
      setDiag(d);
      onDiag?.(d);
    };

    const resumeAt = resumeRef.current;
    const restore = () => {
      if (resumeAt > 0) {
        try {
          video.currentTime = resumeAt;
        } catch {
          /* 元数据尚未就绪 */
        }
        resumeRef.current = 0;
      }
    };

    // CORS 模式：该线路不支持跨域读取时退回普通模式
    // crossOrigin 属枚举属性，赋空串不会清除跨域状态，必须移除属性
    if (corsMode) video.crossOrigin = 'anonymous';
    else video.removeAttribute('crossorigin');
    const onError = () => {
      if (!corsMode) return;
      // 该地址在 CORS 模式下都取不到，标记后不再重复尝试
      corsTriedFor.current = src;
      resumeRef.current = resumeAt || video.currentTime;
      setCorsMode(false);
    };
    video.addEventListener('error', onError);

    const isM3u8 = kind === 'm3u8' || /\.m3u8(\?|$)/i.test(src);

    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        report({ engine: `hls.js ${Hls.version}`, levels: data.levels.length });
        restore();
        void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          report({
            engine: `hls.js ${Hls.version}`,
            error: `${data.type}/${data.details}${data.response?.code ? ` HTTP ${data.response.code}` : ''}`,
          });
        }
      });
      return () => {
        video.removeEventListener('error', onError);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (isM3u8 && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', restore, { once: true });
      void video.play().catch(() => {});
      report({ engine: 'native HLS' });
      return () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('loadedmetadata', restore);
      };
    }

    video.src = src;
    video.addEventListener('loadedmetadata', restore, { once: true });
    void video.play().catch(() => {});
    report({ engine: 'native mp4' });
    return () => {
      video.removeEventListener('error', onError);
      video.removeEventListener('loadedmetadata', restore);
    };
  }, [src, kind, onDiag, corsMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastReport = 0;
    const onTime = () => {
      setCurrent(video.currentTime);
      if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
      const now = Date.now();
      if (now - lastReport > 5000) {
        lastReport = now;
        onProgress?.(video.currentTime, video.duration);
      }
    };
    const onDur = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('progress', onTime);
    video.addEventListener('durationchange', onDur);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('progress', onTime);
      video.removeEventListener('durationchange', onDur);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
  }, [rate, src]);

  const glPreset = enhance === 'standard' || enhance === 'strong';

  useEffect(() => {
    if (!glPreset) {
      enhancerRef.current?.destroy();
      enhancerRef.current = null;
      setGlReady(false);
      return;
    }
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage) return;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      // 读取像素失败说明该地址没有 CORS 响应头，只能换 CORS 模式重载一次
      const fallbackToCors = () => {
        if (corsTriedFor.current !== src) {
          corsTriedFor.current = src;
          resumeRef.current = video.currentTime;
          setCorsMode(true);
        } else {
          setGlError('该线路不支持跨域读取，已回退原始画面');
          onEnhance('light');
        }
      };
      if (!isOriginClean(video)) {
        fallbackToCors();
        return;
      }
      let tainted = false;
      const handle = createEnhancer(video, stage, fit, presetParams(enhance), () => {
        tainted = true;
        fallbackToCors();
      });
      if (!handle) {
        if (tainted) return;
        setGlError('WebGL2 不可用');
        onEnhance('light');
        return;
      }
      enhancerRef.current = handle;
      handle.applyParams(presetParams(enhance));
      setGlReady(true);
      setGlError('');
    };

    if (video.readyState >= 2) start();
    else video.addEventListener('loadeddata', start, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', start);
      enhancerRef.current?.destroy();
      enhancerRef.current = null;
      // 画布随渲染器一起销毁，必须让原始画面重新露出来
      setGlReady(false);
    };
  }, [glPreset, corsMode, src, onEnhance]);

  useEffect(() => {
    enhancerRef.current?.applyParams(presetParams(enhance));
  }, [enhance]);

  useEffect(() => {
    enhancerRef.current?.setFit(fit);
  }, [fit]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!settingsAnchor.current?.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [settingsOpen]);

  useEffect(() => {
    if (!dmPanelOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!danmakuAnchor.current?.contains(e.target as Node)) setDmPanelOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dmPanelOpen]);

  useEffect(() => {
    if (!statsOpen) return;
    const read = () => {
      const video = videoRef.current;
      if (!video) return;
      const hls = hlsRef.current;
      const level = hls && hls.currentLevel >= 0 ? hls.levels[hls.currentLevel] : undefined;
      const buf = video.buffered.length
        ? Math.max(0, video.buffered.end(video.buffered.length - 1) - video.currentTime)
        : 0;
      const conn = (navigator as Navigator & { connection?: { downlink?: number } }).connection;
      const qualityOf = video.getVideoPlaybackQuality?.();
      setStats({
        mode: '直连 CDN',
        engine: diag.engine,
        quality,
        enhance: enhance === 'off' ? '关闭' : `${enhanceLabel(enhance)}（${
          enhance === 'light' ? 'CSS' : 'WebGL2'
        }）`,
        resolution: video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : '',
        buffer: buf,
        bitrate: level?.bitrate,
        bandwidth: hls?.bandwidthEstimate,
        downlink: conn?.downlink,
        dropped: qualityOf?.droppedVideoFrames,
      });
    };
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [statsOpen, diag.engine, quality, enhance]);

  useEffect(() => {
    if (!webFull) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWebFull(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [webFull]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (moreOpen) setMoreOpen(false);
      else if (statsOpen) setStatsOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (dmPanelOpen) setDmPanelOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen, statsOpen, settingsOpen, dmPanelOpen]);

  const poke = useCallback(() => {
    setShowControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current?.paused) return;
      // 面板/弹窗打开或正在输入弹幕时不自动收起控制栏
      if (document.querySelector('.watch-stage .ps-panel, .watch-stage .stage-modal')) return;
      if (document.activeElement?.closest('.danmaku-box')) return;
      setShowControls(false);
    }, 2800);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
    poke();
  }, [poke]);

  const seekTo = (ratio: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * v.duration;
    setCurrent(v.currentTime);
  };

  const seekAtClientX = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    seekTo((clientX - r.left) / r.width);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const togglePip = useCallback(async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }
    const canvas = enhancerRef.current?.canvas ?? null;
    if (glReady && canvas) {
      try {
        let pv = pipVideoRef.current;
        if (!pv) {
          pv = document.createElement('video');
          pv.muted = true;
          pv.playsInline = true;
          pv.style.cssText =
            'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
          document.body.appendChild(pv);
          pipVideoRef.current = pv;
        }
        pv.srcObject = canvas.captureStream(30);
        await pv.play();
        await (
          pv as HTMLVideoElement & { requestPictureInPicture: () => Promise<unknown> }
        ).requestPictureInPicture();
        return;
      } catch (e) {
        console.warn('[pip] canvas stream failed, fallback to raw video', e);
      }
    }
    const v = videoRef.current as
      | (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
      | null;
    if (!v) return;
    await v.requestPictureInPicture?.().catch(() => {});
  }, [glReady]);

  const toggleWebFull = () => {
    setWebFull((v) => !v);
    poke();
  };

  const sendDanmaku = () => {
    const text = dmInput.trim();
    if (!text) return;
    const id = Date.now();
    setDanmakus((d) => [
      ...d,
      { id, text, lane: Math.floor(Math.random() * 5), dur: 9 + Math.random() * 4 },
    ]);
    setDmInput('');
    window.setTimeout(() => setDanmakus((d) => d.filter((x) => x.id !== id)), 15000);
  };

  const resetPlayback = () => {
    setRate(1);
    setFit('contain');
    onEnhance('off');
  };

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={stageRef}
      className={`watch-stage${showControls ? ' show-controls' : ''}${webFull ? ' web-full' : ''}`}
      onMouseMove={poke}
      onMouseLeave={() => playing && !settingsOpen && !dmPanelOpen && setShowControls(false)}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        style={{
          objectFit: fit,
          opacity: glReady ? 0 : 1,
          filter:
            enhance === 'light'
              ? 'url(#stage-enhance) contrast(1.06) saturate(1.1) brightness(1.02)'
              : undefined,
        }}
      />

      {glError ? <div className="stage-notice">{glError}</div> : null}

      <svg className="enhance-defs" aria-hidden="true" focusable="false">
        <filter id="stage-enhance" x="0" y="0" width="100%" height="100%">
          <feConvolveMatrix
            order="3"
            preserveAlpha="true"
            kernelMatrix="0 -0.12 0 -0.12 1.48 -0.12 0 -0.12 0"
          />
        </filter>
      </svg>

      {danmakuOn && (
        <div
          className="danmaku-layer"
          style={
            {
              '--dm-opacity': dmOpacity / 100,
              '--dm-size': `${dmFontSize}px`,
            } as CSSProperties
          }
        >
          {danmakus.map((d) => (
            <span
              key={d.id}
              className="danmaku-item"
              style={{ top: `${7 + d.lane * 12}%`, animationDuration: `${d.dur / dmSpeed}s` }}
            >
              {d.text}
            </span>
          ))}
        </div>
      )}

      {!playing && duration > 0 && (
        <button className="stage-bigplay" onClick={togglePlay} aria-label="播放">
          ▶
        </button>
      )}

      <div className="stage-top-right">
        <button className="stage-chip" onClick={onOpenLines}>
          ⇄ 换源
        </button>
      </div>

      <div className="stage-bottom-left">
        <button className="stage-chip" onClick={onOpenEpisodes}>
          ☰ 选集
        </button>
      </div>

      <div className="stage-controls">
        <div
          className="progress"
          onPointerDown={(e) => {
            draggingRef.current = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* 合成事件没有活跃指针 */
            }
            seekAtClientX(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) seekAtClientX(e.clientX, e.currentTarget);
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            try {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            } catch {
              /* ignore */
            }
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        >
          <div className="progress-buffer" style={{ width: `${bufPct}%` }} />
          <div className="progress-fill" style={{ width: `${pct}%` }} />
          <div className="progress-thumb" style={{ left: `${pct}%` }} />
        </div>

        <div className="controls-row">
          <div className="bar-left">
            <button className="art-ctl" onClick={togglePlay} title={playing ? '暂停' : '播放'}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button className="art-ctl" onClick={onNext} title="下一集">
              <IconNext />
            </button>

            <div className="volume-wrap">
              <button className="art-ctl" onClick={toggleMute} title={muted ? '取消静音' : '静音'}>
                <IconVolume level={muted ? 0 : volume < 0.5 ? 0.5 : 1} />
              </button>
              <input
                className="volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
            </div>

            <span className="time">
              {fmt(current)} / {fmt(duration)}
            </span>
          </div>

          <div className="bar-center">
            <button
              className={`art-ctl dm-toggle${danmakuOn ? ' on' : ''}`}
              onClick={() => setDanmakuOn((v) => !v)}
              title={danmakuOn ? '关闭弹幕' : '开启弹幕'}
            >
              <IconDanmaku on={danmakuOn} />
            </button>

            <div className="dm-anchor" ref={danmakuAnchor}>
              <button
                className="art-ctl"
                title="弹幕设置"
                onClick={() => {
                  setDmPanelOpen((v) => !v);
                  setSettingsOpen(false);
                  poke();
                }}
              >
                <IconSliders />
              </button>
              {dmPanelOpen ? (
                <DanmakuPanel
                  on={danmakuOn}
                  opacity={dmOpacity}
                  fontSize={dmFontSize}
                  speed={dmSpeed}
                  onToggle={() => setDanmakuOn((v) => !v)}
                  onOpacity={setDmOpacity}
                  onFontSize={setDmFontSize}
                  onSpeed={setDmSpeed}
                />
              ) : null}
            </div>

            <div className="danmaku-box">
              <input
                value={dmInput}
                placeholder="发个友善的弹幕见证当下"
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendDanmaku()}
              />
              <button className="dm-send" onClick={sendDanmaku}>
                发送
              </button>
            </div>
          </div>

          <div className="bar-right">
            <button className="quality" onClick={onOpenLines} title="切换线路">
              {quality}
            </button>

            <div className="settings-anchor" ref={settingsAnchor}>
              <button
                className={`art-ctl${settingsOpen ? ' on' : ''}`}
                title="显示设置"
                onClick={() => {
                  setSettingsOpen((v) => !v);
                  setDmPanelOpen(false);
                  poke();
                }}
              >
                <IconGear />
              </button>
              {settingsOpen ? (
                <SettingsMenu
                  rate={rate}
                  fit={fit}
                  enhance={enhance}
                  onRate={setRate}
                  onFit={setFit}
                  onEnhance={onEnhance}
                  onMore={() => {
                    setSettingsOpen(false);
                    setMoreOpen(true);
                  }}
                  onStats={() => {
                    setSettingsOpen(false);
                    setStatsOpen(true);
                  }}
                />
              ) : null}
            </div>

            <button className="art-ctl" title="画中画" onClick={togglePip}>
              <IconPip />
            </button>
            <button
              className={`art-ctl${webFull ? ' on' : ''}`}
              title={webFull ? '退出网页全屏' : '网页全屏'}
              onClick={toggleWebFull}
            >
              <IconWebFull />
            </button>
            <button className="art-ctl" title="全屏" onClick={toggleFullscreen}>
              <IconFullscreen />
            </button>
          </div>
        </div>
      </div>

      {diag.error ? (
        <div className="player-status">
          <span>{diag.engine}</span>
          <span style={{ color: '#ff8a8a' }}>· {diag.error}</span>
        </div>
      ) : null}

      {moreOpen ? (
        <MoreDialog
          onEpisodes={onOpenEpisodes}
          onLines={onOpenLines}
          onPip={togglePip}
          onWebFull={toggleWebFull}
          onFullscreen={toggleFullscreen}
          onReset={resetPlayback}
          onClose={() => setMoreOpen(false)}
        />
      ) : null}

      {statsOpen ? <StatsDialog stats={stats} onClose={() => setStatsOpen(false)} /> : null}
    </div>
  );
}
