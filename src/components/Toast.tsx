import { useEffect, useState } from 'react';

/** System notification, auto-dismissing. */
export function Toast({
  title,
  text,
  onClose,
  duration = 6000,
}: {
  title: string;
  text: string;
  onClose: () => void;
  duration?: number;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const hide = window.setTimeout(() => setClosing(true), duration);
    const remove = window.setTimeout(onClose, duration + 400);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`sys-window toast${closing ? ' is-closing' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast__title">{title}</div>
      <p className="toast__text">{text}</p>
    </div>
  );
}
