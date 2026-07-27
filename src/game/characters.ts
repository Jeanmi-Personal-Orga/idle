/**
 * Personnages jouables, tirés des planches 32 × 32 du dossier `assets/`.
 *
 * Le choix ne touche à aucune statistique : l'équilibrage a été simulé sur 72 h,
 * et des bonus par personnage rendraient irrattrapable une décision prise à la
 * première minute, sans information. Seule la silhouette change.
 */
export type CharacterId = 'fighter' | 'barbarian' | 'knight-a' | 'knight-b';

/**
 * Portée d'un combattant. Elle décide de la chorégraphie : un combattant au
 * corps à corps traverse l'arène pour frapper, un combattant à distance reste
 * en place et projette.
 */
export type CombatStyle = 'melee' | 'ranged';

export interface Character {
  id: CharacterId;
  name: string;
  /** Ce qu'il était avant de descendre dans la ville noyée. */
  blurb: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'fighter',
    name: 'Le Vétéran',
    blurb: "Épée courte et gambison. Il connaît les quais mieux que personne.",
  },
  {
    id: 'barbarian',
    name: 'La Barbare',
    blurb: 'Elle frappe fort et lentement, et la brume ne lui fait pas peur.',
  },
  {
    id: 'knight-a',
    name: 'Le Chevalier',
    blurb: "Armure complète, ce qui est discutable dans une ville sous l'eau.",
  },
  {
    id: 'knight-b',
    name: 'La Sentinelle',
    blurb: 'Elle montait la garde sur le dernier pont resté debout.',
  },
];

export const characterDef = (id: CharacterId) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/**
 * Portée par sprite. Les quatre jouables se battent au contact — ce sont des
 * lames. Les bestioles volantes, elles, tiennent leurs distances : c'est ce qui
 * force le joueur à traverser l'arène pour aller les chercher.
 */
const RANGED = new Set(['araignee', 'abeille', 'papillon', 'hibou']);

export const spriteStyle = (sprite: string): CombatStyle =>
  RANGED.has(sprite) ? 'ranged' : 'melee';

/** Personnage par défaut quand une sauvegarde n'en désigne aucun de valide. */
export const DEFAULT_CHARACTER: CharacterId = 'fighter';
