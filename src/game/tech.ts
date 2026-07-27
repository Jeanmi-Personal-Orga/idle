import type { GameState, StatKey } from './types';

/**
 * Arbre de recherche. Trois branches, une monnaie dédiée (Lucidité) pour que la
 * recherche n'entre pas en concurrence avec l'affinage des élixirs.
 */
export type BranchId = 'laboratoire' | 'puissance' | 'brume';

export const BRANCHES: { id: BranchId; name: string; blurb: string; color: string }[] = [
  {
    id: 'laboratoire',
    name: 'Laboratoire',
    blurb: 'Distiller plus vite, plus pur, moins cher.',
    color: '#c2a3e8',
  },
  {
    id: 'puissance',
    name: 'Puissance',
    blurb: "Dégâts, points de vie, critiques.",
    color: '#e0a13c',
  },
  {
    id: 'brume',
    name: 'Brume',
    blurb: 'Essence, vol de vie, régénération, hors-ligne.',
    color: '#62d4c4',
  },
];

export interface TechNode {
  id: string;
  branch: BranchId;
  name: string;
  /** Description d'un niveau, pour l'affichage. */
  effect: (level: number) => string;
  max: number;
  costBase: number;
  costGrowth: number;
  /** Nœud parent à monter avant de débloquer celui-ci. */
  requires?: { node: string; level: number };
}

export const NODES: TechNode[] = [
  // --- Laboratoire ---
  {
    id: 'distill_speed',
    branch: 'laboratoire',
    name: 'Serpentin froid',
    effect: (n) => `Distillation −${pct(1 - Math.pow(0.96, n))} de durée`,
    max: 25,
    costBase: 3,
    costGrowth: 1.28,
  },
  {
    id: 'reagent_yield',
    branch: 'laboratoire',
    name: 'Décantation',
    effect: (n) => `Réactifs récoltés +${pct(0.08 * n)}`,
    max: 20,
    costBase: 5,
    costGrowth: 1.3,
  },
  {
    id: 'purity_bias',
    branch: 'laboratoire',
    name: 'Filtre à mailles',
    effect: (n) => `Courbe de pureté décalée de +${(0.12 * n).toFixed(2)} palier`,
    max: 15,
    costBase: 18,
    costGrowth: 1.42,
    requires: { node: 'distill_speed', level: 5 },
  },
  {
    id: 'sub_chance',
    branch: 'laboratoire',
    name: 'Lecture des dépôts',
    effect: (n) => `+${pct(0.04 * n)} de chance d'une secondaire de plus`,
    max: 15,
    costBase: 22,
    costGrowth: 1.4,
    requires: { node: 'reagent_yield', level: 5 },
  },
  {
    id: 'refine_cost',
    branch: 'laboratoire',
    name: 'Économie de geste',
    effect: (n) => `Affinage −${pct(1 - refineMult(n))} d'essence`,
    max: 20,
    costBase: 40,
    costGrowth: 1.45,
    requires: { node: 'purity_bias', level: 4 },
  },

  // --- Puissance ---
  {
    id: 'power',
    branch: 'puissance',
    name: 'Réactif corrosif',
    effect: (n) => `Dégâts +${pct(0.07 * n)}`,
    max: 30,
    costBase: 3,
    costGrowth: 1.26,
  },
  {
    id: 'health',
    branch: 'puissance',
    name: 'Doublure ciré',
    effect: (n) => `Points de vie +${pct(0.09 * n)}`,
    max: 30,
    costBase: 3,
    costGrowth: 1.26,
  },
  {
    id: 'volatility',
    branch: 'puissance',
    name: 'Injecteurs jumeaux',
    effect: (n) => `Vitesse de frappe +${(1.5 * n).toFixed(1)} %`,
    max: 20,
    costBase: 14,
    costGrowth: 1.38,
    requires: { node: 'power', level: 5 },
  },
  {
    id: 'chain',
    branch: 'puissance',
    name: 'Amorce instable',
    effect: (n) => `Double frappe +${(1.2 * n).toFixed(1)} %`,
    max: 25,
    costBase: 20,
    costGrowth: 1.4,
    requires: { node: 'volatility', level: 5 },
  },
  {
    id: 'crit',
    branch: 'puissance',
    name: 'Point de rupture',
    effect: (n) => `Chance critique +${(0.7 * n).toFixed(1)} % · Dégâts critiques +${6 * n} %`,
    max: 25,
    costBase: 30,
    costGrowth: 1.44,
    requires: { node: 'chain', level: 5 },
  },

  // --- Brume ---
  {
    id: 'essence_yield',
    branch: 'brume',
    name: 'Siphon des quais',
    effect: (n) => `Essence récoltée +${pct(0.09 * n)}`,
    max: 25,
    costBase: 3,
    costGrowth: 1.27,
  },
  {
    id: 'osmosis',
    branch: 'brume',
    name: 'Membrane poreuse',
    effect: (n) => `Vol de vie +${(0.9 * n).toFixed(1)} %`,
    max: 20,
    costBase: 10,
    costGrowth: 1.34,
  },
  {
    id: 'condensation',
    branch: 'brume',
    name: 'Rosée captive',
    effect: (n) => `Régénération +${(0.3 * n).toFixed(1)} %/s`,
    max: 15,
    costBase: 12,
    costGrowth: 1.36,
    requires: { node: 'osmosis', level: 4 },
  },
  {
    id: 'ward',
    branch: 'brume',
    name: 'Masque à brume',
    effect: (n) => `Dégâts ennemis −${pct(1 - wardMult(n))}`,
    max: 20,
    costBase: 25,
    costGrowth: 1.42,
    requires: { node: 'condensation', level: 4 },
  },
  {
    id: 'offline',
    branch: 'brume',
    name: 'Carnet de veille',
    effect: (n) => `Hors-ligne +${n} h · efficacité +${pct(0.03 * n)}`,
    max: 16,
    costBase: 16,
    costGrowth: 1.38,
    requires: { node: 'essence_yield', level: 6 },
  },
];

export const nodeDef = (id: string) => NODES.find((n) => n.id === id)!;
export const nodesOf = (branch: BranchId) => NODES.filter((n) => n.branch === branch);

const pct = (v: number) => `${Math.round(v * 1000) / 10} %`;
const refineMult = (n: number) => Math.max(0.35, 1 - 0.03 * n);
const wardMult = (n: number) => Math.max(0.4, Math.pow(0.975, n));

/** Coût du prochain niveau (`level` = niveau actuel). */
export const nodeCost = (node: TechNode, level: number) =>
  Math.ceil(node.costBase * Math.pow(node.costGrowth, level));

export const nodeLevel = (state: GameState, id: string) => state.tech[id] ?? 0;

export function isUnlocked(state: GameState, node: TechNode): boolean {
  if (!node.requires) return true;
  return nodeLevel(state, node.requires.node) >= node.requires.level;
}

export function canResearch(state: GameState, node: TechNode): boolean {
  const lvl = nodeLevel(state, node.id);
  return (
    lvl < node.max &&
    isUnlocked(state, node) &&
    state.resources.insight >= nodeCost(node, lvl)
  );
}

export function research(state: GameState, id: string): boolean {
  const node = nodeDef(id);
  if (!canResearch(state, node)) return false;
  const lvl = nodeLevel(state, id);
  state.resources.insight -= nodeCost(node, lvl);
  state.tech[id] = lvl + 1;
  return true;
}

/** Achète autant de niveaux que la Lucidité le permet. */
export function researchMax(state: GameState, id: string): number {
  let bought = 0;
  while (research(state, id)) bought++;
  return bought;
}

/**
 * Lucidité gagnée sur une vague. Elle ne tombe que sur une vague jamais atteinte
 * dans le district, ou sur un gardien : la recherche suit la progression, elle ne
 * se farme pas en laissant tourner le jeu sur place.
 */
export function insightReward(district: number, isGuardian: boolean, isNewBest: boolean): number {
  if (isGuardian) return 40 * (district + 1);
  return isNewBest ? 2 * (district + 1) : 0;
}

// --- Agrégation ------------------------------------------------------------

export interface TechMods {
  powerMult: number;
  healthMult: number;
  flat: Partial<Record<StatKey, number>>;
  essenceMult: number;
  reagentMult: number;
  distillMult: number;
  purityBias: number;
  subChance: number;
  refineMult: number;
  enemyDamageMult: number;
  offlineCapHours: number;
  offlineEfficiency: number;
  insightMult: number;
}

export const NEUTRAL_MODS: TechMods = {
  powerMult: 1,
  healthMult: 1,
  flat: {},
  essenceMult: 1,
  reagentMult: 1,
  distillMult: 1,
  purityBias: 0,
  subChance: 0,
  refineMult: 1,
  enemyDamageMult: 1,
  offlineCapHours: 8,
  offlineEfficiency: 0.6,
  insightMult: 1,
};

export function techMods(state: GameState): TechMods {
  const l = (id: string) => nodeLevel(state, id);
  return {
    powerMult: 1 + 0.07 * l('power'),
    healthMult: 1 + 0.09 * l('health'),
    flat: {
      volatility: 1.5 * l('volatility'),
      chain: 1.2 * l('chain'),
      clairvoyance: 0.7 * l('crit'),
      rupture: 6 * l('crit'),
      osmosis: 0.9 * l('osmosis'),
      condensation: 0.3 * l('condensation'),
    },
    essenceMult: 1 + 0.09 * l('essence_yield'),
    reagentMult: 1 + 0.08 * l('reagent_yield'),
    distillMult: Math.pow(0.96, l('distill_speed')),
    purityBias: 0.12 * l('purity_bias'),
    subChance: 0.04 * l('sub_chance'),
    refineMult: refineMult(l('refine_cost')),
    enemyDamageMult: wardMult(l('ward')),
    offlineCapHours: 8 + l('offline'),
    offlineEfficiency: 0.6 + 0.03 * l('offline'),
    insightMult: 1,
  };
}

export const totalInvested = (state: GameState, branch: BranchId) =>
  nodesOf(branch).reduce((sum, n) => sum + nodeLevel(state, n.id), 0);
