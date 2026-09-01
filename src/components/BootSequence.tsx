import { useEffect, useState } from 'react';

const LINES = [
  'Establishing link to the news gate…',
  'Indexing daily quest log…',
  'Ranking targets by power level…',
];

const LINE_DELAY = 380;
const HOLD_AFTER_ARISE = 900;

/**
 * The System notification that greets a hunter. Shown once per browser session,
 * skippable with any click or key, and bypassed entirely under reduced motion.
 */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [arise, setArise] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timers: number[] = [];

    LINES.forEach((_, index) => {
      timers.push(window.setTimeout(() => setVisibleLines(index + 1), LINE_DELAY * (index + 1)));
    });

    const ariseAt = LINE_DELAY * (LINES.length + 1);
    timers.push(window.setTimeout(() => setArise(true), ariseAt));
    timers.push(window.setTimeout(() => setClosing(true), ariseAt + HOLD_AFTER_ARISE));
    timers.push(window.setTimeout(onDone, ariseAt + HOLD_AFTER_ARISE + 600));

    return () => timers.forEach(window.clearTimeout);
  }, [onDone]);

  useEffect(() => {
    const skip = () => {
      setClosing(true);
      window.setTimeout(onDone, 400);
    };

    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return (
    <div className={`boot${closing ? ' is-closing' : ''}`} role="status" aria-live="polite">
      <div className="sys-window sys-window--violet boot__window">
        <div className="boot__tag">[ SYSTEM ]</div>

        <div className="boot__lines">
          {LINES.slice(0, visibleLines).map((line) => (
            <div className="boot__line" key={line}>
              {line}
            </div>
          ))}
        </div>

        {arise && <div className="boot__arise">ARISE.</div>}

        <div className="boot__hint">Press any key to skip</div>
      </div>
    </div>
  );
}
