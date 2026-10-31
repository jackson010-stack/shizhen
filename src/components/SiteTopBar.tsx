import BrandLogo from './BrandLogo';
import SearchBox from './SearchBox';
import { navigate } from '../App';

export default function SiteTopBar() {
  return (
    <header className="site-topbar">
      <div className="site-brand" onClick={() => navigate('/')}>
        <BrandLogo />
        <div className="site-brand-text">
          <div className="site-brand-name">
            拾<em>帧</em>
          </div>
          <div className="site-brand-sub">SHIZHEN</div>
        </div>
      </div>

      <div className="site-search-wrap">
        <SearchBox />
      </div>

      <div className="site-top-actions">
        <button className="icon-btn" title="历史">
          ◷
        </button>
        <button className="icon-btn" title="我的">
          ☺
        </button>
      </div>
    </header>
  );
}
