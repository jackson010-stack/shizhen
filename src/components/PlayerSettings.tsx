import { useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconConfig,
  IconFit,
  IconP2P,
  IconSparkles,
  IconSpeed,
} from './PlayerIcons';
import { ENHANCE_PRESETS, enhanceLabel, type EnhancePresetId, type Fit } from './videoEnhancer';

export type { Fit };

export const RATE_OPTIONS = [
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.8' },
  { value: 1, label: '正常' },
  { value: 1.25, label: '1.3' },
  { value: 1.5, label: '1.5' },
  { value: 2, label: '2.0' },
];

export const FIT_OPTIONS: { value: Fit; label: string }[] = [
  { value: 'contain', label: '默认' },
  { value: 'cover', label: '铺满' },
  { value: 'fill', label: '拉伸' },
];

export function rateLabel(rate: number) {
  return RATE_OPTIONS.find((o) => o.value === rate)?.label ?? `${rate}x`;
}

export function fitLabel(fit: Fit) {
  return FIT_OPTIONS.find((o) => o.value === fit)?.label ?? '默认';
}

interface SettingsProps {
  rate: number;
  fit: Fit;
  enhance: EnhancePresetId;
  onRate: (v: number) => void;
  onFit: (v: Fit) => void;
  onEnhance: (v: EnhancePresetId) => void;
  onMore: () => void;
  onStats: () => void;
}

export function SettingsMenu({
  rate,
  fit,
  enhance,
  onRate,
  onFit,
  onEnhance,
  onMore,
  onStats,
}: SettingsProps) {
  const [page, setPage] = useState<'root' | 'speed' | 'fit' | 'enhance'>('root');

  if (page === 'speed') {
    return (
      <div className="ps-panel ps-narrow" onClick={(e) => e.stopPropagation()}>
        <button className="ps-item ps-back" onClick={() => setPage('root')}>
          <IconChevronLeft />
          <span className="ps-label">播放速度</span>
          <span className="ps-tip">{rateLabel(rate)}</span>
        </button>
        {RATE_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`ps-item ps-choice${o.value === rate ? ' current' : ''}`}
            onClick={() => {
              onRate(o.value);
              setPage('root');
            }}
          >
            <span className="ps-label">{o.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (page === 'fit') {
    return (
      <div className="ps-panel ps-narrow" onClick={(e) => e.stopPropagation()}>
        <button className="ps-item ps-back" onClick={() => setPage('root')}>
          <IconChevronLeft />
          <span className="ps-label">画面填充</span>
          <span className="ps-tip">{fitLabel(fit)}</span>
        </button>
        {FIT_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`ps-item ps-choice${o.value === fit ? ' current' : ''}`}
            onClick={() => {
              onFit(o.value);
              setPage('root');
            }}
          >
            <span className="ps-label">{o.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (page === 'enhance') {
    return (
      <div className="ps-panel ps-narrow" onClick={(e) => e.stopPropagation()}>
        <button className="ps-item ps-back" onClick={() => setPage('root')}>
          <IconChevronLeft />
          <span className="ps-label">画质增强</span>
          <span className="ps-tip">{enhanceLabel(enhance)}</span>
        </button>
        {ENHANCE_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`ps-item ps-choice${p.id === enhance ? ' current' : ''}`}
            onClick={() => {
              onEnhance(p.id);
              setPage('root');
            }}
          >
            <span className="ps-label">{p.label}</span>
            <span className="ps-tip">{p.hint}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="ps-panel" onClick={(e) => e.stopPropagation()}>
      <button className="ps-item" onClick={() => setPage('speed')}>
        <span className="ps-icon">
          <IconSpeed />
        </span>
        <span className="ps-label">播放速度</span>
        <span className="ps-tip">{rateLabel(rate)}</span>
        <span className="ps-arrow">
          <IconChevronRight />
        </span>
      </button>

      <button className="ps-item" onClick={() => setPage('fit')}>
        <span className="ps-icon">
          <IconFit />
        </span>
        <span className="ps-label">画面填充</span>
        <span className="ps-tip">{fitLabel(fit)}</span>
        <span className="ps-arrow">
          <IconChevronRight />
        </span>
      </button>

      <button className="ps-item" onClick={() => setPage('enhance')}>
        <span className="ps-icon">
          <IconSparkles />
        </span>
        <span className="ps-label">画质增强</span>
        <span className="ps-tip">{enhanceLabel(enhance)}</span>
        <span className="ps-arrow">
          <IconChevronRight />
        </span>
      </button>

      <div
        className="ps-item ps-disabled"
        title="当前为直连 CDN，未接入官方 P2P 网络"
        aria-disabled="true"
      >
        <span className="ps-icon">
          <IconP2P />
        </span>
        <span className="ps-label">P2P 共享加速</span>
        <span className="ps-tip">未接入</span>
        <span className="ps-switch" />
      </div>

      <button className="ps-item" onClick={onMore}>
        <span className="ps-icon">
          <IconConfig />
        </span>
        <span className="ps-label">更多设置</span>
        <span className="ps-tip" />
      </button>

      <button className="ps-item" onClick={onStats}>
        <span className="ps-icon">
          <IconConfig />
        </span>
        <span className="ps-label">P2P 统计</span>
        <span className="ps-tip" />
      </button>
    </div>
  );
}

interface DanmakuProps {
  on: boolean;
  opacity: number;
  fontSize: number;
  speed: number;
  onToggle: () => void;
  onOpacity: (v: number) => void;
  onFontSize: (v: number) => void;
  onSpeed: (v: number) => void;
}

export function DanmakuPanel({
  on,
  opacity,
  fontSize,
  speed,
  onToggle,
  onOpacity,
  onFontSize,
  onSpeed,
}: DanmakuProps) {
  return (
    <div className="ps-panel ps-danmaku" onClick={(e) => e.stopPropagation()}>
      <button className="ps-item" onClick={onToggle}>
        <span className="ps-label">显示弹幕</span>
        <span className="ps-tip">仅本机</span>
        <span className={`ps-switch${on ? ' on' : ''}`} />
      </button>

      <label className="ps-range">
        <span className="ps-range-head">
          不透明度 <em>{opacity}%</em>
        </span>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
        />
      </label>

      <label className="ps-range">
        <span className="ps-range-head">
          弹幕字号 <em>{fontSize}px</em>
        </span>
        <input
          type="range"
          min={14}
          max={26}
          step={1}
          value={fontSize}
          onChange={(e) => onFontSize(Number(e.target.value))}
        />
      </label>

      <label className="ps-range">
        <span className="ps-range-head">
          弹幕速度 <em>{speed < 0.85 ? '极慢' : speed > 1.15 ? '极快' : '适中'}</em>
        </span>
        <input
          type="range"
          min={0.6}
          max={1.4}
          step={0.1}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

export interface StreamStats {
  mode: string;
  engine: string;
  quality: string;
  resolution: string;
  buffer: number;
  enhance?: string;
  bitrate?: number;
  bandwidth?: number;
  downlink?: number;
  dropped?: number;
}

export function StatsDialog({ stats, onClose }: { stats: StreamStats; onClose: () => void }) {
  const rows: [string, string][] = [
    ['连接方式', '直连 CDN（未启用 P2P）'],
    ['播放内核', stats.engine],
    ['当前线路', stats.quality || '—'],
    ['画质增强', stats.enhance || '关闭'],
    ['视频分辨率', stats.resolution || '—'],
    ['已缓冲', `${stats.buffer.toFixed(1)} 秒`],
    ['码率', stats.bitrate ? `${(stats.bitrate / 1_000_000).toFixed(2)} Mbps` : '—'],
    ['带宽估算', stats.bandwidth ? `${(stats.bandwidth / 1_000_000).toFixed(2)} Mbps` : '—'],
    ['网络下行', stats.downlink ? `${stats.downlink} Mbps` : '—'],
    ['掉帧', stats.dropped == null ? '—' : String(stats.dropped)],
  ];
  return (
    <div className="stage-modal-mask" onClick={onClose}>
      <div className="stage-modal ps-stats" role="dialog" aria-label="P2P 统计" onClick={(e) => e.stopPropagation()}>
        <header className="stage-modal-head">
          <h3>P2P 统计</h3>
          <button className="stage-modal-close" onClick={onClose} aria-label="关闭">
            <IconClose />
          </button>
        </header>
        <dl className="ps-stat-list">
          {rows.map(([k, v]) => (
            <div key={k} className="ps-stat-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="ps-note">
          本客户端未接入官方 P2P 网络，视频分片直接从媒体 CDN 下载，因此没有节点/分享率数据。
        </p>
      </div>
    </div>
  );
}

interface MoreProps {
  onEpisodes: () => void;
  onLines: () => void;
  onPip: () => void;
  onWebFull: () => void;
  onFullscreen: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function MoreDialog({
  onEpisodes,
  onLines,
  onPip,
  onWebFull,
  onFullscreen,
  onReset,
  onClose,
}: MoreProps) {
  const actions: { label: string; hint: string; run: () => void }[] = [
    { label: '选集', hint: '切换剧集', run: onEpisodes },
    { label: '换源', hint: '切换播放线路', run: onLines },
    { label: '画中画', hint: '悬浮小窗', run: onPip },
    { label: '网页全屏', hint: '铺满浏览器', run: onWebFull },
    { label: '全屏', hint: '进入系统全屏', run: onFullscreen },
    { label: '重置播放设置', hint: '速度 / 填充 / 增强', run: onReset },
  ];

  return (
    <div className="stage-modal-mask" onClick={onClose}>
      <div className="stage-modal" role="dialog" aria-label="更多设置" onClick={(e) => e.stopPropagation()}>
        <header className="stage-modal-head">
          <h3>更多设置</h3>
          <button className="stage-modal-close" onClick={onClose} aria-label="关闭">
            <IconClose />
          </button>
        </header>
        <div className="stage-modal-grid">
          {actions.map((a) => (
            <button
              key={a.label}
              className="stage-modal-action"
              onClick={() => {
                a.run();
                onClose();
              }}
            >
              <strong>{a.label}</strong>
              <span>{a.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
