const ITEMS = [
  { key: 'home', label: '首页', ico: '⌂' },
  { key: 'share', label: '分享', ico: '➤' },
  { key: 'history', label: '历史', ico: '◷' },
  { key: 'list', label: '片单', ico: '☰' },
];

export default function WatchRail({
  onExpand,
  onHome,
  active = 'home',
}: {
  onExpand: () => void;
  onHome: () => void;
  active?: string;
}) {
  return (
    <nav className="watch-rail">
      <button className="rail-expand" onClick={onExpand} title="展开侧栏">
        ☰
        <span className="rail-tip">展开侧栏</span>
      </button>

      <div className="rail-group">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            className={`rail-item${it.key === active ? ' active' : ''}`}
            onClick={it.key === 'home' ? onHome : undefined}
            title={it.label}
          >
            <span className="rail-ico">{it.ico}</span>
            <span className="rail-label">{it.label}</span>
          </button>
        ))}
      </div>

      <div className="rail-spacer" />

      <button className="rail-item" title="我的">
        <span className="rail-ico">☺</span>
        <span className="rail-label">我的</span>
      </button>
    </nav>
  );
}
