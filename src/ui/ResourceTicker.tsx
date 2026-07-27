import { useEffect, useRef, useState } from 'react';
import { formatNum } from '../game/engine';
import { RESOURCES, type ResourceId } from '../game/resources';
import { useGame } from '../game/store';
import { ResIcon } from './ResIcon';

/**
 * Compteur animé d'une ressource : à chaque gain, le montant s'affiche en vert
 * au-dessus et l'icône tressaille. Sans ça, un butin qui tombe pendant qu'on
 * regarde le combat passe complètement inaperçu.
 *
 * L'animation est purement locale : rien n'est stocké dans la sauvegarde.
 */

interface Gain {
  id: number;
  amount: number;
}

export function ResourceTicker({ id }: { id: ResourceId }) {
  const state = useGame();
  const value = state.resources[id];
  const [gains, setGains] = useState<Gain[]>([]);
  const previous = useRef(value);
  const nextId = useRef(0);

  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    // Les micro-gains du combat au goutte-à-goutte n'ont pas à clignoter en
    // permanence : on n'annonce qu'un gain qui se voit.
    if (delta <= 0 || delta < 0.5) return;
    const gain = { id: ++nextId.current, amount: delta };
    setGains((list) => [...list, gain].slice(-3));
    const timer = window.setTimeout(
      () => setGains((list) => list.filter((g) => g.id !== gain.id)),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [value]);

  const def = RESOURCES.find((r) => r.id === id)!;

  return (
    <span className={`ticker res-${id}`} title={`${def.name} — ${def.use}`}>
      <ResIcon id={id} />
      <span className={gains.length ? 'bumped' : undefined}> {formatNum(value)}</span>
      {gains.map((g) => (
        <em key={g.id} className="gain">
          +{formatNum(g.amount)}
        </em>
      ))}
    </span>
  );
}
