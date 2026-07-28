/**
 * Géométrie de l'arène : où chacun se tient, et quelle distance il couvre.
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
 * Espace laissé entre les deux sprites au contact. Quelques pixels : ils se
 * touchent presque, sans se chevaucher.
 */
export const CONTACT_GAP = 6;

export interface ArenaLayout {
  /** Abscisses de départ, bord gauche du sprite. */
  heroLeft: number;
  foeLeft: number;
  /** Distance que chacun couvre vers l'autre. */
  heroTravel: number;
  foeTravel: number;
}

/**
 * Place les deux camps et répartit la marche.
 *
 * `heroShare` dit quelle part de la distance le héros couvre : la moitié quand
 * les deux avancent, tout quand il doit aller chercher un ennemi qui ne bouge pas
 * — une bestiole qui vole —, rien s'il frappe à distance.
 *
 * À l'arrivée, les deux sprites sont séparés d'exactement `CONTACT_GAP`.
 */
export function arenaLayout(
  arenaWidth: number,
  heroWidth: number,
  foeWidth: number,
  heroShare: number,
): ArenaLayout {
  const heroLeft = EDGE;
  const foeLeft = Math.max(heroLeft + heroWidth, arenaWidth - EDGE - foeWidth);
  // Distance libre entre les deux corps, l'écart de contact déduit.
  const free = Math.max(0, foeLeft - (heroLeft + heroWidth) - CONTACT_GAP);
  const heroTravel = free * heroShare;
  return { heroLeft, foeLeft, heroTravel, foeTravel: free - heroTravel };
}

/**
 * Écart entre deux rangs d'une même vague : une fraction de la largeur du sprite,
 * pour que la file reste groupée sans que les corps se confondent.
 */
export const fileSpacing = (foeWidth: number) => Math.round(foeWidth * 0.45);
