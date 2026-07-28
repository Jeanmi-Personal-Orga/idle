import { useEffect, useState } from 'react';
import { animData, spriteHeight } from '../game/sprites';

/**
 * Rendu d'un sprite : une case de planche, affichée dans une boîte à l'échelle.
 *
 * L'échelle vient de la taille visée pour la famille (`spriteHeight`) : les
 * personnages sont des cases de 32 px, les ennemis des bandes de 64 px. Les
 * mettre à la même échelle brute donnerait des chauves-souris géantes.
 */

export function Sprite({
  character,
  anim = 'idle',
  fallbackAnim,
  scale = 1,
  flip = false,
  className = '',
  style,
}: {
  character: string;
  anim?: string;
  /** Animations de repli si `anim` n'existe pas pour cette créature. */
  fallbackAnim?: string[];
  /** Multiplicateur de la hauteur de référence de la famille. */
  scale?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const data = animData(character, [anim, ...(fallbackAnim ?? [])]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!data || data.cells.length <= 1) return;
    setFrame(0);
    let id = 0;
    const tick = () =>
      setFrame((p) => {
        const n = p + 1;
        if (n >= data.cells.length) return data.loop ? 0 : p;
        return n;
      });
    const start = () => {
      if (!id) id = window.setInterval(tick, 1000 / data.fps);
    };
    const stop = () => {
      window.clearInterval(id);
      id = 0;
    };
    // Un idle reste ouvert des heures : aucune animation ne tourne quand
    // personne ne regarde (direction-artistique.md §7).
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [data]);

  if (!data) return null;

  const [cw, ch] = data.cell;
  const zoom = (spriteHeight(character) / ch) * scale;
  const [col, line] = data.cells[Math.min(frame, data.cells.length - 1)];
  const width = cw * zoom;
  const height = ch * zoom;
  // Le miroir est appliqué au dessin, pas à la boîte : la boîte porte les
  // animations CSS (entrée en scène), et une animation de `transform`
  // écraserait un miroir posé au même endroit.
  const transform = flip
    ? `translateX(${width}px) scale(${-zoom}, ${zoom})`
    : `scale(${zoom})`;

  return (
    <div className={`sprite-box ${className}`} style={{ width, height, ...style }}>
      <div
        className="sprite"
        style={{
          width: cw,
          height: ch,
          backgroundImage: `url(${data.sheet})`,
          backgroundPosition: `-${col * cw}px -${line * ch}px`,
          transform,
        }}
      />
    </div>
  );
}
