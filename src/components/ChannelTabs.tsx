import { CHANNELS, type ChannelKey } from '../types';
import { navigate } from '../App';

export function channelPath(k: ChannelKey) {
  if (k === 'recommend') return '/';
  if (k === 'updates') return '/updates';
  return `/browse?kind=${k}`;
}

export default function ChannelTabs({
  active,
  onChange,
}: {
  active: ChannelKey;
  onChange?: (k: ChannelKey) => void;
}) {
  return (
    <nav className="channel-tabs">
      {CHANNELS.map((c) => (
        <button
          key={c.key}
          className={`channel-tab${active === c.key ? ' active' : ''}`}
          onClick={() => {
            onChange?.(c.key);
            navigate(channelPath(c.key));
          }}
        >
          {c.label}
        </button>
      ))}
    </nav>
  );
}
