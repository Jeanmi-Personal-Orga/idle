import {
  PURITIES,
  SUBS_PER_ITEM,
  SUB_POOL,
  WAVES_PER_DISTRICT,
  districtAt,
  purityIndex,
  slotDef,
} from './content';
import { mods as allMods } from './modifiers';
import { NEUTRAL_MODS, type TechMods } from './tech';
import type { GameState, Item, PurityId, SlotId, StatKey, Stats } from './types';

/** Intervalle de frappe de base, en secondes, avant la Vitesse de frappe. */
export const BASE_INTERVAL = 1.4;

/**
 * Statistiques exprimées en pourcentage. Elles montent beaucoup plus lentement
 * que les Dégâts et les Points de vie : sans cela, un objet de haut palier dépasserait à lui
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

/** Un objet gagne 14 % de Dégâts/Points de vie par niveau, 4 % sur le reste. */
export const levelMult = (level: number, percent = false) =>
  1 + (percent ? 0.04 : 0.14) * (level - 1);

/** Le palier de pureté multiplie les pourcentages de façon très amortie. */
export const purityStatMult = (mult: number, percent: boolean) =>
  percent ? Math.pow(mult, 0.42) : mult;

/** Chaque étoile vaut +60 % sur toute la pièce. */
export const starMult = (stars: number) => 1 + 0.6 * stars;

export function itemStats(item: Item): Stats {
  const out: Stats = {};
  const stars = starMult(item.stars ?? 0);
  const add = (k: StatKey, v: number) =>
    (out[k] = (out[k] ?? 0) + v * levelMult(item.level, isPercent(k)) * stars);
  add(item.main.key, item.main.value);
  for (const s of item.subs) add(s.key, s.value);
  return out;
}

/** Stats totales du héros : socle + équipement + laboratoire + recherche. */
export function heroStats(state: GameState): Required<Stats> {
  const mods = allMods(state);
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

/** La Double frappe est plafonnée à 100 % : au-delà, aucun gain. */
export const chainChance = (s: Required<Stats>) => Math.min(100, s.chain) / 100;
export const critChance = (s: Required<Stats>) => Math.min(100, s.clairvoyance) / 100;

/** DPS théorique, utilisé pour l'affichage et la progression hors-ligne. */
export function dps(s: Required<Stats>): number {
  const hits = 1 + chainChance(s);
  const critMult = 1 + critChance(s) * (s.rupture / 100);
  return (s.power * hits * critMult) / attackInterval(s);
}

/**
 * Points de vie effectifs : ce que le héros encaisse réellement, vol de vie et
 * régénération compris. Deux configurations à PV égaux ne tiennent pas le même
 * temps si l'une se soigne.
 */
export function effectiveHp(s: Required<Stats>): number {
  return s.health * (1 + s.osmosis / 150 + s.condensation / 8);
}

/**
 * Puissance : un seul nombre pour comparer deux configurations d'un coup d'œil.
 *
 * C'est la moyenne géométrique des dégâts par seconde et des points de vie
 * effectifs — doubler ses dégâts ou doubler sa survie compte donc pareil, et
 * négliger l'un des deux se voit tout de suite. Purement indicatif : aucune
 * règle du jeu ne consulte cette valeur.
 */
export function powerScore(s: Required<Stats>): number {
  return Math.round(Math.sqrt(dps(s) * effectiveHp(s)));
}

// --- Ennemis ---------------------------------------------------------------

export function enemyName(district: number, wave: number): string {
  const d = districtAt(district);
  if (wave === WAVES_PER_DISTRICT) return `${d.enemies[2]} (gardien)`;
  return d.enemies[wave % 2];
}

/** Progression de difficulté : douce dans un district, saut net entre districts.
 * `district` est la profondeur absolue, sans plafond (voir districtAt). */
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

/**
 * Nombre d'ennemis simultanés. Toutes les 5 vagues (hors gardien), la vague
 * est un « contrat » et envoie plusieurs ennemis à la fois ; les districts
 * profonds (≥ 2) en envoient un de plus. Reste modeste : c'est du spectacle,
 * pas un rééquilibrage — voir la répartition de PV/dégâts dans `makeEnemies`.
 */
export function enemyCount(district: number, wave: number): number {
  if (wave % 5 !== 0 || wave >= WAVES_PER_DISTRICT) return 1;
  return district >= 2 ? 3 : 2;
}

export function waveReward(district: number, wave: number) {
  const districtMult = Math.pow(7, district);
  const boss = wave === WAVES_PER_DISTRICT ? 10 : 1;
  return {
    essence: 14 * districtMult * Math.pow(1.13, wave - 1) * boss,
    /** Chaque ennemi tué lâche déjà 1 réactif garanti (voir `advanceCombat`) : ce bonus
     * de fin de vague ne sert plus qu'à faire du gardien un vrai coup de chance. */
    reagentChance: wave === WAVES_PER_DISTRICT ? 1 : 0,
    reagent: wave === WAVES_PER_DISTRICT ? 8 + district * 2 : 0,
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

/**
 * Améliorer le laboratoire ne demande que de l'essence : les matériaux servent à
 * fabriquer, pas à bâtir. Chaque étoile de dissolution renchérit les travaux de
 * 25 % — le niveau 1 à 30 essences coûte 37,5 à une étoile.
 */
export const labUpgradeCost = (labLevel: number, stars = 0) => ({
  essence: Math.ceil(30 * Math.pow(1.42, labLevel - 1) * Math.pow(1.25, stars)),
});

/**
 * Durée des travaux : quelques secondes au début, plusieurs heures en fin de
 * parcours. C'est cette attente que les sabliers permettent de sauter.
 */
export const labUpgradeDuration = (labLevel: number) =>
  Math.round(10 * Math.pow(1.28, labLevel - 1));

/**
 * Ce que le comptoir vend contre des sacs d'or. Pas de temps ici : le temps
 * s'achète depuis l'écran qui attend (laboratoire, recherche).
 */
export const GOLD_OFFERS: { resource: 'essence' | 'reagent' | 'insight'; amount: number; base: number }[] = [
  { resource: 'reagent', amount: 10, base: 8 },
  { resource: 'essence', amount: 250, base: 12 },
  { resource: 'insight', amount: 5, base: 25 },
];

/** Le prix monte avec ce qu'on possède déjà : le comptoir dépanne, il ne nourrit pas. */
export const goldOfferCost = (
  offer: { base: number; amount: number },
  owned: number,
) => Math.ceil(offer.base * (1 + owned / (offer.amount * 12)));

/**
 * Prix en sacs d'or pour supprimer une attente. Il suit la durée restante : on
 * paie ce qu'on économise, pas un forfait.
 */
export const skipCost = (secondsLeft: number) => Math.max(1, Math.ceil(secondsLeft / 45));

/** Un seul réactif suffit à lancer une distillation, quel que soit le laboratoire : le hasard fait le reste. */
export const distillCost = (_labLevel: number) => 1;

/** Durée d'une distillation : toujours courte, 2 à 3 s, pour que fabriquer reste un geste répété et non une attente. */
export const distillDuration = (labLevel: number, mods: TechMods = NEUTRAL_MODS) =>
  Math.min(3, Math.max(2, 3 * Math.pow(0.94, labLevel - 1) * mods.distillMult));

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
  stars = 0,
): Item {
  const def = slotDef(slot);
  const p = rollPurity(labLevel, rng, mods);
  const pi = purityIndex(p);
  const mult = PURITIES[pi].mult;
  const jitter = 0.85 + rng() * 0.3;

  // Toujours deux secondaires, tirées dans le fonds commun : c'est le tirage qui
  // fait la valeur d'une pièce, pas son palier seul.
  const pool = SUB_POOL.filter((k) => k !== def.main);
  const subs: Item['subs'] = [];
  for (let i = 0; i < SUBS_PER_ITEM && pool.length; i++) {
    const key = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const scale = purityStatMult(mult, isPercent(key));
    subs.push({ key, value: round(subStatBase(key) * scale * (0.7 + rng() * 0.6)) });
  }

  // Le niveau sort de la fabrication, il n'est plus toujours 1 : le laboratoire
  // et la recherche repoussent le plafond, sans jamais dépasser 100.
  const ceiling = itemLevelCeiling(labLevel, mods);
  const level = 1 + Math.floor(rng() * ceiling);

  return {
    id,
    stars,
    // Une arme sur trois est une arme à distance : elle change la façon dont le
    // combat se joue à l'écran, sans toucher aux chiffres.
    ranged: slot === 'arme' ? rng() < 0.34 : undefined,
    slot,
    purity: p,
    level: Math.min(ITEM_LEVEL_MAX, level),
    main: {
      key: def.main,
      value: round(def.mainBase * purityStatMult(mult, isPercent(def.main)) * jitter),
    },
    subs,
  };
}

/** Niveau maximum qu'une pièce peut atteindre, toutes sources confondues. */
export const ITEM_LEVEL_MAX = 100;

/**
 * Plafond de niveau à la fabrication : le laboratoire le repousse, la recherche
 * (`itemLevelBonus`) aussi. Un laboratoire neuf ne sort que du petit niveau.
 */
export function itemLevelCeiling(labLevel: number, mods: TechMods = NEUTRAL_MODS): number {
  return Math.min(ITEM_LEVEL_MAX, Math.floor(3 + labLevel * 2.2 + mods.itemLevelBonus));
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
