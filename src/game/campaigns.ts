import type { ResourceId } from './resources';

/**
 * Campagnes : trois séries de combats dédiées, chacune payée dans **une seule**
 * monnaie. Elles répondent à un manque de la boucle principale — le combat de
 * chapitre donne un peu de tout, sans jamais permettre de viser ce qui manque.
 *
 * Une campagne est un vrai combat : ses propres ennemis, sa propre difficulté,
 * et rien à gagner avant la dernière vague. Abandonner en cours ne rend rien.
 */
export interface Campaign {
  id: string;
  name: string;
  blurb: string;
  /** Monnaie payée à l'issue de la dernière vague. */
  reward: ResourceId;
  /** Nombre de vagues à enchaîner. */
  waves: number;
  /**
   * Écart de difficulté par rapport au chapitre le plus profond atteint. Une
   * campagne à −1 se joue un cran en dessous de ce que le joueur encaisse
   * couramment, une campagne à +1 est un défi. La difficulté suit donc le joueur
   * au lieu d'être figée au début du jeu.
   */
  depthOffset: number;
  /** Montant de base, multiplié par le chapitre le plus profond atteint. */
  payout: number;
  /** Sprites des ennemis : deux archétypes, puis le gardien final. */
  sprites: [string, string, string];
  enemies: [string, string, string];
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'mine',
    name: 'La Mine Noyée',
    blurb: "On y descend pour l'essence, et pour rien d'autre.",
    reward: 'essence',
    waves: 5,
    depthOffset: -1,
    payout: 400,
    sprites: ['champignon', 'slime-vert', 'golem'],
    enemies: ['Porteur voûté', 'Coulée verte', 'Golem de fond'],
  },
  {
    id: 'forge',
    name: 'La Forge Éteinte',
    blurb: "Ce qui reste des ateliers donne de quoi fabriquer.",
    reward: 'reagent',
    waves: 7,
    depthOffset: 0,
    payout: 30,
    sprites: ['squelette', 'slime-gris', 'golem'],
    enemies: ['Apprenti calciné', 'Scorie vive', 'Maître de forge'],
  },
  {
    id: 'archives',
    name: 'Les Archives Basses',
    blurb: 'Le savoir ne se ramasse qu\'ici, et il se défend.',
    reward: 'insight',
    waves: 9,
    depthOffset: 1,
    payout: 12,
    sprites: ['chauve-souris', 'squelette', 'golem'],
    enemies: ['Liseur aveugle', 'Copiste sec', 'Gardien des Archives'],
  },
];

export const campaignDef = (id: string) => CAMPAIGNS.find((c) => c.id === id);

/** Nombre de clés offertes chaque jour. */
export const KEYS_PER_DAY = 3;

/** Profondeur réelle d'une campagne, indexée sur la progression du joueur. */
export const campaignDepth = (campaign: Campaign, deepest: number) =>
  Math.max(0, deepest + campaign.depthOffset);
