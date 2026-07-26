import { DISTRICTS, PURITIES, WAVES_PER_DISTRICT, purityIndex, slotDef } from './content';
import { NEUTRAL_MODS, techMods, type TechMods } from './tech';
import type { GameState, Item, PurityId, SlotId, StatKey, Stats } from './types';

/** Intervalle de frappe de base, en secondes, avant Volatilité. */
export const BASE_INTERVAL = 1.4;

/**
 * Statistiques exprimées en pourcentage. Elles montent beaucoup plus lentement
 * que Puissance/Intégrité : sans cela, un objet de haut palier dépasserait à lui
 * seul le plafond de 100 % et les objectifs de composition perdraient tout sens.
 */
const PERCENT_STATS: StatKey[] = [
  'volatility',
  'chain',
  'osmosis',
  'condensation',
  'clairvoyance',
  'rupture',
];

export const isPercent = (k: StatKey) => PERCENT_STATS.includes(k);

/** Un objet gagne 12 % de Puissance/Intégrité par niveau, 3,5 % sur le reste. */
export const levelMult = (level: number, percent = false) =>
  1 + (percent ? 0.04 : 0.14) * (level - 1);

/** Le palier de pureté multiplie les pourcentages de façon très amortie. */
export const purityStatMult = (mult: number, percent: boolean) =>
  percent ? Math.pow(mult, 0.42) : mult;

export function itemStats(item: Item): Stats {
  const out: Stats = {};
  const add = (k: StatKey, v: number) =>
    (out[k] = (out[k] ?? 0) + v * levelMult(item.level, isPercent(k)));
  add(item.main.key, item.main.value);
  for (const s of item.subs) add(s.key, s.value);
  return out;
}

/** Stats totales du héros : socle + équipement + laboratoire + recherche. */
export function heroStats(state: GameState): Required<Stats> {
  const mods = techMods(state);
  const total: Required<Stats> = {
    power: 5,
    health: 100,
    volatility: 0,
    chain: 0,
    osmosis: 0,
    condensation: 0.5,
    clairvoyance: 3,
    rupture: 50,
  };
  for (const item of Object.values(state.equipped)) {
    if (!item) continue;
    for (const [k, v] of Object.entries(itemStats(item))) {
      total[k as StatKey] += v!;
    }
  }
  for (const [k, v] of Object.entries(mods.flat)) {
    total[k as StatKey] += v ?? 0;
  }
  // Le laboratoire et la branche Puissance renforcent le socle offensif et vital.
  const lab = 1 + 0.05 * (state.labLevel - 1);
  total.power *= lab * mods.powerMult;
  total.health *= lab * mods.healthMult;
  return total;
}

export const attackInterval = (s: Required<Stats>) =>
  BASE_INTERVAL / (1 + Math.max(0, s.volatility) / 100);

/** La Réaction en chaîne est plafonnée à 100 % : au-delà, aucun gain. */
export const chainChance = (s: Required<Stats>) => Math.min(100, s.chain) / 100;
export const critChance = (s: Required<Stats>) => Math.min(100, s.clairvoyance) / 100;

/** DPS théorique, utilisé pour l'affichage et la progression hors-ligne. */
export function dps(s: Required<Stats>): number {
  const hits = 1 + chainChance(s);
  const critMult = 1 + critChance(s) * (s.rupture / 100);
  return (s.power * hits * critMult) / attackInterval(s);
}

// --- Ennemis ---------------------------------------------------------------

export function enemyName(district: number, wave: number): string {
  const d = DISTRICTS[Math.min(district, DISTRICTS.length - 1)];
  if (wave === WAVES_PER_DISTRICT) return `${d.enemies[2]} (gardien)`;
  return d.enemies[wave % 2];
}

/** Progression de difficulté : douce dans un district, saut net entre districts. */
export function enemyHp(district: number, wave: number): number {
  const districtMult = Math.pow(9, district);
  const boss = wave === WAVES_PER_DISTRICT ? 4 : 1;
  return 32 * districtMult * Math.pow(1.15, wave - 1) * boss;
}

export function enemyDamage(district: number, wave: number): number {
  const districtMult = Math.pow(4.5, district);
  return 6 * districtMult * Math.pow(1.13, wave - 1);
}

export const enemyInterval = () => 1.6;

export function waveReward(district: number, wave: number) {
  const districtMult = Math.pow(7, district);
  const boss = wave === WAVES_PER_DISTRICT ? 10 : 1;
  return {
    essence: 14 * districtMult * Math.pow(1.13, wave - 1) * boss,
    /** Chance de faire tomber un réactif, garantie sur le gardien. */
    reagentChance: wave === WAVES_PER_DISTRICT ? 1 : 0.22,
    reagent: 1 + district * 2 + (wave === WAVES_PER_DISTRICT ? 12 : 0),
  };
}

// --- Coûts -----------------------------------------------------------------

export const upgradeCost = (item: Item, mods: TechMods = NEUTRAL_MODS) =>
  Math.ceil(
    18 *
      Math.pow(1.17, item.level - 1) *
      Math.pow(2.6, purityIndex(item.purity)) *
      mods.refineMult,
  );

export const labUpgradeCost = (labLevel: number) => ({
  essence: Math.ceil(120 * Math.pow(1.28, labLevel - 1)),
  reagent: Math.ceil(4 * Math.pow(1.22, labLevel - 1)),
});

export const distillCost = (labLevel: number) => Math.ceil(6 + 2.2 * (labLevel - 1));

/** Durée d'une distillation, réduite par le laboratoire et la recherche. */
export const distillDuration = (labLevel: number, mods: TechMods = NEUTRAL_MODS) =>
  Math.max(2, 30 * Math.pow(0.94, labLevel - 1) * mods.distillMult);

/**
 * Poids de tirage des paliers de pureté. Le laboratoire déplace la courbe vers
 * le haut : les paliers bas s'effacent au lieu de simplement se diluer.
 */
export function purityWeights(labLevel: number, mods: TechMods = NEUTRAL_MODS): number[] {
  const center = (labLevel - 1) * 0.16 + mods.purityBias;
  return PURITIES.map((_, i) => {
    const d = i - center;
    const w = Math.exp(-(d * d) / 1.1);
    return i > center + 2.5 ? 0 : w;
  });
}

// --- Génération d'objets ---------------------------------------------------

export interface Rng {
  (): number;
}

export function rollPurity(labLevel: number, rng: Rng, mods: TechMods = NEUTRAL_MODS): PurityId {
  const weights = purityWeights(labLevel, mods);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return PURITIES[i].id;
  }
  return PURITIES[0].id;
}

export function makeItem(
  slot: SlotId,
  labLevel: number,
  rng: Rng,
  id: string,
  mods: TechMods = NEUTRAL_MODS,
): Item {
  const def = slotDef(slot);
  const p = rollPurity(labLevel, rng, mods);
  const pi = purityIndex(p);
  const mult = PURITIES[pi].mult;
  const jitter = 0.85 + rng() * 0.3;
  const subCount = Math.min(
    4,
    1 + Math.floor(pi / 1.5) + (rng() < 0.25 + mods.subChance ? 1 : 0),
  );

  const pool = [...def.subs];
  const subs: Item['subs'] = [];
  for (let i = 0; i < subCount && pool.length; i++) {
    const key = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const scale = purityStatMult(mult, isPercent(key));
    subs.push({ key, value: round(subStatBase(key) * scale * (0.7 + rng() * 0.6)) });
  }

  return {
    id,
    slot,
    purity: p,
    level: 1,
    main: {
      key: def.main,
      value: round(def.mainBase * purityStatMult(mult, isPercent(def.main)) * jitter),
    },
    subs,
  };
}

/** Valeur de référence d'une secondaire au palier Trouble. */
function subStatBase(key: StatKey): number {
  switch (key) {
    case 'power':
      return 2;
    case 'health':
      return 18;
    case 'volatility':
      return 2.5;
    case 'chain':
      return 3;
    case 'osmosis':
      return 1.5;
    case 'condensation':
      return 0.4;
    case 'clairvoyance':
      return 1.2;
    case 'rupture':
      return 8;
  }
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Score grossier d'un objet, pour trier la réserve. */
export function itemScore(item: Item): number {
  const s = itemStats(item);
  return Object.entries(s).reduce((acc, [k, v]) => {
    const weight = k === 'health' ? 0.1 : k === 'rupture' ? 0.3 : 1;
    return acc + (v ?? 0) * weight;
  }, 0);
}
