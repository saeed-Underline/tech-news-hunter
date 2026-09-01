import { SysWindow } from './SysWindow';
import { compactNumber } from '../lib/format';
import type { Article, NewsIndex, Rank } from '../types';

const RANK_ORDER: Rank[] = ['S', 'A', 'B', 'C', 'D', 'E'];

const RANK_VARS: Record<Rank, string> = {
  S: 'var(--rank-s)',
  A: 'var(--rank-a)',
  B: 'var(--rank-b)',
  C: 'var(--rank-c)',
  D: 'var(--rank-d)',
  E: 'var(--rank-e)',
};

/** A little flavour: the archive deepens, the hunter's title rises. */
function titleForLevel(level: number): string {
  if (level >= 90) return 'Shadow Monarch';
  if (level >= 46) return 'S-Rank Hunter';
  if (level >= 21) return 'Elite Hunter';
  if (level >= 7) return 'Hunter';
  return 'Awakened';
}

export function HunterStatus({
  index,
  articles,
}: {
  index: NewsIndex;
  articles: Article[];
}) {
  const level = Math.max(1, index.stats.daysTracked);
  const totalLogged = index.stats.articlesLive + index.stats.articlesArchived;

  const spread = RANK_ORDER.map((rank) => ({
    rank,
    count: articles.filter((a) => a.rank === rank).length,
  })).filter((entry) => entry.count > 0);

  // Progress toward the next daily cap — how full today's board is.
  const boardFill = index.retention.maxArticlesPerDay
    ? Math.min(100, (articles.length / index.retention.maxArticlesPerDay) * 100)
    : 0;

  return (
    <SysWindow title="Hunter Status" variant="violet" meta={`LV.${level}`}>
      <div className="hunter__level">
        <span className="hunter__level-num">{level}</span>
        <div>
          <div className="hunter__job">{titleForLevel(level)}</div>
          <div className="label" style={{ marginTop: 2 }}>
            {level === 1 ? '1 day logged' : `${level} days logged`}
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-row__head">
          <span className="label">Quests today</span>
          <span className="stat-row__value">
            {articles.length} / {index.retention.maxArticlesPerDay}
          </span>
        </div>
        <div className="bar">
          <span className="bar__fill bar__fill--violet" style={{ width: `${boardFill}%` }} />
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-row__head">
          <span className="label">Total logged</span>
          <span className="stat-row__value">{compactNumber(totalLogged)}</span>
        </div>
        <div className="bar">
          <span
            className="bar__fill"
            style={{ width: `${Math.min(100, (totalLogged / 2000) * 100)}%` }}
          />
        </div>
      </div>

      {spread.length > 0 && (
        <div className="stat-row">
          <span className="label">Rank spread</span>
          <div className="rank-spread">
            {spread.map(({ rank, count }) => (
              <span
                className="rank-spread__item"
                key={rank}
                style={{ color: RANK_VARS[rank] }}
              >
                {rank}
                <span className="rank-spread__count">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </SysWindow>
  );
}
