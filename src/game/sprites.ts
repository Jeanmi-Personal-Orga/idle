/**
 * Catalogue des sprites, à partir des planches du dossier `assets/`.
 *
 * Deux formats cohabitent, donc une animation est décrite par la liste
 * explicite des cases qu'elle traverse :
 *
 * - les personnages sont des planches 32 × 32, une ligne par animation ;
 * - les slimes et bestioles sont des icônes 96 × 96, dont les poses ne sont pas
 *   contiguës (un slime debout ligne 1, écrasé ligne 3) — d'où les cases une à
 *   une plutôt qu'un simple décalage.
 */

export interface SpriteAnim {
  sheet: string;
  /** Taille d'une case de la planche, en pixels. */
  cell: [number, number];
  /** Cases traversées, dans l'ordre : [colonne, ligne]. */
  cells: [number, number][];
  /** Images par seconde conseillées. */
  fps: number;
  loop: boolean;
}

const CHAR_CELL: [number, number] = [32, 32];

/** Une ligne complète d'une planche de personnage. */
function row(sheet: string, r: number, frames: number, fps = 8, loop = true): SpriteAnim {
  return {
    sheet,
    cell: CHAR_CELL,
    cells: Array.from({ length: frames }, (_, i) => [i, r] as [number, number]),
    fps,
    loop,
  };
}

/**
 * Disposition commune aux quatre planches de personnages : 10 × 7 cases,
 * une ligne par animation.
 */
function character(file: string): Record<string, SpriteAnim> {
  const sheet = `/sprites/chars/${file}.png`;
  return {
    idle: row(sheet, 0, 3, 5),
    walk: row(sheet, 1, 4, 6),
    run: row(sheet, 2, 4, 12),
    attack: row(sheet, 3, 7, 14, false),
    attack2: row(sheet, 4, 9, 14, false),
    hurt: row(sheet, 5, 3, 10, false),
    death: row(sheet, 6, 4, 7, false),
  };
}

const SLIMES = '/sprites/foes/slimes.png';
const CRITTERS = '/sprites/foes/critters.png';
const FOE_CELL: [number, number] = [96, 96];

/**
 * Un slime : deux poses, debout puis écrasé, qui font un rebond une fois
 * enchaînées. `index` va de 0 à 9, dans l'ordre de la planche.
 */
function slime(index: number): Record<string, SpriteAnim> {
  const col = 1 + (index % 5);
  const line = 1 + Math.floor(index / 5);
  const bounce: SpriteAnim = {
    sheet: SLIMES,
    cell: FOE_CELL,
    cells: [
      [col, line],
      [col, line + 2],
    ],
    fps: 3,
    loop: true,
  };
  return { idle: bounce, attack: { ...bounce, fps: 9 }, hurt: bounce, death: bounce };
}

/** Une bestiole : une seule pose, animée par un léger flottement en CSS. */
function critter(col: number, line: number): Record<string, SpriteAnim> {
  const still: SpriteAnim = {
    sheet: CRITTERS,
    cell: FOE_CELL,
    cells: [[col, line]],
    fps: 1,
    loop: true,
  };
  return { idle: still, attack: still, hurt: still, death: still };
}

/** Toutes les créatures du jeu, personnages jouables compris. */
export const SPRITES: Record<string, Record<string, SpriteAnim>> = {
  // Jouables — et gardiens de fin de district.
  fighter: character('fighter'),
  barbarian: character('barbarian'),
  'knight-a': character('knight-a'),
  'knight-b': character('knight-b'),

  // Slimes, dans l'ordre de la planche.
  'slime-vert': slime(0),
  'slime-ambre': slime(1),
  'slime-rouge': slime(2),
  'slime-rouille': slime(3),
  'slime-rose': slime(4),
  'slime-violet': slime(5),
  'slime-bleu': slime(6),
  'slime-blanc': slime(7),
  'slime-gris': slime(8),
  'slime-brun': slime(9),

  // Bestioles : ligne 1 = araignée, coccinelle, abeille, papillon, escargot, ver.
  araignee: critter(1, 1),
  coccinelle: critter(2, 1),
  abeille: critter(3, 1),
  papillon: critter(4, 1),
  escargot: critter(5, 1),
  ver: critter(6, 1),
  // Ligne 2 = grenouille, rat, chat, hibou, lapin.
  grenouille: critter(1, 2),
  rat: critter(2, 2),
  chat: critter(3, 2),
  hibou: critter(4, 2),
  lapin: critter(5, 2),
};

/** Hauteur d'affichage visée par famille, pour que les gabarits restent justes. */
export function spriteHeight(id: string): number {
  if (SPRITES[id]?.idle.cell[0] === 32) return 96; // personnages : 32 px × 3
  return 64; // icônes 96 px, dont le dessin n'occupe qu'une partie
}

export function animData(id: string, wanted: string[]): SpriteAnim | null {
  const set = SPRITES[id];
  if (!set) return null;
  for (const a of wanted) if (set[a]) return set[a];
  return set.idle ?? null;
}

export const hasCharacter = (id: string) => Boolean(SPRITES[id]);

/** Couches du décor, de la plus lointaine à la plus proche. */
export const BACKGROUND_LAYERS = [1, 2, 3, 4, 5].map((i) => `/sprites/bg/forest-${i}.png`);
