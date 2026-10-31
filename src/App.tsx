import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import UpdatesPage from './pages/UpdatesPage';
import PlayerPage from './pages/PlayerPage';

export interface Route {
  name: 'home' | 'browse' | 'updates' | 'player';
  params: URLSearchParams;
  id?: string;
}

function parseHash(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const params = new URLSearchParams(queryPart || '');
  const seg = pathPart.split('/').filter(Boolean);
  if (seg[0] === 'player' && seg[1]) return { name: 'player', params, id: seg[1] };
  if (seg[0] === 'updates') return { name: 'updates', params };
  if (seg[0] === 'browse') return { name: 'browse', params };
  return { name: 'home', params };
}

export function navigate(to: string) {
  location.hash = to;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (route.name === 'player' && route.id) {
    return <PlayerPage id={route.id} initialEp={Number(route.params.get('ep') || 1)} />;
  }
  if (route.name === 'updates') {
    return <UpdatesPage params={route.params} />;
  }
  if (route.name === 'browse') {
    return <BrowsePage params={route.params} />;
  }
  return <HomePage />;
}
