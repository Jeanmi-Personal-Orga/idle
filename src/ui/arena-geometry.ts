/**
 * Géométrie de l'arène : où chacun se tient, quelle distance il couvre, et où
 * sont les boîtes de collision.
 *
 * Tout est **calculé**, rien n'est mesuré dans le DOM. Trois corrections de suite
 * ont échoué parce que la mesure portait sur le mauvais élément — un emplacement
 * de largeur nulle, un conteneur transformé — et se trompait d'une largeur de
 * sprite entière : les combattants se traversaient, ou n'avançaient plus du tout.
 *
 * Ici les tailles de sprites viennent du catalogue (`spriteSize`), la largeur de
 * la scène est la seule chose lue à l'écran, et le reste est de l'arithmétique
 * vérifiable — voir `scripts/geometry-check.mjs`.
 */

/** Marge entre le bord de la scène et le combattant qui s'y tient. */
export const EDGE = 10;

/**
 * Espace laissé entre les deux **boîtes de collision** au contact. Quelques
 * pixels : elles se touchent presque, sans se chevaucher.
 */
export const CONTACT_GAP = 4;

/**
 * Largeur de la boîte de collision, en fraction de la case du sprite.
 *
 * Les planches laissent beaucoup de vide autour du dessin, et bien plus pour les
 * créatures que pour les personnages : une boîte égale à la case entière arrêtait
 * les combattants loin l'un de l'autre. Le héros perd donc un peu de sa largeur,
 * les ennemis beaucoup — c'est ce qui les amène corps à corps.
 */
export const HERO_BOX = 0.8;
export const FOE_BOX = 0.45;

/** Vide de chaque côté du dessin, pour une largeur de case et une fraction. */
export const boxInset = (width: number, factor: number) => (width * (1 - factor)) / 2;

export interface ArenaLayout {
  /** Abscisses de départ, bord gauche de la case du sprite. */
  heroLeft: number;
  foeLeft: number;
  /** Distance que chacun couvre vers l'autre. */
  heroTravel: number;
  foeTravel: number;
  /** Vide de chaque côté, pour tracer les boîtes à l'écran. */
  heroInset: number;
  foeInset: number;
}

/**
 * Place les deux camps et répartit la marche.
 *
 * `heroShare` dit quelle part de la distance le héros couvre : la moitié quand
 * les deux avancent, tout quand il doit aller chercher un ennemi qui ne bouge pas
 * — une bestiole qui vole —, rien s'il frappe à distance.
 *
 * À l'arrivée, les deux **boîtes de collision** sont séparées d'exactement
 * `CONTACT_GAP` ; les cases des sprites, elles, peuvent se chevaucher, puisque
 * leur vide ne compte pas.
 */
export function arenaLayout(
  arenaWidth: number,
  heroWidth: number,
  foeWidth: number,
  heroShare: number,
): ArenaLayout {
  const heroLeft = EDGE;
  const foeLeft = Math.max(heroLeft + 1, arenaWidth - EDGE - foeWidth);
  const heroInset = boxInset(heroWidth, HERO_BOX);
  const foeInset = boxInset(foeWidth, FOE_BOX);
  // Bords des boîtes qui se font face, et distance libre entre eux.
  const heroBoxRight = heroLeft + heroWidth - heroInset;
  const foeBoxLeft = foeLeft + foeInset;
  const free = Math.max(0, foeBoxLeft - heroBoxRight - CONTACT_GAP);
  const heroTravel = free * heroShare;
  return { heroLeft, foeLeft, heroTravel, foeTravel: free - heroTravel, heroInset, foeInset };
}

/**
 * Écart entre deux rangs d'une même vague — et donc le pas que le héros franchit
 * quand celui de devant tombe : les rangs ne bougent pas, c'est lui qui avance
 * jusqu'au suivant, boîte contre boîte.
 */
export const fileSpacing = (foeWidth: number) =>
  Math.max(8, Math.round(foeWidth * FOE_BOX) + CONTACT_GAP);
