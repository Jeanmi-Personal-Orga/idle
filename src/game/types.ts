/** Types du domaine — L'Alchimiste de Brume. */

import type { CharacterId } from './characters';

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

/**
 * Huit emplacements. Quatre donnent des dégâts, quatre donnent des points de
 * vie ; dans les deux cas les statistiques secondaires sont tirées au hasard.
 */
export type SlotId =
  | 'arme'
  | 'gants'
  | 'bottes'
  | 'objet'
  | 'veste'
  | 'casque'
  | 'pantalon'
  | 'protection';

export interface Item {
  id: string;
  /**
   * Étoiles gagnées par dissolution : une pièce forgée après deux dissolutions
   * porte deux étoiles et tape bien plus fort qu'une pièce sans étoile.
   */
  stars: number;
  slot: SlotId;
  purity: PurityId;
  level: number;
  /** Statistique principale, dictée par le slot. */
  main: { key: StatKey; value: number };
  /** Statistiques secondaires tirées aléatoirement à la distillation. */
  subs: { key: StatKey; value: number }[];
  /**
   * Armes seulement : une arme à distance frappe sans avancer, une arme de mêlée
   * oblige à traverser l'arène. Tiré à la fabrication.
   */
  ranged?: boolean;
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
  /** Rare : permet de terminer instantanément une fabrication ou des travaux. */
  catalyst: number;
  /** Tombe au combat, indépendamment de l'essence : la seule monnaie du comptoir. */
  goldCoin: number;
}

export interface Ascension {
  /** Nombre de dissolutions effectuées. */
  count: number;
  /** Niveau atteint par legs permanent (voir ascension.ts). */
  legacies: Record<string, number>;
  /** District le plus profond jamais atteint, toutes dissolutions confondues. */
  deepest: number;
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
  /** Sprite à afficher pour cet ennemi précis (voir `enemySprite`). */
  sprite: string;
}

export interface CombatState {
  district: number;
  wave: number;
  /** Meilleure vague atteinte dans le district courant. */
  best: number;
  hero: Hero;
  /** Toujours au moins un ennemi. Ordre = priorité de ciblage du héros. */
  enemies: Enemy[];
  /** Vrai pendant la pause qui suit une mort. */
  reviving: number;
  /**
   * Secondes restantes avant que les combattants soient au contact. Tant que ce
   * compte n'est pas écoulé, personne ne frappe : l'affichage et la simulation
   * racontent la même chose, et plus aucun coup ne part de l'autre bout de
   * l'arène.
   */
  closing: number;
}

/**
 * Ce que la boucle garde. Listes vides = tout est gardé : un filtre qu'on n'a
 * pas réglé ne doit rien jeter.
 */
export interface LoopFilters {
  /** Paliers conservés. */
  tiers: PurityId[];
  /**
   * Statistiques secondaires conservées. Une seule correspondance suffit : une
   * pièce dont une des deux secondaires est cochée part en réserve.
   */
  subs: StatKey[];
}

export interface GameState {
  version: number;
  /** Personnage choisi au début de l'aventure ; null tant qu'il ne l'est pas. */
  character: CharacterId | null;
  resources: Resources;
  labLevel: number;
  /** Niveau atteint par nœud de l'arbre de recherche (voir tech.ts). */
  tech: Record<string, number>;
  ascension: Ascension;
  equipped: Partial<Record<SlotId, Item>>;
  stash: Item[];
  distilling: Distillation | null;
  /** Relance une distillation (pièce au hasard) dès que la précédente se termine, tant qu'il reste des réactifs. */
  autoDistill: boolean;
  /**
   * Filtres de la fabrication en boucle. Une pièce qui correspond part en
   * réserve, les autres sont dissoutes sur-le-champ — sinon la boucle noie la
   * réserve en quelques minutes.
   */
  loopFilters: LoopFilters;
  /** Amélioration du laboratoire en cours, minutée elle aussi. */
  labUpgrading: { remaining: number; total: number } | null;
  /** Recherche en cours (un seul nœud à la fois), minutée. */
  researching: { id: string; remaining: number; total: number } | null;
  combat: CombatState;
  /** Horodatage du dernier tick, pour la progression hors-ligne. */
  lastSeen: number;
  /** Moyenne glissante d'essence par seconde, utilisée pour l'offline. */
  essenceRate: number;
  log: string[];
}
