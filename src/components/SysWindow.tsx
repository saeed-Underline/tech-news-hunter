import type { ReactNode } from 'react';

interface SysWindowProps {
  title: string;
  meta?: ReactNode;
  variant?: 'cyan' | 'violet';
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** The framed panel that every section of the app lives inside. */
export function SysWindow({
  title,
  meta,
  variant = 'cyan',
  className = '',
  bodyClassName = '',
  children,
}: SysWindowProps) {
  return (
    <section
      className={`sys-window${variant === 'violet' ? ' sys-window--violet' : ''} ${className}`.trim()}
    >
      <header className="sys-window__head">
        <span className={`diamond${variant === 'violet' ? ' diamond--violet' : ''}`} />
        <h2 className="sys-window__title">{title}</h2>
        {meta ? <span className="sys-window__meta">{meta}</span> : null}
      </header>
      <div className={`sys-window__body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

export function RankBadge({ rank, small = false }: { rank: string; small?: boolean }) {
  return (
    <span
      className={`rank${small ? ' rank--sm' : ''}`}
      data-rank={rank}
      title={`${rank}-rank quest`}
      aria-label={`${rank} rank`}
    >
      {rank}
    </span>
  );
}
