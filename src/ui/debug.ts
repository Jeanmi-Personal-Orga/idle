import { useSyncExternalStore } from 'react';

/**
 * Réglages d'affichage de mise au point. Ils ne font pas partie de la partie :
 * ils vivent dans `localStorage`, pas dans la sauvegarde, et ne sont donc jamais
 * poussés au serveur ni migrés.
 *
 * Le seul pour l'instant : montrer les boîtes de collision. C'est utile parce que
 * la géométrie de l'arène est calculée (voir `arena-geometry.ts`) — pouvoir la
 * regarder évite d'avoir à la deviner.
 */
const KEY = 'brume.debug.hitbox';

const listeners = new Set<() => void>();
let enabled = read();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function toggleHitboxes() {
  enabled = !enabled;
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* stockage refusé : le réglage tiendra le temps de la session */
  }
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
