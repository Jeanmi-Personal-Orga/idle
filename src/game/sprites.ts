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

/**
 * Une bande d'animation : un fichier par animation, les frames alignées
 * horizontalement. C'est le format des packs d'ennemis (chauve-souris,
 * champignon, golem, squelette), dont la largeur de frame diffère d'un pack à
 * l'autre alors que la hauteur est toujours 64.
 */
function strip(sheet: string, frameW: number, frames: number, fps: number, loop = true): SpriteAnim {
  return {
    sheet,
    cell: [frameW, 64],
    cells: Array.from({ length: frames }, (_, i) => [i, 0] as [number, number]),
    fps,
    loop,
  };
}

/**
 * Un ennemi animé du dossier `foes/<nom>/` : cinq bandes, une par état. Les
 * nombres de frames sont propres à chaque pack, d'où la table explicite.
 */
function beast(
  dir: string,
  frameW: number,
  counts: { idle: number; walk: number; attack: number; hurt: number; death: number },
): Record<string, SpriteAnim> {
  const at = (name: string) => `/sprites/foes/${dir}/${name}.png`;
  return {
    idle: strip(at('idle'), frameW, counts.idle, 8),
    walk: strip(at('walk'), frameW, counts.walk, 10),
    attack: strip(at('attack'), frameW, counts.attack, 14, false),
    hurt: strip(at('hurt'), frameW, counts.hurt, 12, false),
    death: strip(at('death'), frameW, counts.death, 10, false),
  };
}

/** Toutes les créatures du jeu, personnages jouables compris. */
export const SPRITES: Record<string, Record<string, SpriteAnim>> = {
  // Jouables — et gardiens de fin de district.
  fighter: character('fighter'),
  barbarian: character('barbarian'),
  'knight-a': character('knight-a'),
  'knight-b': character('knight-b'),

  // Ennemis animés, un dossier de bandes chacun.
  'chauve-souris': beast('bat', 64, { idle: 9, walk: 8, attack: 8, hurt: 5, death: 12 }),
  champignon: beast('mushroom', 80, { idle: 7, walk: 8, attack: 10, hurt: 5, death: 15 }),
  golem: beast('golem', 90, { idle: 8, walk: 10, attack: 11, hurt: 4, death: 13 }),
  squelette: beast('skeleton', 96, { idle: 8, walk: 10, attack: 10, hurt: 5, death: 13 }),

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

/**
 * Part de vide à gauche et à droite du dessin, en fraction de la largeur de la
 * case. **Mesurée dans les images** par `scripts/hitboxes.mjs`, pas estimée : les
 * planches n'ont pas la même marge du tout — une chauve-souris de 64 px est
 * presque pleine, un squelette dessiné dans 96 px flotte au milieu, et un slime
 * touche les deux bords de sa case.
 *
 * C'est ce qui donne la boîte de collision de chaque créature. Un pourcentage
 * unique pour tout le monde faisait que certains mobs se frappaient à distance
 * et que d'autres se traversaient.
 */
export const HITBOX_INSETS: Record<string, [number, number]> = {
  fighter: [0.28, 0.25],
  barbarian: [0.28, 0.28],
  'knight-a': [0.28, 0.28],
  'knight-b': [0.28, 0.28],
  'chauve-souris': [0.23, 0.23],
  champignon: [0.31, 0.31],
  golem: [0.29, 0.29],
  squelette: [0.35, 0.29],
  // Les slimes remplissent leur case en largeur : aucune marge à retirer.
  'slime-vert': [0, 0],
  'slime-ambre': [0, 0],
  'slime-rouge': [0, 0],
  'slime-rouille': [0, 0],
  'slime-rose': [0, 0],
  'slime-violet': [0, 0],
  'slime-bleu': [0, 0],
  'slime-blanc': [0, 0],
  'slime-gris': [0, 0],
  'slime-brun': [0, 0],
};

/** Repli pour une créature non mesurée : marge modérée, plutôt que rien. */
const DEFAULT_INSETS: [number, number] = [0.25, 0.25];

/**
 * Bord avant du dessin, en fraction de la largeur de la case, du point de vue de
 * qui avance. Le héros regarde à droite : son avant est son bord droit. Les
 * ennemis sont retournés à l'affichage, donc leur bord gauche visible est le bord
 * **droit** de l'image d'origine — d'où la même valeur dans les deux cas.
 */
export function spriteFront(id: string, flipped: boolean): number {
  const inset = (HITBOX_INSETS[id] ?? DEFAULT_INSETS)[1];
  return flipped ? inset : 1 - inset;
}

/** Hauteur d'affichage visée par famille, pour que les gabarits restent justes. */
export function spriteHeight(id: string): number {
  const cell = SPRITES[id]?.idle.cell;
  if (!cell) return 96;
  if (cell[1] === 32) return 96; // personnages jouables : 32 px × 3
  if (cell[1] === 64) return 104; // ennemis animés : bandes de 64 px de haut
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
