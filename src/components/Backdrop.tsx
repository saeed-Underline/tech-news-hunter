import { useEffect, useRef } from 'react';

interface Mote {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  alpha: number;
  hue: number;
}

/**
 * Ambient "mana motes" drifting upward behind the UI. Deliberately cheap:
 * a few dozen additive-blended dots, paused when the tab is hidden and
 * skipped entirely for users who asked for reduced motion.
 */
export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let motes: Mote[] = [];
    let frame = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(72, Math.max(26, (width * height) / 26000)));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.6 + Math.random() * 1.9,
        speed: 0.12 + Math.random() * 0.42,
        drift: (Math.random() - 0.5) * 0.22,
        alpha: 0.18 + Math.random() * 0.5,
        // Cyan (195) through violet (265).
        hue: 195 + Math.random() * 70,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const mote of motes) {
        mote.y -= mote.speed;
        mote.x += mote.drift;

        if (mote.y < -12) {
          mote.y = height + 12;
          mote.x = Math.random() * width;
        }
        if (mote.x < -12) mote.x = width + 12;
        if (mote.x > width + 12) mote.x = -12;

        const glow = ctx.createRadialGradient(
          mote.x,
          mote.y,
          0,
          mote.x,
          mote.y,
          mote.radius * 7,
        );
        glow.addColorStop(0, `hsla(${mote.hue}, 100%, 74%, ${mote.alpha})`);
        glow.addColorStop(1, `hsla(${mote.hue}, 100%, 60%, 0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius * 7, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };

    seed();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', seed);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', seed);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <canvas ref={canvasRef} className="backdrop-canvas" aria-hidden="true" />
    </>
  );
}
