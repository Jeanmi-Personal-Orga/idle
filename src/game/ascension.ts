import { WAVES_PER_DISTRICT } from './content';
import type { GameState } from './types';

/**
 * Dissolution — le prestige du jeu. On dissout le laboratoire : essence,
 * réactifs, élixirs et districts repartent de zéro. Ce qui est *appris* reste :
 * l'arbre de recherche, la Lucidité, les Éclats et les legs achetés ici.
 */

/** District à atteindre au moins une fois pour ouvrir la dissolution. */
export const ASCEND_UNLOCK_DISTRICT = 2;

export interface Legacy {
  id: string;
  name: string;
  effect: (level: number) => string;
  max: number;
  costBase: number;
  costGrowth: number;
}

export const LEGACIES: Legacy[] = [
  {
    id: 'core',
    name: 'Cœur de brume',
    effect: (n) => `Essence récoltée +${pct(0.3 * n)}`,
    max: 30,
    costBase: 2,
    costGrowth: 1.5,
  },
  {
    id: 'salt',
    name: 'Sel primordial',
    effect: (n) => `Dégâts et points de vie +${pct(0.22 * n)}`,
    max: 30,
    costBase: 3,
    costGrowth: 1.55,
  },
  {
    id: 'register',
    name: 'Registre sauvé',
    effect: (n) => `Réactifs récoltés +${pct(0.25 * n)}`,
    max: 25,
    costBase: 3,
    costGrowth: 1.5,
  },
  {
    id: 'glass',
    name: 'Verre ancien',
    effect: (n) => `Courbe de pureté décalée de +${(0.3 * n).toFixed(1)} palier`,
    max: 12,
    costBase: 8,
    costGrowth: 1.75,
  },
  {
    id: 'heirloom',
    name: 'Alambic hérité',
    effect: (n) => `Laboratoire niveau ${1 + 3 * n} au réveil`,
    max: 15,
    costBase: 6,
    costGrowth: 1.7,
  },
  {
    id: 'memory',
    name: 'Mémoire de la ville',
    effect: (n) => `Lucidité gagnée +${pct(0.2 * n)}`,
    max: 20,
    costBase: 10,
    costGrowth: 1.65,
  },
];

export const legacyDef = (id: string) => LEGACIES.find((l) => l.id === id)!;
export const legacyLevel = (state: GameState, id: string) => state.ascension.legacies[id] ?? 0;

const pct = (v: number) => `${Math.round(v * 1000) / 10} %`;

export const legacyCost = (legacy: Legacy, level: number) =>
  Math.ceil(legacy.costBase * Math.pow(legacy.costGrowth, level));

export function canBuyLegacy(state: GameState, legacy: Legacy): boolean {
  const lvl = legacyLevel(state, legacy.id);
  return lvl < legacy.max && state.resources.shard >= legacyCost(legacy, lvl);
}

export function buyLegacy(state: GameState, id: string): boolean {
  const legacy = legacyDef(id);
  if (!canBuyLegacy(state, legacy)) return false;
  const lvl = legacyLevel(state, id);
  state.resources.shard -= legacyCost(legacy, lvl);
  state.ascension.legacies[id] = lvl + 1;
  return true;
}

export function buyLegacyMax(state: GameState, id: string): number {
  let bought = 0;
  while (buyLegacy(state, id)) bought++;
  return bought;
}

// --- Gain et conditions ----------------------------------------------------

export const hasUnlockedAscension = (state: GameState) =>
  state.ascension.deepest >= ASCEND_UNLOCK_DISTRICT;

/**
 * Éclats rendus par une dissolution. Chaque district franchi vaut environ le
 * double du précédent : il est toujours payant de pousser un district de plus
 * plutôt que de dissoudre tôt.
 */
export function shardGain(state: GameState): number {
  const c = state.combat;
  const progress = c.district + (c.best - 1) / WAVES_PER_DISTRICT;
  if (progress < ASCEND_UNLOCK_DISTRICT) return 0;
  return Math.floor(2 * Math.pow(2.1, progress - ASCEND_UNLOCK_DISTRICT + 1));
}

/** Aperçu du gain si le joueur poussait jusqu'au district suivant. */
export function nextDistrictGain(state: GameState): number {
  const next = state.combat.district + 1;
  return Math.floor(2 * Math.pow(2.1, next - ASCEND_UNLOCK_DISTRICT + 1));
}

// --- Modificateurs ---------------------------------------------------------

export interface AscMods {
  essenceMult: number;
  reagentMult: number;
  statMult: number;
  purityBias: number;
  insightMult: number;
  startingLab: number;
}

export const NEUTRAL_ASC: AscMods = {
  essenceMult: 1,
  reagentMult: 1,
  statMult: 1,
  purityBias: 0,
  insightMult: 1,
  startingLab: 1,
};

export function ascMods(state: GameState): AscMods {
  const l = (id: string) => legacyLevel(state, id);
  // Chaque dissolution laisse un écho permanent, indépendamment des legs achetés.
  const echo = 1 + 0.12 * state.ascension.count;
  return {
    essenceMult: (1 + 0.3 * l('core')) * echo,
    reagentMult: 1 + 0.25 * l('register'),
    statMult: (1 + 0.22 * l('salt')) * echo,
    purityBias: 0.3 * l('glass'),
    insightMult: 1 + 0.2 * l('memory'),
    startingLab: 1 + 3 * l('heirloom'),
  };
}
