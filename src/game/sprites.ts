/**
 * Catalogue des sprites, à partir des planches du dossier `assets/`.
 *
 * Deux formats cohabitent, donc une animation est décrite par la liste
 * explicite des cases qu'elle traverse :
 *
 * - les personnages sont des planches 32 × 32, une ligne par animation ;
 * - les ennemis sont des bandes horizontales, un fichier par animation, dont la
 *   largeur de case diffère d'un pack à l'autre.
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
  // Variantes de couleur des mêmes packs : de la variété à l'écran sans ajouter
  // de dépendance à une planche qu'on ne peut pas redistribuer.
  'golem-ambre': beast('golem-orange', 90, { idle: 8, walk: 10, attack: 11, hurt: 4, death: 13 }),
  'squelette-pale': beast('skeleton-yellow', 96, {
    idle: 8,
    walk: 10,
    attack: 10,
    hurt: 5,
    death: 13,
  }),
  // Rôdeur volant : il ne pose pas les pieds au sol et frappe à distance.
  rodeur: beast('stalker', 64, { idle: 8, walk: 8, attack: 12, hurt: 4, death: 17 }),
};

/** Hauteur d'affichage visée par famille, pour que les gabarits restent justes. */
export function spriteHeight(id: string): number {
  const cell = SPRITES[id]?.idle.cell;
  if (!cell) return 96;
  if (cell[1] === 32) return 96; // personnages jouables : 32 px × 3
  return 104; // ennemis animés : bandes de 64 px de haut
}

/**
 * Taille d'affichage d'un sprite, en pixels — **calculée**, pas mesurée. C'est ce
 * qui permet de placer les combattants à l'arithmétique plutôt qu'en interrogeant
 * le DOM : trois tentatives de mesure de suite se sont trompées d'une largeur de
 * sprite, faute de savoir quel élément portait réellement la boîte.
 */
export function spriteSize(id: string, scale = 1): { width: number; height: number } {
  const cell = SPRITES[id]?.idle.cell ?? [32, 32];
  const zoom = (spriteHeight(id) / cell[1]) * scale;
  return { width: cell[0] * zoom, height: cell[1] * zoom };
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
