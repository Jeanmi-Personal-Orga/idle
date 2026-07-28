import { useSyncExternalStore } from 'react';

/**
 * Réglages d'affichage de mise au point. Ils ne font pas partie de la partie :
 * ils vivent dans le stockage local de l'appareil, pas dans la sauvegarde, et ne
 * sont donc jamais poussés au serveur ni migrés.
 *
 * Le seul pour l'instant : montrer les boîtes de collision. C'est utile parce que
 * la géométrie de l'arène est calculée (voir `arena-geometry.ts`) — pouvoir la
 * regarder évite d'avoir à la deviner.
 */
import { getItem, setItem } from '../game/storage';

const KEY = 'brume.debug.hitbox';

const listeners = new Set<() => void>();
// Déclaration de fonction, pas une constante : elle est appelée juste en dessous,
// donc elle doit être remontée par le hoisting.
function read(): boolean {
  return getItem(KEY) === '1';
}
let enabled = read();

export function toggleHitboxes() {
  enabled = !enabled;
  setItem(KEY, enabled ? '1' : '0');
  for (const fn of listeners) fn();
}

/** Vrai quand les boîtes doivent être dessinées. Partagé par les deux arènes. */
export function useHitboxes(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => enabled,
    () => false,
  );
}
