const TABS = [
  { key: 'home', label: '首页', ico: '⌂' },
  { key: 'share', label: '分享', ico: '➤' },
  { key: 'history', label: '历史', ico: '◷' },
  { key: 'list', label: '片单', ico: '☰' },
];

export default function BottomTabs({ active = 'home' }: { active?: string }) {
  return (
    <nav className="bottom-tabs">
      {TABS.map((t) => (
        <button key={t.key} className={`bottom-tab${active === t.key ? ' active' : ''}`}>
          <span className="ico">{t.ico}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
