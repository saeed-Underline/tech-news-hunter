import { SysWindow } from './SysWindow';
import { dateParts } from '../lib/format';
import type { IndexDay, Rank } from '../types';

const RANK_VARS: Record<Rank, string> = {
  S: 'var(--rank-s)',
  A: 'var(--rank-a)',
  B: 'var(--rank-b)',
  C: 'var(--rank-c)',
  D: 'var(--rank-d)',
  E: 'var(--rank-e)',
};

/** Horizontal day picker. Each retained day is a "gate" you can re-enter. */
export function GateTimeline({
  days,
  selected,
  onSelect,
}: {
  days: IndexDay[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  return (
    <SysWindow
      title="Gates"
      meta={`${days.length} open`}
      bodyClassName="sys-window__body--gates"
    >
      <div className="gates">
        {days.map((day) => {
          const { day: dayNum, weekday, long } = dateParts(day.date);
          const isActive = day.date === selected;

          return (
            <button
              type="button"
              key={day.date}
              className={`gate${isActive ? ' is-active' : ''}`}
              onClick={() => onSelect(day.date)}
              aria-pressed={isActive}
              title={`${long} — ${day.count} quests, top rank ${day.topRank}`}
            >
              <div className="gate__day">{dayNum}</div>
              <div className="gate__wd">{weekday}</div>
              <div
                className="gate__bar"
                style={{ color: RANK_VARS[day.topRank] ?? 'var(--rank-e)' }}
              />
            </button>
          );
        })}
      </div>
    </SysWindow>
  );
}
