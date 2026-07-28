import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stockage local. `localStorage` n'existe pas en React Native, et son remplaçant
 * (`AsyncStorage`) est **asynchrone** — ce que le magasin de jeu, lui, ne peut pas
 * être : il lit son état au premier rendu et l'écrit dans une boucle d'animation.
 *
 * D'où ce cache en mémoire : tout se lit et s'écrit de façon synchrone dessus,
 * l'écriture sur disque suit en tâche de fond. `hydrate()` doit être attendu une
 * fois au démarrage, avant de construire l'état de jeu.
 */
const cache = new Map<string, string>();

/** Clés à charger au démarrage : sauvegarde, jeton de compte, réglages. */
const KEYS = ['brume.save.v1', 'brume.auth.token', 'brume.auth.skipped', 'brume.debug.hitbox'];

let ready = false;

/** Charge le contenu persistant en mémoire. À attendre avant le premier rendu. */
export async function hydrate(): Promise<void> {
  if (ready) return;
  try {
    const values = await Promise.all(KEYS.map((k) => AsyncStorage.getItem(k)));
    KEYS.forEach((key, i) => {
      const value = values[i];
      if (value !== null) cache.set(key, value);
    });
  } catch {
    /* stockage indisponible : la partie tournera en mémoire */
  }
  ready = true;
}

export const getItem = (key: string): string | null => cache.get(key) ?? null;

/**
 * Remplace le cache. Réservé au test de fumée (`scripts/render-check.tsx`), qui
 * tourne sans appareil et doit pouvoir partir d'une sauvegarde donnée.
 */
export function __setCache(next: Map<string, string>) {
  cache.clear();
  for (const [k, v] of next) cache.set(k, v);
  ready = true;
}

export function setItem(key: string, value: string) {
  cache.set(key, value);
  // L'échec d'écriture ne doit jamais interrompre une partie : on note et on
  // continue, la valeur reste juste en mémoire.
  void AsyncStorage.setItem(key, value).catch(() => {});
}

export function removeItem(key: string) {
  cache.delete(key);
  void AsyncStorage.removeItem(key).catch(() => {});
}
