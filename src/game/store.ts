import { useEffect, useSyncExternalStore } from 'react';
import {
  SAVE_VERSION,
  applyOffline,
  collectDistillation,
  makeEnemies,
  newGame,
  pushLog,
  startRandomDistillation,
  step,
  type CombatEvent,
} from './engine';
import { distillCost } from './formulas';
import { enemySprite } from './content';
import { CHARACTERS, DEFAULT_CHARACTER } from './characters';
import type { Enemy, GameState } from './types';
import { pushSave } from './api';
import { authStore } from './auth';

const KEY = 'brume.save.v1';
/** Pas de simulation fixe : rend le combat déterministe quel que soit le framerate. */
const TICK = 1 / 10;

/** Un coup affiché à l'écran, purement visuel, jamais sauvegardé. */
export interface FloatingHit {
  id: number;
  damage: number;
  crit: boolean;
  /** Index de l'ennemi visé, pour attribuer le bon éclat sur une vague à plusieurs ennemis. */
  targetIndex: number;
  /** Horodatage de naissance (performance.now), pour le fondu. */
  born: number;
  /** Décalages aléatoires pour éviter que deux chiffres se superposent. */
  dx: number;
  dy: number;
}

/** Durée de vie d'un chiffre de dégâts, en millisecondes (§3 : montée + fondu). */
const HIT_TTL = 700;

class GameStore {
  state: GameState;
  /** Coups récents pour l'affichage ; vidés au fil du temps.  */
  hits: FloatingHit[] = [];
  /** Compteurs d'attaques, pour que l'arène joue les bonnes animations. */
  heroSwings = 0;
  foeSwings = 0;
  private listeners = new Set<() => void>();
  private revision = 0;
  private accumulator = 0;
  private hitId = 0;
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
      // Les chiffres de dégâts ne servent à rien quand l'onglet est masqué :
      // on ne les collecte que si quelqu'un peut les voir.
      const sink = document.hidden ? undefined : (e: CombatEvent) => this.onCombatEvent(e);
      while (this.accumulator >= TICK && steps++ < 60) {
        this.accumulator -= TICK;
        step(this.state, TICK, Math.random, sink);
      }
      if (this.hits.length) {
        const cutoff = now - HIT_TTL;
        this.hits = this.hits.filter((h) => h.born > cutoff);
      }
      // La récolte est automatique : l'attente est le coût, pas le clic.
      if (this.state.distilling && this.state.distilling.remaining <= 0) {
        collectDistillation(this.state);
      }
      // Boucle de distillation : relance seule une pièce au hasard tant qu'il reste
      // des réactifs, s'arrête proprement dès qu'ils manquent.
      if (!this.state.distilling && this.state.autoDistill) {
        if (this.state.resources.reagent < distillCost(this.state.labLevel)) {
          this.state.autoDistill = false;
          pushLog(this.state, 'Distillation en boucle arrêtée : plus de réactifs.');
        } else {
          startRandomDistillation(this.state);
        }
        steps = Math.max(steps, 1);
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

  private onCombatEvent(event: CombatEvent) {
    if (event.type === 'hit') {
      this.hits.push({
        id: ++this.hitId,
        damage: event.damage,
        crit: event.crit,
        targetIndex: event.targetIndex,
        born: performance.now(),
        dx: Math.random() * 40 - 20,
        dy: Math.random() * 12,
      });
      // Garde-fou : à très haute vitesse d'attaque, on ne garde que les derniers.
      if (this.hits.length > 12) this.hits.splice(0, this.hits.length - 12);
    } else if (event.type === 'swing') {
      this.heroSwings++;
    } else if (event.type === 'taken') {
      this.foeSwings++;
    }
  }

  save() {
    this.state.lastSeen = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* quota plein ou stockage refusé : la partie continue en mémoire */
    }
    // Le cloud est la source de vérité une fois connecté, mais l'écriture
    // locale ci-dessus reste inconditionnelle : hors-ligne ou déconnecté,
    // rien ne change.
    const token = authStore.token;
    if (token) {
      pushSave(token, this.state).catch((err) => {
        console.warn('Sauvegarde cloud échouée :', err);
      });
    }
  }

  /** Remplace l'état courant par une sauvegarde cloud (connexion sur un compte existant). */
  loadFromCloud(state: GameState) {
    const migrated = migrate(state);
    this.state = migrated ?? newGame();
    applyOffline(this.state);
    this.notify();
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
export function migrate(save: GameState): GameState | null {
  if (save.version === 1) {
    // v2 : arbre de recherche et sa monnaie.
    save.resources.insight = 0;
    save.tech = {};
    save.version = 2;
  }
  if (save.version === 2) {
    // v3 : dissolution (prestige) et ses legs permanents.
    save.resources.shard = 0;
    save.ascension = { count: 0, legacies: {}, deepest: save.combat.district };
    save.version = 3;
  }
  if (save.version === 3) {
    // v4 : choix du personnage.
    save.character = DEFAULT_CHARACTER;
    save.version = 4;
  }
  if (save.version === 4) {
    // v5 : nouveau casting. Les anciens personnages n'existent plus, donc on
    // redemande le choix plutôt que d'en imposer un au hasard.
    if (!CHARACTERS.some((c) => c.id === save.character)) save.character = null;
    save.version = 5;
  }
  if (save.version === 5) {
    // v6 : catalyseurs (récompense de contrat) et plusieurs ennemis par vague.
    save.resources.catalyst = save.resources.catalyst ?? 0;
    const combat = save.combat as unknown as { enemy?: Enemy; enemies?: Enemy[] };
    if (!combat.enemies) {
      if (combat.enemy) {
        // Un vieux sprite n'existait pas : on lui donne celui de la vague en cours.
        combat.enemy.sprite = combat.enemy.sprite ?? enemySprite(save.combat.district, save.combat.wave);
        combat.enemies = [combat.enemy];
      } else {
        combat.enemies = makeEnemies(save.combat.district, save.combat.wave);
      }
      delete combat.enemy;
    }
    save.version = 6;
  }
  if (save.version === 6) {
    // v7 : laboratoire et recherche minutés, boucle de distillation.
    save.labUpgrading = null;
    save.researching = null;
    save.autoDistill = false;
    save.version = 7;
  }
  if (save.version === 7) {
    // v8 : pièces d'or, monnaie de combat distincte de l'essence pour le comptoir.
    save.resources.goldCoin = save.resources.goldCoin ?? 0;
    save.version = 8;
  }
  if (save.version === 8) {
    // v9 : huit emplacements, étoiles de dissolution, rôles des monnaies
    // échangés. Les anciennes pièces (flacon, manteau, lentille, gantelet)
    // n'existent plus : on refond l'équipement au palier le plus bas plutôt que
    // de charger des emplacements fantômes.
    save.equipped = {};
    save.stash = [];
    save.version = 9;
  }
  if (save.version === 9) {
    // v10 : marche d'approche gérée par le moteur.
    save.combat.closing = 0;
    save.version = 10;
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
