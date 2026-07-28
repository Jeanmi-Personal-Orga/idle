/**
 * Prix en sacs d'or pour abréger une attente.
 *
 * Module feuille, volontairement : cette fonction était dans `formulas.ts`, que
 * l'arbre de recherche importait pour elle seule — ce qui fermait un cycle
 * formulas → modifiers → tech → formulas. Metro l'acceptait en avertissant, mais un
 * cycle de ce genre a déjà valu un écran blanc à ce projet : `LAB_MAX` valait
 * `undefined` au chargement. Les valeurs partagées vivent donc dans des modules qui
 * n'importent rien.
 */

/** Un sac d'or par tranche de 45 secondes, au moins un. */
export const skipCost = (secondsLeft: number) => Math.max(1, Math.ceil(secondsLeft / 45));
