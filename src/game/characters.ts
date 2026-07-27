/**
 * Personnages jouables, tirés des sprites HD livrés dans `hd/characters/`.
 *
 * Le choix est **purement cosmétique** : aucune statistique ne change. C'est
 * volontaire — l'équilibrage a été simulé sur 72 h, et lui coller des bonus par
 * personnage rendrait un choix fait à la première minute, sans information,
 * irrattrapable.
 */
export type CharacterId = 'alchimiste' | 'docker-noye' | 'ferrailleur' | 'contremaitre';

export interface Character {
  id: CharacterId;
  name: string;
  /** Ce qu'il était avant de descendre distiller dans la ville noyée. */
  blurb: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'alchimiste',
    name: "L'Alchimiste",
    blurb: 'Masque à filtre, bandoulière de fioles, une lanterne à la ceinture.',
  },
  {
    id: 'docker-noye',
    name: 'Le Docker noyé',
    blurb: "Il a porté des caisses sur ces quais avant que l'eau ne monte.",
  },
  {
    id: 'ferrailleur',
    name: 'La Ferrailleuse',
    blurb: 'Elle démonte la ville pièce par pièce, et distille le reste.',
  },
  {
    id: 'contremaitre',
    name: 'Le Contremaître',
    blurb: 'Une carrure de grue. La brume ne lui a pas encore pris la voix.',
  },
];

export const characterDef = (id: CharacterId) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/** Personnage par défaut des sauvegardes antérieures au choix. */
export const DEFAULT_CHARACTER: CharacterId = 'alchimiste';
