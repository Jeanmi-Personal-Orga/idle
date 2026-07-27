import manifest from './sprites-manifest.json';

/**
 * Accès au manifeste des sprites HD (`hd/manifest.json`). Séparé du composant
 * de rendu : c'est de la donnée, et les vues en ont besoin pour dimensionner.
 */

export interface AnimData {
  frames: number;
  frameWidth: number;
  frameHeight: number;
  file: string;
}

const CHARACTERS = manifest.characters as Record<string, Record<string, AnimData>>;

/** Première animation trouvée dans la liste, sinon `idle`. */
export function animData(character: string, wanted: string[]): AnimData | null {
  const set = CHARACTERS[character];
  if (!set) return null;
  for (const a of wanted) if (set[a]) return set[a];
  return set.idle ?? null;
}

export const hasCharacter = (character: string) => Boolean(CHARACTERS[character]);
