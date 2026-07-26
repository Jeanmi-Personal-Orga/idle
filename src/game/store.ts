import { useEffect, useSyncExternalStore } from 'react';
import { SAVE_VERSION, applyOffline, collectDistillation, newGame, step } from './engine';
import type { GameState } from './types';

const KEY = 'brume.save.v1';
/** Pas de simulation fixe : rend le combat déterministe quel que soit le framerate. */
const TICK = 1 / 10;

class GameStore {
  state: GameState;
  private listeners = new Set<() => void>();
  private revision = 0;
  private accumulator = 0;
  private raf = 0;
  private lastFrame = 0;

  constructor() {
    this.state = load() ?? newGame();
    applyOffline(this.state);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.revision;

  /** Applique une mutation puis notifie l'interface. */
  act = (fn: (state: GameState) => void) => {
    fn(this.state);
    this.notify();
  };

  private notify() {
    this.revision++;
    for (const fn of this.listeners) fn();
  }

  start() {
    if (this.raf) return;
    this.lastFrame = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(1, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= TICK && steps++ < 60) {
        this.accumulator -= TICK;
        step(this.state, TICK);
      }
      // La récolte est automatique : l'attente est le coût, pas le clic.
      if (this.state.distilling && this.state.distilling.remaining <= 0) {
        collectDistillation(this.state);
      }
      if (steps > 0) this.notify();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);

    setInterval(() => this.save(), 5000);
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
      else {
        applyOffline(this.state);
        this.lastFrame = performance.now();
        this.notify();
      }
    });
  }

  save() {
    this.state.lastSeen = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* quota plein ou stockage refusé : la partie continue en mémoire */
    }
  }

  reset() {
    localStorage.removeItem(KEY);
    this.state = newGame();
    this.notify();
  }
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

/**
 * Fait remonter une sauvegarde ancienne à la version courante. Une sauvegarde
 * qu'on ne sait pas convertir est abandonnée plutôt que chargée de travers.
 */
function migrate(save: GameState): GameState | null {
  if (save.version === 1) {
    // v2 : arbre de recherche et sa monnaie.
    save.resources.insight = 0;
    save.tech = {};
    save.version = 2;
  }
  return save.version === SAVE_VERSION ? save : null;
}

export const store = new GameStore();

/** Abonne le composant à chaque tick du moteur. */
export function useGame(): GameState {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return store.state;
}

export function useGameLoop() {
  useEffect(() => {
    store.start();
  }, []);
}
