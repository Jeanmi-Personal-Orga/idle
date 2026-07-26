import { useEffect, useRef } from 'react';

/**
 * La brume : un canvas unique en surcouche de toutes les vues, particules lentes
 * à 15 % d'opacité (direction-artistique.md §6). C'est le liant visuel du jeu.
 *
 * Le rendu se coupe quand l'onglet perd le focus — un idle reste ouvert des
 * heures et ne doit pas chauffer le téléphone (§7).
 */

interface Puff {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

export function Fog() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let puffs: Puff[] = [];
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      const count = Math.round((canvas.clientWidth * canvas.clientHeight) / 26000);
      puffs = Array.from({ length: Math.max(8, Math.min(28, count)) }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        r: 40 + Math.random() * 90,
        vx: (Math.random() - 0.5) * 5,
        vy: -2 - Math.random() * 5,
        a: 0.25 + Math.random() * 0.55,
      }));
    };

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of puffs) {
        if (!reduced) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y + p.r < 0) p.y = h + p.r;
          if (p.x - p.r > w) p.x = -p.r;
          if (p.x + p.r < 0) p.x = w + p.r;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(84, 93, 114, ${p.a})`);
        g.addColorStop(1, 'rgba(84, 93, 114, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="fog" aria-hidden="true" />;
}
