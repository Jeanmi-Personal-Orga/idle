/** Types du domaine — L'Alchimiste de Brume. */

/** Identifiants des statistiques. Les valeurs sont des pourcentages sauf power/health. */
export type StatKey =
  | 'power' // Puissance : dégâts par frappe
  | 'health' // Intégrité : points de vie max
  | 'volatility' // Volatilité : vitesse d'attaque (%)
  | 'chain' // Réaction en chaîne : chance de seconde frappe (%)
  | 'osmosis' // Osmose : vol de vie (%)
  | 'condensation' // Condensation : régénération par seconde (% des PV max)
  | 'clairvoyance' // Clairvoyance : chance de critique (%)
  | 'rupture'; // Rupture : dégâts critiques bonus (%)

export type Stats = Partial<Record<StatKey, number>>;

/** Palier de pureté d'un élixir. Index dans PURITIES. */
export type PurityId =
  | 'trouble'
  | 'clair'
  | 'prismatique'
  | 'ethere'
  | 'quintessence'
  | 'absolu';

export type SlotId = 'flacon' | 'manteau' | 'lentille' | 'gantelet';

export interface Item {
  id: string;
  slot: SlotId;
  purity: PurityId;
  level: number;
  /** Statistique principale, dictée par le slot. */
  main: { key: StatKey; value: number };
  /** Statistiques secondaires tirées aléatoirement à la distillation. */
  subs: { key: StatKey; value: number }[];
}

export interface Distillation {
  slot: SlotId;
  /** Temps restant en secondes. */
  remaining: number;
  total: number;
}

export interface Resources {
  essence: number;
  reagent: number;
  /** Monnaie de recherche, dépensée dans l'arbre. */
  insight: number;
  /** Monnaie de méta-progression (ascension). */
  shard: number;
}

export interface Hero {
  hp: number;
  /** Temps restant avant la prochaine frappe, en secondes. */
  cooldown: number;
}

export interface Enemy {
  hp: number;
  maxHp: number;
  damage: number;
  cooldown: number;
  interval: number;
  name: string;
}

export interface CombatState {
  district: number;
  wave: number;
  /** Meilleure vague atteinte dans le district courant. */
  best: number;
  hero: Hero;
  enemy: Enemy;
  /** Vrai pendant la pause qui suit une mort. */
  reviving: number;
}

export interface GameState {
  version: number;
  resources: Resources;
  labLevel: number;
  /** Niveau atteint par nœud de l'arbre de recherche (voir tech.ts). */
  tech: Record<string, number>;
  equipped: Partial<Record<SlotId, Item>>;
  stash: Item[];
  distilling: Distillation | null;
  combat: CombatState;
  /** Horodatage du dernier tick, pour la progression hors-ligne. */
  lastSeen: number;
  /** Moyenne glissante d'essence par seconde, utilisée pour l'offline. */
  essenceRate: number;
  log: string[];
}
