import { SysWindow } from './SysWindow';
import { formatBytes } from '../lib/format';
import type { NewsIndex } from '../types';

/**
 * Surfaces the retention policy in the UI, because the storage budget is a
 * real, load-bearing part of this project rather than a hidden implementation
 * detail. The gauge shifts gold then red as the datastore approaches its cap.
 */
export function StoragePanel({ index }: { index: NewsIndex }) {
  const { bytes, bytesLimit, daysTracked, monthsArchived, articlesArchived } = index.stats;
  const used = bytesLimit ? Math.min(100, (bytes / bytesLimit) * 100) : 0;

  const fillClass =
    used >= 90 ? 'bar__fill--danger' : used >= 70 ? 'bar__fill--gold' : 'bar__fill--violet';

  return (
    <SysWindow title="Mana Core" meta={`${used.toFixed(1)}%`}>
      <div className="stat-row">
        <div className="stat-row__head">
          <span className="label">Storage used</span>
          <span className="stat-row__value">
            {formatBytes(bytes)} / {formatBytes(bytesLimit)}
          </span>
        </div>
        <div
          className="bar"
          role="meter"
          aria-valuenow={Math.round(used)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Datastore size against its cap"
        >
          <span className={`bar__fill ${fillClass}`} style={{ width: `${used}%` }} />
        </div>
      </div>

      <ul className="policy-list">
        <li>
          <span>Full days kept</span>
          <b>
            {daysTracked} / {index.retention.dailyRetentionDays}d
          </b>
        </li>
        <li>
          <span>Months archived</span>
          <b>
            {monthsArchived} / {index.retention.archiveRetentionMonths}mo
          </b>
        </li>
        <li>
          <span>Archived quests</span>
          <b>{articlesArchived}</b>
        </li>
        <li>
          <span>Top kept per archived day</span>
          <b>{index.retention.archiveTopPerDay}</b>
        </li>
      </ul>

      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Days older than {index.retention.dailyRetentionDays} days are condensed into monthly
        archives, then dropped after {index.retention.archiveRetentionMonths} months. If the store
        ever exceeds its cap, the oldest records are released first.
      </p>
    </SysWindow>
  );
}
