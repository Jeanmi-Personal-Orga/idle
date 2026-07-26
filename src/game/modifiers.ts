import { ascMods } from './ascension';
import { techMods, type TechMods } from './tech';
import type { GameState } from './types';

/** Tous les modificateurs du jeu : recherche (temporaire) + legs (permanents). */
export type Mods = TechMods;

/**
 * Point d'entrée unique pour les formules : les nœuds de recherche s'additionnent
 * dans leur registre, les legs de dissolution s'y multiplient par-dessus.
 */
export function mods(state: GameState): Mods {
  const tech = techMods(state);
  const asc = ascMods(state);
  return {
    ...tech,
    powerMult: tech.powerMult * asc.statMult,
    healthMult: tech.healthMult * asc.statMult,
    essenceMult: tech.essenceMult * asc.essenceMult,
    reagentMult: tech.reagentMult * asc.reagentMult,
    purityBias: tech.purityBias + asc.purityBias,
    insightMult: tech.insightMult * asc.insightMult,
  };
}
