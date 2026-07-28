import { LAB_MAX, labUpgradeCost, labUpgradeDuration } from './lab';
import {
  PURITIES,
  SUBS_PER_ITEM,
  SUB_POOL,
  purity,
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

/**
 * Les statistiques secondaires sont des pourcentages : elles suivent la rareté de
 * façon très amortie, sinon une pièce Divine dépasserait à elle seule le plafond
 * de 100 % et les objectifs de composition perdraient tout sens.
 */
export const purityStatMult = (mult: number, percent: boolean) =>
  percent ? Math.pow(mult, 0.95) : mult;

/**
 * Multiplicateur global par étoile de dissolution. Table explicite et non
 * formule : la marche entre 4 et 5 étoiles (×15 → ×30) est voulue, une
 * exponentielle régulière ne la donnerait pas.
 */
const STAR_MULT = [1, 2, 4, 8, 15, 30];

export const starMult = (stars: number) =>
  STAR_MULT[Math.min(Math.max(0, stars), STAR_MULT.length - 1)];

/**
 * Puissance d'une pièce, telle que définie par le jeu :
 *
 *     (niveau du laboratoire × 10) × multiplicateur de rareté × multiplicateur d'étoiles
 *
 * C'est le budget que la pièce répartit ensuite sur sa statistique principale.
 * Une pièce de niveau 1 à cinq étoiles vaut donc 300, soit trente fois ce que
 * vaut la même pièce en première partie — c'est tout l'intérêt de dissoudre.
 */
export function itemPower(labLevel: number, purityId: PurityId, stars: number): number {
  return labLevel * 10 * purity(purityId).mult * starMult(stars);
}

/**
 * Part du budget de puissance qui revient à chaque emplacement. L'arme porte le
 * plus, les bottes le moins ; les pièces défensives convertissent leur part en
 * points de vie, qui se comptent en dizaines et non en unités.
 */
const SLOT_SHARE: Record<SlotId, number> = {
  arme: 1,
  objet: 0.6,
  gants: 0.5,
  bottes: 0.45,
  veste: 1,
  protection: 0.9,
  casque: 0.75,
  pantalon: 0.7,
};

/** Un point de puissance défensif vaut huit points de vie. */
const HP_PER_POWER = 8;

/**
 * Statistiques d'une pièce. Aucun multiplicateur n'est appliqué ici : le niveau
 * du laboratoire, la rareté et les étoiles sont déjà dans la valeur calculée à
 * la fabrication (voir `itemPower`). Les remultiplier compterait deux fois.
 */
export function itemStats(item: Item): Stats {
  const out: Stats = {};
  const add = (k: StatKey, v: number) => (out[k] = (out[k] ?? 0) + v);
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

/**
 * Difficulté des ennemis, recalée sur la formule de puissance.
 *
 * L'exigence d'un chapitre double presque à chaque palier (×1,9 sur les points de
 * vie **et** sur les dégâts, donc ×1,9 sur la puissance conseillée), et monte de
 * 6 % par vague à l'intérieur d'un chapitre. Les anciennes courbes montaient de
 * ×9 par chapitre : le chapitre 9 réclamait 3,8 milliards de puissance quand un
 * joueur au maximum absolu — laboratoire 40, cinq étoiles — en totalise 60
 * millions. La progression était donc murée dès le sixième chapitre.
 *
 * Repères visés, avec l'équipement médian du niveau de laboratoire :
 *
 * | Étape | Puissance | Chapitre atteint |
 * | --- | --- | --- |
 * | laboratoire 5, sans étoile | 550 | 1 à 2 |
 * | laboratoire 20, sans étoile | 10 000 | 5 |
 * | laboratoire 40, sans étoile | 1,3 M | 13 |
 * | laboratoire 40, cinq étoiles | 60 M | 19 |
 *
 * `district` est la profondeur absolue, sans plafond (voir districtAt).
 */
const CHAPTER_STEP = 1.9;
const WAVE_STEP = 1.06;
const GUARDIAN_SCALE = 4;

export function enemyHp(district: number, wave: number): number {
  const boss = wave === WAVES_PER_DISTRICT ? GUARDIAN_SCALE : 1;
  return 90 * Math.pow(CHAPTER_STEP, district) * Math.pow(WAVE_STEP, wave - 1) * boss;
}

export function enemyDamage(district: number, wave: number): number {
  return 20 * Math.pow(CHAPTER_STEP, district) * Math.pow(WAVE_STEP, wave - 1);
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

/**
 * Butin d'une vague. Il suit **exactement** la pente de la difficulté (×1,9 par
 * chapitre) : à ×2,4, une seule vague de chapitre 16 payait un niveau de
 * laboratoire entier et l'essence perdait tout sens en fin de partie.
 */
export function waveReward(district: number, wave: number) {
  const districtMult = Math.pow(CHAPTER_STEP, district);
  const boss = wave === WAVES_PER_DISTRICT ? 10 : 1;
  return {
    essence: 25 * districtMult * Math.pow(1.08, wave - 1) * boss,
    /** Chaque ennemi tué lâche déjà 1 réactif garanti (voir `advanceCombat`) : ce bonus
     * de fin de vague ne sert plus qu'à faire du gardien un vrai coup de chance. */
    reagentChance: wave === WAVES_PER_DISTRICT ? 1 : 0,
    reagent: wave === WAVES_PER_DISTRICT ? 8 + district * 2 : 0,
  };
}

/**
 * Puissance recommandée face à une vague : la même moyenne géométrique que celle
 * du héros, appliquée aux chiffres de l'ennemi. Les deux valeurs se comparent
 * donc directement — au-dessus, ça passe ; en dessous, on encaisse mal.
 */
export function recommendedPower(district: number, wave: number, scale = 1): number {
  const hp = enemyHp(district, wave) * scale;
  const dps = (enemyDamage(district, wave) * scale) / enemyInterval();
  return Math.round(Math.sqrt(dps * hp) * 1.35);
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
 * Ce que le comptoir vend contre des sacs d'or. Pas de temps ici : le temps
 * s'achète depuis l'écran qui attend (laboratoire, recherche).
 */
export const GOLD_OFFERS: {
  resource: 'essence' | 'reagent' | 'insight';
  amount: number;
  base: number;
}[] = [
  { resource: 'reagent', amount: 10, base: 8 },
  { resource: 'essence', amount: 250, base: 12 },
  { resource: 'insight', amount: 5, base: 25 },
];

/** Le prix monte avec ce qu'on possède déjà : le comptoir dépanne, il ne nourrit pas. */
export const goldOfferCost = (offer: { base: number; amount: number }, owned: number) =>
  Math.ceil(offer.base * (1 + owned / (offer.amount * 12)));

/**
 * Prix en sacs d'or pour supprimer une attente. Il suit la durée restante : on
 * paie ce qu'on économise, pas un forfait.
 */
// Réexportée pour l'interface, mais définie dans un module feuille : l'arbre de
// recherche l'utilise, et l'importer d'ici fermait un cycle (voir skip.ts).
export { skipCost } from './skip';

/** Un seul réactif suffit à lancer une distillation, quel que soit le laboratoire : le hasard fait le reste. */
export const distillCost = (_labLevel: number) => 1;

/** Durée d'une distillation : toujours courte, 2 à 3 s, pour que fabriquer reste un geste répété et non une attente. */
export const distillDuration = (labLevel: number, mods: TechMods = NEUTRAL_MODS) =>
  Math.min(3, Math.max(2, 3 * Math.pow(0.94, labLevel - 1) * mods.distillMult));

/**
 * Probabilités de pureté par niveau de laboratoire, en pourcentage, dans l'ordre
 * Trouble → Divin. Chaque ligne fait 100.
 *
 * Table explicite, et non courbe calculée : les paliers de déblocage (le
 * Prismatique au 2, l'Éthéré au 5, le Divin au 25) et les disparitions (le
 * Trouble au 19, le Clair au 30) sont des décisions de design, pas le produit
 * d'une gaussienne.
 */
const PURITY_TABLE: number[][] = [
  [85, 15, 0, 0, 0, 0, 0, 0],
  [78, 21.5, 0.5, 0, 0, 0, 0, 0],
  [70, 28.8, 1.2, 0, 0, 0, 0, 0],
  [62, 35.5, 2.5, 0, 0, 0, 0, 0],
  [55, 40.5, 4, 0.5, 0, 0, 0, 0],
  [48, 45, 6, 1, 0, 0, 0, 0],
  [42, 48.2, 8, 1.8, 0, 0, 0, 0],
  [36, 51, 10.3, 2.7, 0, 0, 0, 0],
  [30, 53.2, 13, 3.8, 0, 0, 0, 0],
  [25, 54, 15.5, 5, 0.5, 0, 0, 0],
  [20, 55, 17.8, 6.2, 1, 0, 0, 0],
  [16, 55.2, 20, 7.3, 1.5, 0, 0, 0],
  [12, 55, 22, 8.8, 2.2, 0, 0, 0],
  [8, 54, 24, 10.5, 3.5, 0, 0, 0],
  [5, 52, 25.8, 12, 5, 0.2, 0, 0],
  [3, 49, 27.5, 13.5, 6.5, 0.5, 0, 0],
  [1.5, 45, 29, 15, 8.5, 1, 0, 0],
  [0.5, 41, 30, 16.5, 10.2, 1.8, 0, 0],
  [0, 37, 30.5, 18, 12, 2.5, 0, 0],
  [0, 33, 30, 19.3, 13.5, 4, 0.2, 0],
  [0, 29, 29, 20.5, 15, 5.8, 0.7, 0],
  [0, 25, 28, 21.5, 16.5, 7.5, 1.5, 0],
  [0, 21, 27, 22, 18, 9.5, 2.5, 0],
  [0, 17, 25.5, 22.5, 19.5, 11.5, 4, 0],
  [0, 13, 24, 22.5, 20.8, 13.5, 6, 0.2],
  [0, 10, 22, 22, 22, 15.5, 8, 0.5],
  [0, 7, 20, 21, 23, 17.5, 10.5, 1],
  [0, 4, 18, 19.5, 23.5, 19.5, 13.5, 2],
  [0, 2, 16, 17.5, 23.8, 21.2, 16, 3.5],
  [0, 0, 14, 15, 23.5, 22.5, 19, 6],
  [0, 0, 11, 13, 22, 24, 21, 9],
  [0, 0, 8, 11, 20, 25, 23, 13],
  [0, 0, 5, 8.5, 17.5, 25.5, 25.5, 18],
  [0, 0, 3, 6, 14, 25, 28, 24],
  [0, 0, 1, 4, 10, 23, 31, 31],
  [0, 0, 0, 2, 7, 20, 33, 38],
  [0, 0, 0, 0, 4, 15, 36, 45],
  [0, 0, 0, 0, 2, 10, 36, 52],
  [0, 0, 0, 0, 0, 5, 35, 60],
  [0, 0, 0, 0, 0, 0, 30, 70],
];

/**
 * Probabilités de pureté à un niveau donné. Les bonus de recherche et de legs
 * (`purityBias`) font **lire la table plus haut** : un bias de 3 donne les
 * chances du niveau 3 au-dessus, sans jamais dépasser la dernière ligne.
 */
export function purityWeights(labLevel: number, mods: TechMods = NEUTRAL_MODS): number[] {
  const row = Math.round(labLevel + mods.purityBias);
  const index = Math.min(PURITY_TABLE.length, Math.max(1, row)) - 1;
  return PURITY_TABLE[index];
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

  // Le niveau d'une pièce est celui du laboratoire qui l'a produite — la
  // recherche (« Moules affinés ») en offre quelques-uns de plus. C'est ce
  // niveau qui entre dans la formule de puissance.
  const level = Math.min(ITEM_LEVEL_MAX, labLevel + Math.floor(mods.itemLevelBonus / 4));

  // Budget de puissance de la pièce, réparti selon l'emplacement. Les pièces
  // défensives le convertissent en points de vie.
  const budget = itemPower(level, p, stars) * SLOT_SHARE[slot] * jitter;
  const mainValue = def.main === 'health' ? budget * HP_PER_POWER : budget;

  return {
    id,
    stars,
    // Une arme sur trois est une arme à distance : elle change la façon dont le
    // combat se joue à l'écran, sans toucher aux chiffres.
    ranged: slot === 'arme' ? rng() < 0.34 : undefined,
    slot,
    purity: p,
    level,
    main: { key: def.main, value: round(mainValue) },
    subs,
  };
}

/** Niveau maximum d'une pièce : celui du laboratoire, qui plafonne à 40. */
export const ITEM_LEVEL_MAX = LAB_MAX;

// Réexport pour les appelants historiques : les tables vivent dans `lab.ts`.
export { LAB_MAX, labUpgradeCost, labUpgradeDuration };

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
