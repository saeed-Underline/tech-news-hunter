import { RankBadge } from './SysWindow';
import { compactNumber, timeAgo } from '../lib/format';
import type { Article } from '../types';

export function QuestCard({ article, index }: { article: Article; index: number }) {
  return (
    <article
      className="quest"
      data-rank={article.rank}
      // Stagger only the first screenful; later cards appear immediately.
      style={{ ['--delay' as string]: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="quest__rank-col">
        <RankBadge rank={article.rank} />
        {article.commentsUrl ? (
          <a
            className="quest__comments"
            href={article.commentsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {compactNumber(article.comments)} 💬
          </a>
        ) : null}
      </div>

      <div className="quest__body">
        <a className="quest__title" href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>

        {article.summary ? <p className="quest__summary">{article.summary}</p> : null}

        <div className="quest__meta">
          <span className="quest__source">{article.sourceName}</span>
          <span className="quest__dot">/</span>
          <span className="quest__stat">{article.host}</span>
          <span className="quest__dot">/</span>
          <span className="quest__stat">{timeAgo(article.publishedAt)}</span>

          {article.points > 0 ? (
            <>
              <span className="quest__dot">/</span>
              <span className="quest__stat">▲ {compactNumber(article.points)}</span>
            </>
          ) : null}

          {article.topics.map((topic) => (
            <span className="chip chip--topic" key={topic}>
              {topic}
            </span>
          ))}
        </div>

        <div className="quest__power">
          <span className="label">Power</span>
          <div
            className="bar"
            role="meter"
            aria-valuenow={article.score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Quest power level"
          >
            <span
              className="bar__fill"
              style={{
                width: `${article.score}%`,
                background: 'linear-gradient(90deg, rgba(90,216,255,.35), var(--accent))',
                boxShadow: '0 0 12px color-mix(in srgb, var(--accent) 70%, transparent)',
              }}
            />
          </div>
          <span className="quest__power-num">{article.score}</span>
        </div>
      </div>
    </article>
  );
}
