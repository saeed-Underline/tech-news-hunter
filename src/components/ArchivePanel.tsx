import { useEffect, useState } from 'react';
import { RankBadge, SysWindow } from './SysWindow';
import { useArchive } from '../lib/useData';
import { formatBytes, monthLabel } from '../lib/format';
import type { NewsIndex } from '../types';

/**
 * The condensed tier. Older days survive here as their top quests only —
 * exactly what the retention sweep chose to keep.
 */
export function ArchivePanel({ index }: { index: NewsIndex }) {
  const [month, setMonth] = useState<string | null>(index.archives[0]?.month ?? null);
  const { data, error, loading } = useArchive(month);

  useEffect(() => {
    if (!month && index.archives[0]) setMonth(index.archives[0].month);
  }, [index.archives, month]);

  if (index.archives.length === 0) {
    return (
      <SysWindow title="Archive Vault">
        <div className="state">
          <div className="state__title">Vault empty</div>
          <p className="state__text">
            Nothing has aged out yet. Days are condensed into the vault once they pass{' '}
            {index.retention.dailyRetentionDays} days old.
          </p>
        </div>
      </SysWindow>
    );
  }

  const current = index.archives.find((a) => a.month === month);

  return (
    <SysWindow
      title="Archive Vault"
      variant="violet"
      meta={current ? `${current.count} kept · ${formatBytes(current.bytes)}` : undefined}
    >
      <div className="archive-months">
        {index.archives.map((archive) => (
          <button
            type="button"
            key={archive.month}
            className="sys-btn"
            aria-pressed={archive.month === month}
            onClick={() => setMonth(archive.month)}
          >
            {monthLabel(archive.month)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="state">
          <span className="spinner" />
        </div>
      )}

      {error && (
        <div className="state">
          <div className="state__title">Vault sealed</div>
          <p className="state__text">{error}</p>
        </div>
      )}

      {data && (
        <div className="archive-list">
          {data.articles.map((article) => (
            <a
              className="archive-row"
              key={`${article.date}-${article.id}`}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <RankBadge rank={article.rank} small />
              <span className="archive-row__date">{article.date.slice(5)}</span>
              <span className="archive-row__title">{article.title}</span>
              <span className="chip">{index.sources[article.sourceId]?.name ?? article.sourceId}</span>
            </a>
          ))}
        </div>
      )}
    </SysWindow>
  );
}
