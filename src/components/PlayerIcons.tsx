import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const IconPlay = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M7 4.6v14.8L19 12Z" fill="currentColor" />
  </svg>
);

export const IconPause = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <rect x="6" y="4.6" width="4" height="14.8" rx="1" fill="currentColor" />
    <rect x="14" y="4.6" width="4" height="14.8" rx="1" fill="currentColor" />
  </svg>
);

export const IconNext = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M5 5v14l10-7Z" fill="currentColor" />
    <rect x="16.6" y="5" width="2.4" height="14" rx="1" fill="currentColor" />
  </svg>
);

export const IconVolume = ({ level = 1, ...p }: P & { level?: number }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M4 9.2h3.2L12 5.3v13.4L7.2 14.8H4Z" fill="currentColor" />
    {level > 0 ? <path d="M15.2 9a4.3 4.3 0 0 1 0 6" {...stroke} /> : null}
    {level > 0.5 ? <path d="M17.7 6.6a7.6 7.6 0 0 1 0 10.8" {...stroke} /> : null}
    {level === 0 ? <path d="m15.6 9.6 4.4 4.4m0-4.4-4.4 4.4" {...stroke} /> : null}
  </svg>
);

export const IconDanmaku = ({ on, ...p }: P & { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <rect x="2.2" y="3.4" width="19.6" height="17.2" rx="2.8" {...stroke} />
    <text
      x="8.8"
      y="16.6"
      textAnchor="middle"
      fontSize="10"
      fontWeight="700"
      fill="currentColor"
      stroke="none"
      fontFamily="inherit"
    >
      弹
    </text>
    {on ? (
      <path d="m14.2 14.2 1.6 1.6 3.4-3.4" {...stroke} />
    ) : (
      <path d="m14.4 12 3.6 3.6m0-3.6-3.6 3.6" {...stroke} />
    )}
  </svg>
);

export const IconSliders = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M4 7h6m4 0h6M4 17h10m4 0h2" {...stroke} />
    <circle cx="12" cy="7" r="2.1" {...stroke} />
    <circle cx="16" cy="17" r="2.1" {...stroke} />
  </svg>
);

export const IconGear = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <circle cx="12" cy="12" r="3.1" {...stroke} />
    <path
      d="M19.2 9.9a7.6 7.6 0 0 0-1.2-2.2l.6-1.7a1 1 0 0 0-.5-1.2l-1.9-1.1a1 1 0 0 0-1.3.2l-1 1.3a7.4 7.4 0 0 0-2.6 0l-1-1.3a1 1 0 0 0-1.3-.2L7.1 4.8a1 1 0 0 0-.5 1.2l.6 1.7a7.6 7.6 0 0 0-1.2 2.2l-1.6.3a1 1 0 0 0-.8 1v2.2a1 1 0 0 0 .8 1l1.6.3a7.6 7.6 0 0 0 1.2 2.2l-.6 1.7a1 1 0 0 0 .5 1.2l1.9 1.1a1 1 0 0 0 1.3-.2l1-1.3a7.4 7.4 0 0 0 2.6 0l1 1.3a1 1 0 0 0 1.3.2l1.9-1.1a1 1 0 0 0 .5-1.2l-.6-1.7a7.6 7.6 0 0 0 1.2-2.2l1.6-.3a1 1 0 0 0 .8-1v-2.2a1 1 0 0 0-.8-1Z"
      {...stroke}
    />
  </svg>
);

export const IconPip = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.2" {...stroke} />
    <rect x="12" y="11.4" width="6.6" height="5.4" rx="1" fill="currentColor" />
  </svg>
);

export const IconWebFull = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <rect x="3" y="4.6" width="18" height="14.8" rx="2.2" {...stroke} />
    <path d="M9.2 14.8 14.8 9.2M10.4 9.2h4.4v4.4" {...stroke} />
  </svg>
);

export const IconFullscreen = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M4 9V5.6A1.6 1.6 0 0 1 5.6 4H9M15 4h3.4A1.6 1.6 0 0 1 20 5.6V9M20 15v3.4a1.6 1.6 0 0 1-1.6 1.6H15M9 20H5.6A1.6 1.6 0 0 1 4 18.4V15" {...stroke} />
  </svg>
);

export const IconSpeed = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <circle cx="12" cy="12" r="8.2" {...stroke} />
    <path d="M10.6 8.3v7.4L16 12Z" fill="currentColor" />
  </svg>
);

export const IconFit = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.2" {...stroke} />
    <path d="M8 12h8M8 12l2.2-2.2M8 12l2.2 2.2M16 12l-2.2-2.2M16 12l-2.2 2.2" {...stroke} />
  </svg>
);

export const IconSparkles = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="m12 3 2.4 6.2L20.6 12l-6.2 2.8L12 21l-2.4-6.2L3.4 12l6.2-2.8Z" {...stroke} />
    <path d="M19 2.4v3.4M17.3 4.1h3.4" {...stroke} />
  </svg>
);

export const IconP2P = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <circle cx="12" cy="5" r="2.6" {...stroke} />
    <circle cx="5" cy="18" r="2.6" {...stroke} />
    <circle cx="19" cy="18" r="2.6" {...stroke} />
    <path d="m10.6 7.3-4 8.1m6.8-8.1 4 8.1M7.6 18h8.8" {...stroke} />
  </svg>
);

export const IconConfig = (p: P) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" {...stroke} />
    <circle cx="9" cy="7" r="1.9" fill="currentColor" />
    <circle cx="15.5" cy="12" r="1.9" fill="currentColor" />
    <circle cx="8" cy="17" r="1.9" fill="currentColor" />
  </svg>
);

export const IconChevronRight = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" {...stroke} />
  </svg>
);

export const IconChevronLeft = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" {...stroke} />
  </svg>
);

export const IconClose = (p: P) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...p}>
    <path d="M18 6 6 18M6 6l12 12" {...stroke} />
  </svg>
);
