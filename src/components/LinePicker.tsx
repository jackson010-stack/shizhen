import type { LineOption, ManifestInfo } from '../types';

export default function LinePicker({
  lines,
  currentId,
  diag,
  busy,
  onPick,
  onDiagnose,
  onClose,
}: {
  lines: LineOption[];
  currentId?: string;
  diag?: ManifestInfo | null;
  busy?: boolean;
  onPick: (l: LineOption) => void;
  onDiagnose: (l: LineOption) => void;
  onClose: () => void;
}) {
  return (
    <div className="line-sheet" onClick={onClose}>
      <div className="line-sheet-inner" onClick={(e) => e.stopPropagation()}>
        <div className="line-sheet-head">
          <h2>切换播放线路</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {lines.map((l) => (
          <button
            key={l.id}
            className={`line-row${l.id === currentId ? ' current' : ''}`}
            onClick={() => onPick(l)}
            disabled={busy}
          >
            <span className="name">{l.provider_name}</span>
            <span className="tags">
              {l.token_scenario === 'movie_official' ? <span className="tag official">官方</span> : null}
              {l.token_scenario === 'series_intro_zero' ? <span className="tag official">预告</span> : null}
              {l.resolve_required ? (
                <span className="tag ticket">需换票</span>
              ) : (
                <span className="tag">直链</span>
              )}
              {l.minimum_user_level ? <span className="tag">Lv{l.minimum_user_level}</span> : null}
            </span>
            <span
              className="tag"
              role="button"
              tabIndex={0}
              title="探测清单与首分片"
              onClick={(e) => {
                e.stopPropagation();
                onDiagnose(l);
              }}
            >
              检测
            </span>
          </button>
        ))}

        {diag ? (
          <div className="diag">
            {`provider   : ${diag.provider} (${diag.play_from})
url_kind   : ${diag.url_kind}
master     : ${diag.isMaster ? '是（已展开变体）' : '否'}
segments   : ${diag.segmentCount}
encryption : ${diag.key ? `${diag.key.method}` : '无'}
byteRange  : ${diag.byteRange ? `len=${diag.byteRange.length} @${diag.byteRange.offset}` : '无'}
mediaUrl   : ${diag.mediaUrl}
first seg  : ${diag.segments[0] ?? '-'}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
