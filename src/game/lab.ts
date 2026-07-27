/**
 * Tables du laboratoire : coût et durée de chaque niveau.
 *
 * Module **feuille** : il n'importe rien du jeu. C'est volontaire — `formulas`,
 * `ascension` et l'interface en ont tous besoin, et un import croisé entre eux
 * laissait ces constantes indéfinies à l'initialisation (l'application ne
 * s'affichait plus du tout).
 */

/**
 * Coût en essence pour **atteindre** chaque niveau du laboratoire, du 1 au 40.
 * Table explicite plutôt que formule : la courbe est voulue par paliers de
 * phases, et une exponentielle ne la reproduirait pas.
 */
const LAB_COST_TABLE = [
  0, 50, 120, 250, 500, 900, 1_500, 2_400, 3_800, 6_000, 9_500, 15_000, 23_000, 35_000, 52_000,
  78_000, 115_000, 170_000, 250_000, 370_000, 550_000, 800_000, 1_200_000, 1_750_000, 2_500_000,
  3_600_000, 5_200_000, 7_500_000, 10_500_000, 15_000_000, 21_000_000, 30_000_000, 42_000_000,
  60_000_000, 85_000_000, 120_000_000, 170_000_000, 240_000_000, 350_000_000, 500_000_000,
];

/** Durée des travaux pour atteindre chaque niveau, en secondes. */
const LAB_TIME_TABLE = [
  0, 10, 30, 60, 180, 300, 600, 900, 1_800, 3_600, 5_400, 7_200, 10_800, 14_400, 21_600, 28_800,
  36_000, 43_200, 57_600, 72_000, 86_400, 100_800, 115_200, 129_600, 172_800, 194_400, 216_000,
  237_600, 259_200, 302_400, 345_600, 388_800, 432_000, 475_200, 518_400, 561_600, 604_800,
  691_200, 777_600, 864_000,
];

/** Niveau maximum du laboratoire, imposé par la table. */
export const LAB_MAX = LAB_COST_TABLE.length;

/** Chaque étoile de dissolution renchérit les travaux, et les allonge, de 10 %. */
export const STAR_TAX = 0.1;

/**
 * Coût des travaux pour passer de `labLevel` au suivant. Les matériaux servent à
 * fabriquer, pas à bâtir : seule l'essence est demandée.
 */
export const labUpgradeCost = (labLevel: number, stars = 0) => ({
  essence: Math.ceil(
    (LAB_COST_TABLE[Math.min(labLevel, LAB_MAX - 1)] ?? 0) * (1 + STAR_TAX * stars),
  ),
});

/** Durée des mêmes travaux, allongée de 10 % par étoile. */
export const labUpgradeDuration = (labLevel: number, stars = 0) =>
  Math.round((LAB_TIME_TABLE[Math.min(labLevel, LAB_MAX - 1)] ?? 0) * (1 + STAR_TAX * stars));

