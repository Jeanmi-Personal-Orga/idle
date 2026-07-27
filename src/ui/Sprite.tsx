import { useEffect, useState } from 'react';
import { animData } from '../game/sprites';

/**
 * Rendu des spritesheets HD du dossier `hd/` (voir son README) : une image par
 * animation, les frames côte à côte. Le manifeste donne le nombre de frames et
 * la taille native.
 *
 * L'échelle se règle par `zoom`, un multiplicateur de la taille **native** : un
 * rat de cale (112 × 64) reste donc un rat à côté d'un contremaître
 * (160 × 208). Imposer une hauteur commune ferait des rats géants.
 *
 * Les images vivent dans `public/sprites/`, servies telles quelles.
 */

const BASE = '/sprites/';

export function Sprite({
  character,
  anim = 'idle',
  fallbackAnim,
  fps = 8,
  loop = true,
  zoom = 1,
  flip = false,
  className = '',
  style,
}: {
  character: string;
  anim?: string;
  /** Animations de repli si `anim` n'existe pas pour ce personnage. */
  fallbackAnim?: string[];
  fps?: number;
  loop?: boolean;
  /** Multiplicateur de la taille native du sprite. */
  zoom?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const data = animData(character, [anim, ...(fallbackAnim ?? [])]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!data || data.frames <= 1) return;
    setFrame(0);
    let id = 0;
    const tick = () =>
      setFrame((p) => {
        const n = p + 1;
        if (n >= data.frames) return loop ? 0 : p;
        return n;
      });
    const start = () => {
      if (!id) id = window.setInterval(tick, 1000 / fps);
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
  }, [data, fps, loop]);

  if (!data) return null;
  const width = data.frameWidth * zoom;
  const height = data.frameHeight * zoom;
  // Le miroir est appliqué au dessin, pas à la boîte : la boîte porte les
  // animations CSS (entrée dans la brume), et une animation de `transform`
  // écraserait un miroir posé au même endroit.
  const transform = flip
    ? `translateX(${width}px) scale(${-zoom}, ${zoom})`
    : `scale(${zoom})`;

  return (
    <div className={`sprite-box ${className}`} style={{ width, height, ...style }}>
      <div
        className="sprite"
        style={{
          width: data.frameWidth,
          height: data.frameHeight,
          backgroundImage: `url(${BASE}${data.file})`,
          backgroundPosition: `-${frame * data.frameWidth}px 0`,
          transform,
        }}
      />
    </div>
  );
}
