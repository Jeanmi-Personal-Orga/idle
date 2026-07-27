/**
 * Personnages jouables, tirés des sprites HD livrés dans `hd/characters/`.
 *
 * Le choix est **purement cosmétique** : aucune statistique ne change. C'est
 * volontaire — l'équilibrage a été simulé sur 72 h, et lui coller des bonus par
 * personnage rendrait un choix fait à la première minute, sans information,
 * irrattrapable.
 */
export type CharacterId = 'alchimiste' | 'docker-noye' | 'ferrailleur' | 'contremaitre';

/**
 * Portée d'un combattant. Elle décide de la chorégraphie : un combattant au
 * corps à corps traverse l'arène pour frapper, un combattant à distance reste
 * en place et projette.
 */
export type CombatStyle = 'melee' | 'ranged';

export interface Character {
  id: CharacterId;
  name: string;
  /** Ce qu'il était avant de descendre distiller dans la ville noyée. */
  blurb: string;
  style: CombatStyle;
  /** Comment son attaque se lit, en une ligne, dans le sélecteur. */
  styleLabel: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'alchimiste',
    name: "L'Alchimiste",
    blurb: 'Masque à filtre, bandoulière de fioles, une lanterne à la ceinture.',
    style: 'ranged',
    styleLabel: 'À distance — il jette ses fioles sans approcher.',
  },
  {
    id: 'docker-noye',
    name: 'Le Docker noyé',
    blurb: "Il a porté des caisses sur ces quais avant que l'eau ne monte.",
    style: 'melee',
    styleLabel: "Corps à corps — il marche jusqu'à sa cible.",
  },
  {
    id: 'ferrailleur',
    name: 'La Ferrailleuse',
    blurb: 'Elle démonte la ville pièce par pièce, et distille le reste.',
    style: 'melee',
    styleLabel: "Corps à corps — elle marche jusqu'à sa cible.",
  },
  {
    id: 'contremaitre',
    name: 'Le Contremaître',
    blurb: 'Une carrure de grue. La brume ne lui a pas encore pris la voix.',
    style: 'melee',
    styleLabel: "Corps à corps — il marche jusqu'à sa cible.",
  },
];

export const characterDef = (id: CharacterId) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/**
 * Portée par sprite, ennemis compris. Tous les habitants transformés se battent
 * au contact ; seul l'alchimiste tient l'ennemi à distance, ce qui rend son
 * choix visible en combat sans toucher à une seule statistique.
 */
const STYLES: Record<string, CombatStyle> = {
  alchimiste: 'ranged',
  'docker-noye': 'melee',
  ferrailleur: 'melee',
  contremaitre: 'melee',
  'rat-de-cale': 'melee',
};

export const spriteStyle = (sprite: string): CombatStyle => STYLES[sprite] ?? 'melee';

/** Personnage par défaut des sauvegardes antérieures au choix. */
export const DEFAULT_CHARACTER: CharacterId = 'alchimiste';
