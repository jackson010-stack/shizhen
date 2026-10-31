export default function BrandLogo({ size = 46 }: { size?: number }) {
  return (
    <span
      className="brand-logo"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48">
        <rect
          x="16"
          y="11"
          width="19"
          height="15"
          rx="2.6"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          opacity=".4"
        />
        <rect x="12" y="17" width="19" height="15" rx="2.6" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M19.2 21.8v5.4l4.6-2.7z" fill="#fff" />
      </svg>
    </span>
  );
}
